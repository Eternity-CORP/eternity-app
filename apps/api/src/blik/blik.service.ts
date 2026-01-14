/**
 * BLIK Service
 * Manages BLIK code lifecycle with in-memory storage
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { BlikCode, BlikCodeStatus } from '@e-y/shared';

// Internal representation with socketId for notifications
interface InternalBlikCode extends BlikCode {
  receiverSocketId: string;
}

// Constants
const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 seconds
const MAX_CODES_PER_ADDRESS = 5;

@Injectable()
export class BlikService implements OnModuleDestroy {
  private readonly logger = new Logger(BlikService.name);
  private codes: Map<string, InternalBlikCode> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.logger.log('BLIK service initialized with cleanup interval');
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
  private generateCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    } while (this.codes.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique code');
    }

    return code;
  }

  /**
   * Count active codes for an address
   */
  private countCodesForAddress(address: string): number {
    let count = 0;
    for (const code of this.codes.values()) {
      if (code.receiverAddress.toLowerCase() === address.toLowerCase() && code.status === 'active') {
        count++;
      }
    }
    return count;
  }

  /**
   * Create a new BLIK code
   */
  createCode(
    receiverAddress: string,
    receiverUsername: string | undefined,
    amount: string,
    tokenSymbol: string,
    socketId: string,
  ): InternalBlikCode {
    // Check rate limit
    const existingCodes = this.countCodesForAddress(receiverAddress);
    if (existingCodes >= MAX_CODES_PER_ADDRESS) {
      throw new Error(`BLIK_RATE_LIMIT: Maximum ${MAX_CODES_PER_ADDRESS} active codes per address`);
    }

    const code = this.generateCode();
    const now = Date.now();

    const blikCode: InternalBlikCode = {
      code,
      amount,
      tokenSymbol,
      receiverAddress,
      receiverUsername,
      receiverSocketId: socketId,
      status: 'active',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
    };

    this.codes.set(code, blikCode);
    this.logger.log(`Code created: ${code} for ${receiverAddress} - ${amount} ${tokenSymbol}`);

    return blikCode;
  }

  /**
   * Look up a code by its value
   */
  lookupCode(code: string): InternalBlikCode | null {
    const blikCode = this.codes.get(code);

    if (!blikCode) {
      return null;
    }

    // Check if expired
    if (new Date(blikCode.expiresAt).getTime() < Date.now()) {
      blikCode.status = 'expired';
      return null;
    }

    // Check if already completed
    if (blikCode.status === 'completed') {
      return null;
    }

    return blikCode;
  }

  /**
   * Mark a code as pending (sender is viewing)
   */
  markPending(code: string): InternalBlikCode | null {
    const blikCode = this.codes.get(code);

    if (!blikCode || blikCode.status !== 'active') {
      return null;
    }

    blikCode.status = 'pending';
    return blikCode;
  }

  /**
   * Confirm payment for a code
   */
  confirmPayment(
    code: string,
    txHash: string,
    senderAddress: string,
    network: string,
  ): { blikCode: InternalBlikCode; txHash: string; senderAddress: string; network: string } | null {
    const blikCode = this.codes.get(code);

    if (!blikCode) {
      this.logger.warn(`Confirm payment failed: code ${code} not found`);
      return null;
    }

    if (blikCode.status === 'completed') {
      this.logger.warn(`Confirm payment failed: code ${code} already completed`);
      return null;
    }

    if (blikCode.status === 'expired' || new Date(blikCode.expiresAt).getTime() < Date.now()) {
      this.logger.warn(`Confirm payment failed: code ${code} expired`);
      return null;
    }

    // Mark as completed
    blikCode.status = 'completed';

    this.logger.log(`Payment confirmed: code ${code}, txHash ${txHash}, sender ${senderAddress}, network ${network}`);

    return {
      blikCode,
      txHash,
      senderAddress,
      network,
    };
  }

  /**
   * Cancel a code (only by owner)
   */
  cancelCode(code: string, receiverAddress: string): boolean {
    const blikCode = this.codes.get(code);

    if (!blikCode) {
      return false;
    }

    // Verify ownership
    if (blikCode.receiverAddress.toLowerCase() !== receiverAddress.toLowerCase()) {
      this.logger.warn(`Cancel failed: ${receiverAddress} is not owner of code ${code}`);
      return false;
    }

    // Only cancel if active or pending
    if (blikCode.status !== 'active' && blikCode.status !== 'pending') {
      return false;
    }

    this.codes.delete(code);
    this.logger.log(`Code cancelled: ${code} by ${receiverAddress}`);
    return true;
  }

  /**
   * Update socket ID for a receiver (e.g., after reconnection)
   */
  updateReceiverSocket(receiverAddress: string, newSocketId: string): void {
    for (const blikCode of this.codes.values()) {
      if (
        blikCode.receiverAddress.toLowerCase() === receiverAddress.toLowerCase() &&
        (blikCode.status === 'active' || blikCode.status === 'pending')
      ) {
        blikCode.receiverSocketId = newSocketId;
      }
    }
  }

  /**
   * Get active code for a receiver (for reconnection)
   */
  getActiveCodeForReceiver(receiverAddress: string): InternalBlikCode | null {
    for (const blikCode of this.codes.values()) {
      if (
        blikCode.receiverAddress.toLowerCase() === receiverAddress.toLowerCase() &&
        blikCode.status === 'active' &&
        new Date(blikCode.expiresAt).getTime() > Date.now()
      ) {
        return blikCode;
      }
    }
    return null;
  }

  /**
   * Cleanup expired codes
   * Returns list of expired codes for notification
   */
  cleanup(): InternalBlikCode[] {
    const now = Date.now();
    const expiredCodes: InternalBlikCode[] = [];

    for (const [code, blikCode] of this.codes.entries()) {
      if (new Date(blikCode.expiresAt).getTime() < now) {
        if (blikCode.status === 'active' || blikCode.status === 'pending') {
          blikCode.status = 'expired';
          expiredCodes.push(blikCode);
        }
        this.codes.delete(code);
      }
    }

    if (expiredCodes.length > 0) {
      this.logger.log(`Cleaned up ${expiredCodes.length} expired codes`);
    }

    return expiredCodes;
  }

  /**
   * Get code status (for debugging/monitoring)
   */
  getStats(): { totalCodes: number; activeCodes: number; pendingCodes: number } {
    let active = 0;
    let pending = 0;

    for (const code of this.codes.values()) {
      if (code.status === 'active') active++;
      if (code.status === 'pending') pending++;
    }

    return {
      totalCodes: this.codes.size,
      activeCodes: active,
      pendingCodes: pending,
    };
  }
}
