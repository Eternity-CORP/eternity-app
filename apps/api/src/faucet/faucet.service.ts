import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class FaucetService implements OnModuleInit {
  private readonly logger = new Logger(FaucetService.name);
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private readonly claims = new Map<string, number>();
  private readonly DRIP_AMOUNT = ethers.parseEther('0.001');
  private readonly COOLDOWN_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {}

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

  async claim(address: string): Promise<{ txHash: string; amount: string }> {
    if (!this.wallet) {
      throw new HttpException('Faucet not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const normalized = address.toLowerCase();

    // Rate limit check
    const lastClaim = this.claims.get(normalized);
    if (lastClaim && Date.now() - lastClaim < this.COOLDOWN_MS) {
      const remainingMs = this.COOLDOWN_MS - (Date.now() - lastClaim);
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

      this.claims.set(normalized, Date.now());
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
