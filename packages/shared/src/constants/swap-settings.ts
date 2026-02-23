/**
 * Swap settings -- shared constants for slippage, price impact, and timeouts.
 */

/** Default slippage tolerance (0.5%) */
export const DEFAULT_SLIPPAGE = 0.005;

/** Maximum allowed slippage (3%) */
export const MAX_SLIPPAGE = 0.03;

/** Preset slippage options for UI */
export const SLIPPAGE_OPTIONS = [0.001, 0.005, 0.01, 0.03] as const;

/** Slippage option labels for display */
export const SLIPPAGE_LABELS: Record<number, string> = {
  0.001: '0.1%',
  0.005: '0.5%',
  0.01: '1%',
  0.03: '3%',
};

/** Price impact warning threshold (2%) */
export const PRICE_IMPACT_WARNING_THRESHOLD = 0.02;

/** Swap transaction deadline (20 minutes) */
export const SWAP_DEADLINE_SECONDS = 20 * 60;

/** Quote refresh interval (30 seconds) */
export const QUOTE_REFRESH_INTERVAL = 30_000;

/** Default gas limit fallback for swap transactions when quote doesn't provide one */
export const SWAP_GAS_LIMIT_FALLBACK = '500000';
