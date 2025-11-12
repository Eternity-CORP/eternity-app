/**
 * Feature Flags Configuration
 * 
 * Controls feature availability on different networks.
 * Used for safe mainnet rollout with kill-switch capability.
 */

// ============================================================================
// Feature Flag Types
// ============================================================================

export interface FeatureFlags {
  // Scheduled Payments
  scheduleTestnetEnabled: boolean;
  scheduleMainnetEnabled: boolean;
  
  // Split Bills
  splitTestnetEnabled: boolean;
  splitMainnetEnabled: boolean;
  
  // Advanced Features
  recurringPaymentsEnabled: boolean;
  batchTransactionsEnabled: boolean;
}

export type NetworkType = 'mainnet' | 'testnet' | 'local';

// ============================================================================
// Default Feature Flags
// ============================================================================

const DEFAULT_FLAGS: FeatureFlags = {
  // Scheduled Payments - DISABLED on mainnet by default
  scheduleTestnetEnabled: true,
  scheduleMainnetEnabled: false, // 🔴 KILL SWITCH
  
  // Split Bills - DISABLED on mainnet by default
  splitTestnetEnabled: true,
  splitMainnetEnabled: false, // 🔴 KILL SWITCH
  
  // Advanced Features
  recurringPaymentsEnabled: true,
  batchTransactionsEnabled: true,
};

// ============================================================================
// Environment Variable Overrides
// ============================================================================

/**
 * Load feature flags from environment variables
 * Allows runtime configuration without code changes
 */
function loadFlagsFromEnv(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};
  
  // Scheduled Payments
  if (process.env.SCHEDULE_TESTNET_ENABLED !== undefined) {
    flags.scheduleTestnetEnabled = process.env.SCHEDULE_TESTNET_ENABLED === 'true';
  }
  
  if (process.env.SCHEDULE_MAINNET_ENABLED !== undefined) {
    flags.scheduleMainnetEnabled = process.env.SCHEDULE_MAINNET_ENABLED === 'true';
  }
  
  // Split Bills
  if (process.env.SPLIT_TESTNET_ENABLED !== undefined) {
    flags.splitTestnetEnabled = process.env.SPLIT_TESTNET_ENABLED === 'true';
  }
  
  if (process.env.SPLIT_MAINNET_ENABLED !== undefined) {
    flags.splitMainnetEnabled = process.env.SPLIT_MAINNET_ENABLED === 'true';
  }
  
  // Advanced Features
  if (process.env.RECURRING_PAYMENTS_ENABLED !== undefined) {
    flags.recurringPaymentsEnabled = process.env.RECURRING_PAYMENTS_ENABLED === 'true';
  }
  
  if (process.env.BATCH_TRANSACTIONS_ENABLED !== undefined) {
    flags.batchTransactionsEnabled = process.env.BATCH_TRANSACTIONS_ENABLED === 'true';
  }
  
  return flags;
}

// ============================================================================
// Feature Flag Manager
// ============================================================================

class FeatureFlagManager {
  private flags: FeatureFlags;
  
  constructor() {
    // Merge default flags with environment overrides
    this.flags = {
      ...DEFAULT_FLAGS,
      ...loadFlagsFromEnv(),
    };
    
    // Log flag status in development
    if (__DEV__) {
      console.log('🚩 Feature Flags:', this.flags);
    }
  }
  
  /**
   * Get all feature flags
   */
  getAll(): FeatureFlags {
    return { ...this.flags };
  }
  
  /**
   * Check if scheduled payments are enabled for network
   */
  isScheduleEnabled(network: NetworkType): boolean {
    if (network === 'mainnet') {
      return this.flags.scheduleMainnetEnabled;
    }
    return this.flags.scheduleTestnetEnabled;
  }
  
  /**
   * Check if split bills are enabled for network
   */
  isSplitEnabled(network: NetworkType): boolean {
    if (network === 'mainnet') {
      return this.flags.splitMainnetEnabled;
    }
    return this.flags.splitTestnetEnabled;
  }
  
  /**
   * Check if recurring payments are enabled
   */
  isRecurringEnabled(): boolean {
    return this.flags.recurringPaymentsEnabled;
  }
  
