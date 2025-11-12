/**
 * Mainnet Safety Guard
 * 
 * Prevents accidental mainnet transactions
 * Requires explicit enablement and confirmation
 */

import { ethers } from 'ethers';
import type { Network } from '../config/env';

// ============================================================================
// Configuration
// ============================================================================

const MAINNET_ENABLED = process.env.EXPO_PUBLIC_MAINNET_ENABLED === 'true';
const MAINNET_MAX_AMOUNT = parseFloat(process.env.EXPO_PUBLIC_MAINNET_MAX_AMOUNT || '0.1');
const MAINNET_REQUIRE_CONFIRMATION = process.env.EXPO_PUBLIC_MAINNET_REQUIRE_CONFIRMATION !== 'false';

// ============================================================================
// Errors
// ============================================================================

export class MainnetDisabledError extends Error {
  constructor() {
    super(
      'Mainnet transactions are disabled. ' +
      'Enable EXPO_PUBLIC_MAINNET_ENABLED=true in .env after completing prod-checklist.md'
    );
    this.name = 'MainnetDisabledError';
  }
}

export class MainnetAmountExceededError extends Error {
  constructor(amount: string, maxAmount: number) {
    super(
      `Amount ${amount} ETH exceeds mainnet limit of ${maxAmount} ETH. ` +
      'Increase EXPO_PUBLIC_MAINNET_MAX_AMOUNT in .env if needed.'
    );
    this.name = 'MainnetAmountExceededError';
  }
}

export class MainnetConfirmationRequiredError extends Error {
  constructor() {
    super('Mainnet transaction requires user confirmation');
    this.name = 'MainnetConfirmationRequiredError';
  }
}

// ============================================================================
// Guards
// ============================================================================

/**
 * Check if network is mainnet
 */
export function isMainnet(network: Network): boolean {
  return network === 'mainnet';
}

/**
 * Check if mainnet is enabled
 */
export function isMainnetEnabled(): boolean {
  return MAINNET_ENABLED;
}

/**
 * Get mainnet max amount
 */
export function getMainnetMaxAmount(): number {
  return MAINNET_MAX_AMOUNT;
}

/**
 * Check if mainnet requires confirmation
 */
export function mainnetRequiresConfirmation(): boolean {
  return MAINNET_REQUIRE_CONFIRMATION;
}

/**
 * Validate mainnet transaction
 * 
 * Throws error if:
 * - Mainnet is disabled
 * - Amount exceeds limit
 * 
 * @param network - Network to send on
 * @param amountEth - Amount in ETH
 * @param confirmed - User has confirmed (for UI)
 */
export function validateMainnetTransaction(
  network: Network,
  amountEth: string,
  confirmed: boolean = false
): void {
  // Only check mainnet
  if (!isMainnet(network)) {
    return;
  }

  console.log('🔒 Mainnet Guard: Validating transaction...');
  console.log(`   Network: ${network}`);
  console.log(`   Amount: ${amountEth} ETH`);
  console.log(`   Enabled: ${MAINNET_ENABLED}`);
  console.log(`   Max Amount: ${MAINNET_MAX_AMOUNT} ETH`);
  console.log(`   Requires Confirmation: ${MAINNET_REQUIRE_CONFIRMATION}`);
  console.log(`   User Confirmed: ${confirmed}`);

  // Check if mainnet is enabled
  if (!MAINNET_ENABLED) {
    console.log('❌ Mainnet Guard: Mainnet disabled');
    throw new MainnetDisabledError();
  }

  // Check amount limit
  const amount = parseFloat(amountEth);
  if (amount > MAINNET_MAX_AMOUNT) {
    console.log(`❌ Mainnet Guard: Amount ${amount} exceeds limit ${MAINNET_MAX_AMOUNT}`);
    throw new MainnetAmountExceededError(amountEth, MAINNET_MAX_AMOUNT);
  }

  // Check confirmation (for UI)
  if (MAINNET_REQUIRE_CONFIRMATION && !confirmed) {
    console.log('❌ Mainnet Guard: Confirmation required');
    throw new MainnetConfirmationRequiredError();
  }

  console.log('✅ Mainnet Guard: Transaction validated');
}

/**
 * Get mainnet warning message
 */
export function getMainnetWarning(amountEth: string): string {
  return (
    `⚠️ MAINNET TRANSACTION\n\n` +
    `You are about to send ${amountEth} ETH on MAINNET.\n\n` +
    `This will use REAL ETH and cannot be undone.\n\n` +
    `Please verify:\n` +
    `• Recipient address is correct\n` +
    `• Amount is correct\n` +
    `• You have enough ETH for gas fees\n\n` +
    `Are you sure you want to continue?`
  );
}

/**
 * Get mainnet status for UI
 */
export function getMainnetStatus(): {
  enabled: boolean;
  maxAmount: number;
  requiresConfirmation: boolean;
  warning: string;
} {
  return {
    enabled: MAINNET_ENABLED,
    maxAmount: MAINNET_MAX_AMOUNT,
    requiresConfirmation: MAINNET_REQUIRE_CONFIRMATION,
    warning: MAINNET_ENABLED
      ? `Mainnet enabled (max ${MAINNET_MAX_AMOUNT} ETH per transaction)`
      : 'Mainnet disabled - Enable in .env after completing prod-checklist.md',
  };
}

/**
 * Format amount with mainnet limit check
 */
export function formatAmountWithLimit(amountEth: string, network: Network): {
  amount: string;
  exceedsLimit: boolean;
  limit: number;
} {
  const amount = parseFloat(amountEth);
  const exceedsLimit = isMainnet(network) && amount > MAINNET_MAX_AMOUNT;

  return {
    amount: amountEth,
    exceedsLimit,
    limit: MAINNET_MAX_AMOUNT,
  };
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log mainnet transaction attempt
 */
export function logMainnetAttempt(
  network: Network,
  amountEth: string,
  to: string,
  success: boolean,
  error?: Error
): void {
  if (!isMainnet(network)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    network,
    amount: amountEth,
    to: to.slice(0, 10) + '...', // Partial address for privacy
    success,
    error: error?.message,
  };

  console.log('📝 Mainnet Transaction Log:', JSON.stringify(log, null, 2));

  // In production, you might want to send this to analytics
  // analytics.logMainnetTransaction(log);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if amount is safe for mainnet
 */
export function isSafeMainnetAmount(amountEth: string, network: Network): boolean {
  if (!isMainnet(network)) {
    return true;
  }

  const amount = parseFloat(amountEth);
  return amount <= MAINNET_MAX_AMOUNT;
}

/**
 * Get recommended mainnet amount
 */
export function getRecommendedMainnetAmount(): string {
  // Recommend 10% of max for smoke tests
  return (MAINNET_MAX_AMOUNT * 0.1).toFixed(4);
}

/**
 * Validate mainnet configuration
 */
export function validateMainnetConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if mainnet is enabled
  if (MAINNET_ENABLED) {
    warnings.push('Mainnet is ENABLED - ensure prod-checklist.md is completed');

    // Check max amount
    if (MAINNET_MAX_AMOUNT <= 0) {
      errors.push('MAINNET_MAX_AMOUNT must be greater than 0');
    }

    if (MAINNET_MAX_AMOUNT > 1) {
      warnings.push(`MAINNET_MAX_AMOUNT is ${MAINNET_MAX_AMOUNT} ETH - consider lowering for safety`);
    }

    // Check confirmation requirement
    if (!MAINNET_REQUIRE_CONFIRMATION) {
      warnings.push('MAINNET_REQUIRE_CONFIRMATION is disabled - consider enabling for safety');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
