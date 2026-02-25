/**
 * BLIK Service
 * Manages BLIK code lifecycle with Supabase storage
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { BlikCode, BlikCodeStatus } from '@e-y/shared';

// Internal representation with socketId for notifications
export interface InternalBlikCode extends BlikCode {
  id: string;
  receiverSocketId: string | null;
}

// Database row type
interface BlikCodeRow {
  id: string;
  code: string;
  receiver_address: string;
  receiver_username: string | null;
  receiver_socket_id: string | null;
  sender_address: string | null;
  amount: string;
  token_symbol: string;
  chain_id: number | null;
  status: BlikCodeStatus;
  expires_at: string;
  created_at: string;
}

// Constants
const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 seconds
const MAX_CODES_PER_ADDRESS = 5;

@Injectable()
export class BlikService implements OnModuleDestroy {
  private readonly logger = new Logger(BlikService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly supabase: SupabaseService) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.logger.log('BLIK service initialized with Supabase storage');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.logger.log('BLIK service destroyed');
  }

  /**
   * Generate a unique 6-digit code
   */
  private async generateCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if code exists in database
      const { data } = await this.supabase
        .from('blik_codes')
        .select('id')
        .eq('code', code)
        .eq('status', 'active')
        .single();

      if (!data) {
        return code;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Failed to generate unique code');
  }

  /**
   * Count active codes for an address
   */
  private async countCodesForAddress(address: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('blik_codes')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_address', address.toLowerCase())
      .eq('status', 'active');

    if (error) {
      this.logger.error('Failed to count codes', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Map database row to internal BLIK code
   */
  private mapToInternalCode(row: BlikCodeRow): InternalBlikCode {
    return {
      id: row.id,
      code: row.code,
      amount: row.amount,
      tokenSymbol: row.token_symbol,
      chainId: row.chain_id || 11155111,
      receiverAddress: row.receiver_address,
      receiverUsername: row.receiver_username || undefined,
      receiverSocketId: row.receiver_socket_id,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Create a new BLIK code
   */
  async createCode(
    receiverAddress: string,
    receiverUsername: string | undefined,
    amount: string,
    tokenSymbol: string,
    chainId: number,
    socketId: string,
  ): Promise<InternalBlikCode> {
    // Check rate limit
    const existingCodes = await this.countCodesForAddress(receiverAddress);
    if (existingCodes >= MAX_CODES_PER_ADDRESS) {
      throw new Error(`BLIK_RATE_LIMIT: Maximum ${MAX_CODES_PER_ADDRESS} active codes per address`);
    }

    const code = await this.generateCode();
    const now = Date.now();
    const expiresAt = new Date(now + CODE_TTL_MS).toISOString();

    const { data, error } = await this.supabase
      .from('blik_codes')
      .insert({
        code,
        receiver_address: receiverAddress.toLowerCase(),
        receiver_username: receiverUsername || null,
        receiver_socket_id: socketId,
        amount,
        token_symbol: tokenSymbol,
        chain_id: chainId,
        status: 'active',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error || !data) {
      this.logger.error('Failed to create BLIK code', error);
      throw new Error('Failed to create BLIK code');
    }

    this.logger.log(`Code created: ${code} for ${receiverAddress} - ${amount} ${tokenSymbol}`);
    return this.mapToInternalCode(data);
  }

  /**
   * Look up a code by its value
   */
  async lookupCode(code: string): Promise<InternalBlikCode | null> {
    const { data, error } = await this.supabase
      .from('blik_codes')
      .select('*')
      .eq('code', code)
      .in('status', ['active', 'pending'])
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToInternalCode(data);
  }

  /**
   * Mark a code as pending (sender is viewing)
   */
  async markPending(code: string): Promise<InternalBlikCode | null> {
    const { data, error } = await this.supabase
      .from('blik_codes')
      .update({ status: 'pending' })
      .eq('code', code)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToInternalCode(data);
  }

  /**
   * Confirm payment for a code
   */
  async confirmPayment(
    code: string,
    txHash: string,
    senderAddress: string,
    network: string,
  ): Promise<{ blikCode: InternalBlikCode; txHash: string; senderAddress: string; network: string } | null> {
    // First, get the code to verify it exists and is valid
    const { data: existingCode, error: fetchError } = await this.supabase
      .from('blik_codes')
      .select('*')
      .eq('code', code)
      .in('status', ['active', 'pending'])
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !existingCode) {
      this.logger.warn(`Confirm payment failed: code ${code} not found or expired`);
      return null;
    }

    // Update the code as completed
    const { data, error } = await this.supabase
      .from('blik_codes')
      .update({
        status: 'completed',
        sender_address: senderAddress.toLowerCase(),
        tx_hash: txHash,
        network,
      })
      .eq('id', existingCode.id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error('Failed to confirm payment', error);
      return null;
    }

    this.logger.log(`Payment confirmed: code ${code}, txHash ${txHash}, sender ${senderAddress}, network ${network}`);

    return {
      blikCode: this.mapToInternalCode(data),
      txHash,
      senderAddress,
      network,
    };
  }

  /**
   * Cancel a code (only by owner)
   */
  async cancelCode(code: string, receiverAddress: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('blik_codes')
      .delete()
      .eq('code', code)
      .eq('receiver_address', receiverAddress.toLowerCase())
      .in('status', ['active', 'pending'])
      .select()
      .single();

    if (error || !data) {
      this.logger.warn(`Cancel failed: code ${code} not found or ${receiverAddress} is not owner`);
      return false;
    }

    this.logger.log(`Code cancelled: ${code} by ${receiverAddress}`);
    return true;
  }

  /**
   * Update socket ID for a receiver (e.g., after reconnection)
   */
  async updateReceiverSocket(receiverAddress: string, newSocketId: string): Promise<void> {
    const { error } = await this.supabase
      .from('blik_codes')
      .update({ receiver_socket_id: newSocketId })
      .eq('receiver_address', receiverAddress.toLowerCase())
      .in('status', ['active', 'pending']);

    if (error) {
      this.logger.error('Failed to update receiver socket', error);
    }
  }

  /**
   * Get active code for a receiver (for reconnection)
   */
  async getActiveCodeForReceiver(receiverAddress: string): Promise<InternalBlikCode | null> {
    const { data, error } = await this.supabase
      .from('blik_codes')
      .select('*')
      .eq('receiver_address', receiverAddress.toLowerCase())
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToInternalCode(data);
  }

  /**
   * Cleanup expired codes
   * Returns list of expired codes for notification
   */
  async cleanup(): Promise<InternalBlikCode[]> {
    // Get expired codes before updating
    const { data: expiredCodes, error: fetchError } = await this.supabase
      .from('blik_codes')
      .select('*')
      .in('status', ['active', 'pending'])
      .lt('expires_at', new Date().toISOString());

    if (fetchError || !expiredCodes || expiredCodes.length === 0) {
      return [];
    }

    // Mark them as expired
    const expiredIds = expiredCodes.map((c) => c.id);
    const { error: updateError } = await this.supabase
      .from('blik_codes')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      this.logger.error('Failed to mark codes as expired', updateError);
      return [];
    }

    this.logger.log(`Cleaned up ${expiredCodes.length} expired codes`);
    return expiredCodes.map((row) => this.mapToInternalCode(row));
  }

  /**
   * Get code status (for debugging/monitoring)
   */
  async getStats(): Promise<{ totalCodes: number; activeCodes: number; pendingCodes: number }> {
    const { count: totalCount } = await this.supabase
      .from('blik_codes')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount } = await this.supabase
      .from('blik_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: pendingCount } = await this.supabase
      .from('blik_codes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      totalCodes: totalCount || 0,
      activeCodes: activeCount || 0,
      pendingCodes: pendingCount || 0,
    };
  }
}
