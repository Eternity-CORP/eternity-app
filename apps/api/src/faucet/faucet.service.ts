import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { SupabaseService } from '../supabase/supabase.service';
import type { FaucetClaim } from './entities';

// Database row type (snake_case)
interface FaucetClaimRow {
  id: string;
  wallet_address: string;
  amount: string;
  tx_hash: string | null;
  claimed_at: string;
}

@Injectable()
export class FaucetService implements OnModuleInit {
  private readonly logger = new Logger(FaucetService.name);
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private readonly DRIP_AMOUNT = ethers.parseEther('0.001');
  private readonly COOLDOWN_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit() {
    const privateKey = this.configService.get<string>('FAUCET_PRIVATE_KEY');
    if (!privateKey) {
      this.logger.warn('FAUCET_PRIVATE_KEY not set — faucet disabled');
      return;
    }

    const rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';

    this.provider = new ethers.JsonRpcProvider(rpcUrl, 'sepolia', { staticNetwork: true });
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.logger.log(`Faucet wallet: ${this.wallet.address}`);
  }

  /**
   * Map database row to FaucetClaim interface
   */
  private mapToFaucetClaim(row: FaucetClaimRow): FaucetClaim {
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      amount: row.amount,
      txHash: row.tx_hash,
      claimedAt: new Date(row.claimed_at),
    };
  }

  /**
   * Check if an address can claim (cooldown not elapsed)
   * Returns the last claim if cooldown is still active, null if can claim
   */
  private async getLastClaimInCooldown(address: string): Promise<FaucetClaim | null> {
    const cooldownThreshold = new Date(Date.now() - this.COOLDOWN_MS).toISOString();

    const { data, error } = await this.supabase
      .from('faucet_claims')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .gte('claimed_at', cooldownThreshold)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No recent claim found — address can claim
      return null;
    }

    return this.mapToFaucetClaim(data);
  }

  /**
   * Record a new faucet claim in the database
   */
  private async recordClaim(address: string, amount: string, txHash: string): Promise<FaucetClaim> {
    const { data, error } = await this.supabase
      .from('faucet_claims')
      .insert({
        wallet_address: address.toLowerCase(),
        amount,
        tx_hash: txHash,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error('Failed to record faucet claim', error);
      throw new Error('Failed to record faucet claim');
    }

    return this.mapToFaucetClaim(data);
  }

  async claim(address: string): Promise<{ txHash: string; amount: string }> {
    if (!this.wallet) {
      throw new HttpException('Faucet not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const normalized = address.toLowerCase();

    // Rate limit check — query database for last claim within cooldown
    const lastClaim = await this.getLastClaimInCooldown(normalized);
    if (lastClaim) {
      const claimedAtMs = lastClaim.claimedAt.getTime();
      const remainingMs = this.COOLDOWN_MS - (Date.now() - claimedAtMs);
      throw new HttpException(
        { message: 'Already claimed in last 24h', remainingMs },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check faucet balance (keep buffer for gas)
    const balance = await this.provider.getBalance(this.wallet.address);
    const minBalance = this.DRIP_AMOUNT + ethers.parseEther('0.0005');
    if (balance < minBalance) {
      throw new HttpException('Faucet empty', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Send transaction
    try {
      const tx = await this.wallet.sendTransaction({
        to: address,
        value: this.DRIP_AMOUNT,
      });

      // Record claim in database
      await this.recordClaim(normalized, '0.001', tx.hash);
      this.logger.log(`Sent 0.001 ETH to ${address} — tx: ${tx.hash}`);

      return { txHash: tx.hash, amount: '0.001' };
    } catch (error) {
      this.logger.error(`Failed to send faucet tx: ${error}`);
      throw new HttpException('Transaction failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getStatus(): Promise<{ balance: string; enabled: boolean; dripAmount: string }> {
    if (!this.wallet) {
      return { balance: '0', enabled: false, dripAmount: '0.001' };
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    const minBalance = this.DRIP_AMOUNT + ethers.parseEther('0.0005');

    return {
      balance: ethers.formatEther(balance),
      enabled: balance >= minBalance,
      dripAmount: '0.001',
    };
  }
}
