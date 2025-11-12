/**
 * Fee Caps & Safety Limits
 * 
 * Prevents silent high-fee transactions with:
 * - Global fee caps
 * - Per-transaction warnings
 * - User approval required
 * - Localized messages
 * - No private data in logs
 */

import { BigNumber, ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Network } from '../../config/env';

// ============================================================================
// Types
// ============================================================================

export interface FeeCapSettings {
  enabled: boolean;
  maxFeePerTxETH: string;          // Max fee per transaction (ETH)
  maxFeePerTxUSD?: string;         // Max fee per transaction (USD)
  warnThresholdETH: string;        // Warning threshold (ETH)
  warnThresholdUSD?: string;       // Warning threshold (USD)
  requireApprovalAtRun: boolean;   // Require biometric/pin before execution
  network: Network;
}

export interface FeeCapCheck {
  allowed: boolean;
  reason?: 'cap_exceeded' | 'warning_threshold' | 'approved';
  feeETH: string;
  feeUSD?: string;
  capETH: string;
  capUSD?: string;
  exceedsBy?: string;              // Amount over cap (ETH)
  exceedsByUSD?: string;           // Amount over cap (USD)
  requiresApproval: boolean;
}

export interface FeeWarning {
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  feeETH: string;
  feeUSD?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = '@fee_caps_settings';

const DEFAULT_SETTINGS: FeeCapSettings = {
  enabled: true,
  maxFeePerTxETH: '0.01',          // 0.01 ETH max per tx
  maxFeePerTxUSD: '50',            // $50 max per tx
  warnThresholdETH: '0.005',       // Warn at 0.005 ETH
  warnThresholdUSD: '25',          // Warn at $25
  requireApprovalAtRun: false,     // Don't require approval by default
  network: 'sepolia',
};

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Load fee cap settings
 */
export async function loadFeeCapSettings(): Promise<FeeCapSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Failed to load fee cap settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save fee cap settings
 */
export async function saveFeeCapSettings(
  settings: Partial<FeeCapSettings>
): Promise<void> {
  try {
    const current = await loadFeeCapSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('✅ Fee cap settings saved');
  } catch (error) {
    console.error('Failed to save fee cap settings:', error);
    throw error;
  }
}

/**
 * Reset to defaults
 */
export async function resetFeeCapSettings(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log('✅ Fee cap settings reset to defaults');
}

// ============================================================================
// Fee Cap Checking
// ============================================================================

/**
 * Check if fee is within cap
 */
export async function checkFeeCap(
  feeWei: BigNumber,
  ethPriceUSD?: number
): Promise<FeeCapCheck> {
  const settings = await loadFeeCapSettings();
  
  if (!settings.enabled) {
    return {
      allowed: true,
      reason: 'approved',
      feeETH: ethers.utils.formatEther(feeWei),
      capETH: settings.maxFeePerTxETH,
      requiresApproval: settings.requireApprovalAtRun,
    };
  }
  
  const feeETH = ethers.utils.formatEther(feeWei);
  const feeUSD = ethPriceUSD
    ? (parseFloat(feeETH) * ethPriceUSD).toFixed(2)
    : undefined;
  
  const capWei = ethers.utils.parseEther(settings.maxFeePerTxETH);
  const capETH = settings.maxFeePerTxETH;
  const capUSD = settings.maxFeePerTxUSD;
  
  // Check if exceeds cap
  if (feeWei.gt(capWei)) {
    const exceedsBy = ethers.utils.formatEther(feeWei.sub(capWei));
    const exceedsByUSD = ethPriceUSD && feeUSD && capUSD
      ? (parseFloat(feeUSD) - parseFloat(capUSD)).toFixed(2)
      : undefined;
    
    console.log('⛔ Fee exceeds cap:');
    console.log(`  Fee: ${feeETH} ETH${feeUSD ? ` ($${feeUSD})` : ''}`);
    console.log(`  Cap: ${capETH} ETH${capUSD ? ` ($${capUSD})` : ''}`);
    console.log(`  Exceeds by: ${exceedsBy} ETH`);
    
    return {
      allowed: false,
      reason: 'cap_exceeded',
      feeETH,
      feeUSD,
      capETH,
      capUSD,
      exceedsBy,
      exceedsByUSD,
      requiresApproval: true,
    };
  }
  
  // Check if exceeds warning threshold
  const warnWei = ethers.utils.parseEther(settings.warnThresholdETH);
  if (feeWei.gt(warnWei)) {
    console.log('⚠️  Fee exceeds warning threshold:');
    console.log(`  Fee: ${feeETH} ETH${feeUSD ? ` ($${feeUSD})` : ''}`);
    console.log(`  Threshold: ${settings.warnThresholdETH} ETH`);
    
    return {
      allowed: true,
      reason: 'warning_threshold',
      feeETH,
      feeUSD,
      capETH,
      capUSD,
      requiresApproval: settings.requireApprovalAtRun,
    };
  }
  
  // Within limits
  return {
    allowed: true,
    reason: 'approved',
    feeETH,
    feeUSD,
    capETH,
    capUSD,
    requiresApproval: settings.requireApprovalAtRun,
  };
}

/**
 * Generate fee warning message
 */
export function generateFeeWarning(
  check: FeeCapCheck,
  locale: string = 'en'
): FeeWarning {
  const t = getTranslations(locale);
  
  if (!check.allowed && check.reason === 'cap_exceeded') {
    return {
      level: 'error',
      title: t.capExceeded.title,
      message: t.capExceeded.message
        .replace('{fee}', `${check.feeETH} ETH`)
        .replace('{cap}', `${check.capETH} ETH`)
        .replace('{exceeds}', check.exceedsBy || '0'),
      feeETH: check.feeETH,
      feeUSD: check.feeUSD,
    };
  }
  
  if (check.reason === 'warning_threshold') {
    return {
      level: 'warning',
      title: t.highFee.title,
      message: t.highFee.message
        .replace('{fee}', `${check.feeETH} ETH`),
      feeETH: check.feeETH,
      feeUSD: check.feeUSD,
    };
  }
  
  return {
    level: 'info',
    title: t.normalFee.title,
    message: t.normalFee.message
      .replace('{fee}', `${check.feeETH} ETH`),
    feeETH: check.feeETH,
    feeUSD: check.feeUSD,
  };
}

// ============================================================================
// Batch Fee Checking (for Split Bills)
// ============================================================================

export interface BatchFeeCheck {
  totalFeeWei: BigNumber;
  totalFeeETH: string;
  totalFeeUSD?: string;
  perTxFeeWei: BigNumber;
  perTxFeeETH: string;
  perTxFeeUSD?: string;
  txCount: number;
  allowed: boolean;
  reason?: string;
  exceedsBy?: string;
}

/**
 * Check fee cap for batch of transactions (e.g., split bill)
 */
export async function checkBatchFeeCap(
  perTxFeeWei: BigNumber,
  txCount: number,
  ethPriceUSD?: number
): Promise<BatchFeeCheck> {
  const totalFeeWei = perTxFeeWei.mul(txCount);
  const totalFeeETH = ethers.utils.formatEther(totalFeeWei);
  const totalFeeUSD = ethPriceUSD
    ? (parseFloat(totalFeeETH) * ethPriceUSD).toFixed(2)
    : undefined;
  
  const perTxFeeETH = ethers.utils.formatEther(perTxFeeWei);
  const perTxFeeUSD = ethPriceUSD
    ? (parseFloat(perTxFeeETH) * ethPriceUSD).toFixed(2)
    : undefined;
  
  // Check per-transaction fee
  const check = await checkFeeCap(perTxFeeWei, ethPriceUSD);
  
  if (!check.allowed) {
    return {
      totalFeeWei,
      totalFeeETH,
      totalFeeUSD,
      perTxFeeWei,
      perTxFeeETH,
      perTxFeeUSD,
      txCount,
      allowed: false,
      reason: check.reason,
      exceedsBy: check.exceedsBy,
    };
  }
  
  // Check total fee (optional additional check)
  const settings = await loadFeeCapSettings();
  const maxTotalWei = ethers.utils.parseEther(settings.maxFeePerTxETH).mul(txCount);
  
  if (totalFeeWei.gt(maxTotalWei)) {
    const exceedsBy = ethers.utils.formatEther(totalFeeWei.sub(maxTotalWei));
    
    console.log('⚠️  Batch total fee is high:');
    console.log(`  Total: ${totalFeeETH} ETH (${txCount} txs)`);
    console.log(`  Per TX: ${perTxFeeETH} ETH`);
    
    return {
      totalFeeWei,
      totalFeeETH,
      totalFeeUSD,
      perTxFeeWei,
      perTxFeeETH,
      perTxFeeUSD,
      txCount,
      allowed: true, // Allow but warn
      reason: 'high_batch_total',
      exceedsBy,
    };
  }
  
  return {
    totalFeeWei,
    totalFeeETH,
    totalFeeUSD,
    perTxFeeWei,
    perTxFeeETH,
    perTxFeeUSD,
    txCount,
    allowed: true,
  };
}

// ============================================================================
// Localization
// ============================================================================

interface Translations {
  capExceeded: {
    title: string;
    message: string;
  };
  highFee: {
    title: string;
    message: string;
  };
  normalFee: {
    title: string;
    message: string;
  };
  batchWarning: {
    title: string;
    message: string;
  };
}

function getTranslations(locale: string): Translations {
  const translations: Record<string, Translations> = {
    en: {
      capExceeded: {
        title: 'Fee Cap Exceeded',
        message: 'Transaction fee ({fee}) exceeds your cap ({cap}) by {exceeds} ETH. Please adjust fee cap in settings or wait for lower gas prices.',
      },
      highFee: {
        title: 'High Transaction Fee',
        message: 'Transaction fee ({fee}) is higher than usual. Consider waiting for lower gas prices.',
      },
      normalFee: {
        title: 'Normal Fee',
        message: 'Transaction fee: {fee}',
      },
      batchWarning: {
        title: 'High Batch Fee',
        message: 'Total fee for {count} transactions: {total}. Per transaction: {perTx}.',
      },
    },
    ru: {
      capExceeded: {
        title: 'Превышен лимит комиссии',
        message: 'Комиссия транзакции ({fee}) превышает ваш лимит ({cap}) на {exceeds} ETH. Измените лимит в настройках или дождитесь снижения цены газа.',
      },
      highFee: {
        title: 'Высокая комиссия',
        message: 'Комиссия транзакции ({fee}) выше обычной. Рекомендуем дождаться снижения цены газа.',
      },
      normalFee: {
        title: 'Нормальная комиссия',
        message: 'Комиссия транзакции: {fee}',
      },
      batchWarning: {
        title: 'Высокая общая комиссия',
        message: 'Общая комиссия за {count} транзакций: {total}. За одну: {perTx}.',
      },
    },
  };
  
  return translations[locale] || translations.en;
}

// ============================================================================
// Logging (No Private Data)
// ============================================================================

/**
 * Log fee check (sanitized)
 */
export function logFeeCheck(check: FeeCapCheck): void {
  console.log('\n💰 Fee Cap Check:');
  console.log(`  Allowed: ${check.allowed ? '✅' : '⛔'}`);
  console.log(`  Reason: ${check.reason || 'N/A'}`);
  console.log(`  Fee: ${check.feeETH} ETH${check.feeUSD ? ` ($${check.feeUSD})` : ''}`);
  console.log(`  Cap: ${check.capETH} ETH${check.capUSD ? ` ($${check.capUSD})` : ''}`);
  
  if (check.exceedsBy) {
    console.log(`  Exceeds by: ${check.exceedsBy} ETH`);
  }
  
  if (check.requiresApproval) {
    console.log(`  ⚠️  Requires user approval`);
  }
}

/**
 * Log batch fee check (sanitized)
 */
export function logBatchFeeCheck(check: BatchFeeCheck): void {
  console.log('\n💰 Batch Fee Cap Check:');
  console.log(`  TX Count: ${check.txCount}`);
  console.log(`  Per TX: ${check.perTxFeeETH} ETH${check.perTxFeeUSD ? ` ($${check.perTxFeeUSD})` : ''}`);
  console.log(`  Total: ${check.totalFeeETH} ETH${check.totalFeeUSD ? ` ($${check.totalFeeUSD})` : ''}`);
  console.log(`  Allowed: ${check.allowed ? '✅' : '⛔'}`);
  
  if (check.reason) {
    console.log(`  Reason: ${check.reason}`);
  }
}