  /**
   * Check if batch transactions are enabled
   */
  isBatchEnabled(): boolean {
    return this.flags.batchTransactionsEnabled;
  }
  
  /**
   * Update feature flag (for testing/admin)
   */
  setFlag(key: keyof FeatureFlags, value: boolean): void {
    this.flags[key] = value;
    
    if (__DEV__) {
      console.log(`🚩 Flag updated: ${key} = ${value}`);
    }
  }
  
  /**
   * Reset to default flags
   */
  reset(): void {
    this.flags = { ...DEFAULT_FLAGS };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const featureFlags = new FeatureFlagManager();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get network type from chain ID
 */
export function getNetworkType(chainId: number): NetworkType {
  // Mainnet chain IDs
  if (chainId === 1) return 'mainnet'; // Ethereum
  if (chainId === 137) return 'mainnet'; // Polygon
  if (chainId === 56) return 'mainnet'; // BSC
  if (chainId === 42161) return 'mainnet'; // Arbitrum
  if (chainId === 10) return 'mainnet'; // Optimism
  
  // Testnet chain IDs
  if (chainId === 11155111) return 'testnet'; // Sepolia
  if (chainId === 80001) return 'testnet'; // Mumbai
  if (chainId === 97) return 'testnet'; // BSC Testnet
  if (chainId === 421614) return 'testnet'; // Arbitrum Sepolia
  if (chainId === 11155420) return 'testnet'; // Optimism Sepolia
  
  // Local/development
  if (chainId === 31337) return 'local'; // Hardhat
  if (chainId === 1337) return 'local'; // Ganache
  
  // Default to testnet for unknown chains (safer)
  return 'testnet';
}

/**
 * Check if scheduled payments are allowed
 */
export function canUseScheduledPayments(chainId: number): boolean {
  const network = getNetworkType(chainId);
  return featureFlags.isScheduleEnabled(network);
}

/**
 * Check if split bills are allowed
 */
export function canUseSplitBills(chainId: number): boolean {
  const network = getNetworkType(chainId);
  return featureFlags.isSplitEnabled(network);
}

/**
 * Get disabled reason for scheduled payments
 */
export function getScheduleDisabledReason(chainId: number): string | null {
  const network = getNetworkType(chainId);
  
  if (network === 'mainnet' && !featureFlags.isScheduleEnabled(network)) {
    return 'Scheduled payments are not yet available on mainnet. Please use testnet for now.';
  }
  
  if (!featureFlags.isScheduleEnabled(network)) {
    return 'Scheduled payments are currently disabled.';
  }
  
  return null;
}

/**
 * Get disabled reason for split bills
 */
export function getSplitDisabledReason(chainId: number): string | null {
  const network = getNetworkType(chainId);
  
  if (network === 'mainnet' && !featureFlags.isSplitEnabled(network)) {
    return 'Split bills are not yet available on mainnet. Please use testnet for now.';
  }
  
  if (!featureFlags.isSplitEnabled(network)) {
    return 'Split bills are currently disabled.';
  }
  
  return null;
}

// ============================================================================
// Feature Flag Guards
// ============================================================================

/**
 * Throw error if feature is disabled
 */
export function assertScheduleEnabled(chainId: number): void {
  const reason = getScheduleDisabledReason(chainId);
  if (reason) {
    throw new Error(`Scheduled payments disabled: ${reason}`);
  }
}

/**
 * Throw error if feature is disabled
 */
export function assertSplitEnabled(chainId: number): void {
  const reason = getSplitDisabledReason(chainId);
  if (reason) {
    throw new Error(`Split bills disabled: ${reason}`);
  }
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log feature flag check
 */
export function logFeatureCheck(
  feature: 'schedule' | 'split',
  chainId: number,
  allowed: boolean
): void {
  const network = getNetworkType(chainId);
  
  if (__DEV__) {
    console.log(
      `🚩 Feature Check: ${feature} on ${network} (chain ${chainId}): ${allowed ? '✅ ALLOWED' : '🔴 BLOCKED'}`
    );
  }
}

// ============================================================================
// Export for Testing
// ============================================================================

export const __testing__ = {
  DEFAULT_FLAGS,
  loadFlagsFromEnv,
  FeatureFlagManager,
};
