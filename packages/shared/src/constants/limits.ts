/**
 * Application limits and constants
 */

// BLIK code constants
export const MAX_BLIK_AGE_MS = 120000; // 2 minutes in milliseconds
export const BLIK_CODE_LENGTH = 6;
export const BLIK_CODE_MIN = 100000;
export const BLIK_CODE_MAX = 999999;

// BLIK amount limits
export const BLIK_MIN_AMOUNT = 0.000001; // prevent dust amounts
export const BLIK_MAX_AMOUNT = 1_000_000; // reasonable upper bound

// Username constants
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
// USERNAME_PATTERN removed — use USERNAME_REGEX from utils/username.ts

// Wallet constants
export const MNEMONIC_WORD_COUNT_12 = 12;
export const MNEMONIC_WORD_COUNT_24 = 24;
export const HD_WALLET_DERIVATION_PATH = "m/44'/60'/0'/0";
export const DEFAULT_ACCOUNT_INDEX = 0;

// Transaction constants
export const MAX_GAS_LIMIT = 30000000;
export const DEFAULT_GAS_LIMIT = 21000;
export const MAX_GAS_PRICE_GWEI = 1000;

// API constants
export const API_TIMEOUT_MS = 30000; // 30 seconds
export const WS_RECONNECT_DELAY_MS = 1000;

// Balance refresh
export const BALANCE_REFRESH_INTERVAL_MS = 60000; // 1 minute
