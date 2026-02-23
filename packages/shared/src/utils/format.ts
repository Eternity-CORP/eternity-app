/**
 * Shared format utilities
 */

/**
 * Format a USD value for display.
 * - 0 → "$0.00"
 * - < $0.01 → "<$0.01"
 * - < $1,000 → "$X.XX"
 * - < $1,000,000 → "$X.XK" or "$XX.XK"
 * - >= $1,000,000 → "$X.XM" or "$XX.XM"
 */
export function formatUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1000000) {
    const kValue = value / 1000;
    return `$${kValue.toFixed(kValue < 10 ? 2 : 1)}K`;
  }
  const mValue = value / 1000000;
  return `$${mValue.toFixed(mValue < 10 ? 2 : 1)}M`;
}

/**
 * Format a crypto balance for display.
 * - >= 1000: locale-formatted with up to 2 decimals
 * - >= 1: fixed to maxDecimals (default 4), trailing zeros trimmed
 * - > 0 but < 1: fixed to 6 decimals, trailing zeros trimmed
 * - very small (below threshold): shows "<0.0001"
 * - 0 or NaN: "0"
 */
export function formatBalance(balance: string, maxDecimals: number = 4): string {
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
  if (num < 1 / Math.pow(10, 6)) return `<${(1 / Math.pow(10, 6)).toFixed(6)}`;
  return num.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Format a token amount (in smallest units) for display.
 * Pure JS implementation — no ethers dependency.
 * @param amount - Amount in smallest units (e.g. wei)
 * @param decimals - Token decimals (e.g. 18 for ETH)
 * @param maxDecimals - Maximum decimal places to show (default: 6)
 */
export function formatTokenAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
  if (!amount || amount === '0') return '0';

  const isNeg = amount.startsWith('-');
  const abs = isNeg ? amount.slice(1) : amount;
  const padded = abs.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals) || '0';
  const fraction = padded.slice(padded.length - decimals);

  const formatted = `${whole}.${fraction}`;
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';

  const result = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });

  return isNeg ? `-${result}` : result;
}

/**
 * Format a transaction timestamp for display.
 * Produces "Jan 5, 12:30 PM" style output.
 */
export function formatTransactionDate(timestamp: number | string): string {
  const d = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Build a block-explorer URL for a transaction, token, or address.
 * Uses the blockExplorer field from SUPPORTED_NETWORKS.
 * Falls back to etherscan.io for unknown network IDs.
 */
export function getExplorerUrl(
  blockExplorerBase: string,
  hash: string,
  type: 'tx' | 'token' | 'address' = 'tx',
): string {
  const base = blockExplorerBase.replace(/\/+$/, '');
  return `${base}/${type}/${hash}`;
}

/**
 * Parse a human-readable token amount to smallest units.
 * Pure JS implementation — no ethers dependency.
 * @param amount - Human-readable amount (e.g. "1.5")
 * @param decimals - Token decimals (e.g. 18 for ETH)
 * @returns Amount in smallest units as string
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  try {
    if (!amount || amount === '0') return '0';

    const trimmed = amount.trim();
    // Validate input is a valid numeric string (digits, optional single decimal point)
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return '0';

    const parts = trimmed.split('.');
    const whole = parts[0] || '0';
    let fraction = (parts[1] || '').slice(0, decimals); // trim excess precision
    fraction = fraction.padEnd(decimals, '0');

    // Remove leading zeros from combined result but keep at least '0'
    const raw = whole + fraction;
    const result = raw.replace(/^0+/, '') || '0';
    return result;
  } catch {
    return '0';
  }
}
