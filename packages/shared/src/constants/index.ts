// Error codes
export const ErrorCodes = {
  // Wallet errors
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',

  // Transaction errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS: 'INSUFFICIENT_GAS',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',

  // BLIK errors
  BLIK_CODE_INVALID: 'BLIK_CODE_INVALID',
  BLIK_CODE_EXPIRED: 'BLIK_CODE_EXPIRED',
  BLIK_CODE_USED: 'BLIK_CODE_USED',
  BLIK_CODE_NOT_FOUND: 'BLIK_CODE_NOT_FOUND',
  BLIK_MATCH_FAILED: 'BLIK_MATCH_FAILED',

  // Username errors
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USERNAME_INVALID: 'USERNAME_INVALID',
  USERNAME_NOT_FOUND: 'USERNAME_NOT_FOUND',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Limits
export const Limits = {
  // BLIK
  BLIK_CODE_LENGTH: 6,
  BLIK_CODE_EXPIRATION_MS: 120000, // 2 minutes
  BLIK_MAX_AMOUNT_USD: 10000,

  // Username
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,

  // Wallet
  MAX_ACCOUNTS_PER_WALLET: 10,
  MAX_RECENT_TRANSACTIONS: 50,

  // Transaction
  DEFAULT_GAS_LIMIT: 21000,
  ERC20_GAS_LIMIT: 65000,
  MAX_GAS_PRICE_GWEI: 500,

  // UI
  ADDRESS_DISPLAY_CHARS: 4,
  MAX_CONTACTS: 100,
} as const;

// Supported chains
export const SupportedChains = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
} as const;

export type SupportedChainId =
  (typeof SupportedChains)[keyof typeof SupportedChains];

// Default tokens per chain
export const DefaultTokens: Record<
  number,
  { symbol: string; address: string | null; decimals: number }[]
> = {
  [SupportedChains.ETHEREUM]: [
    { symbol: 'ETH', address: null, decimals: 18 },
    {
      symbol: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
    },
  ],
  [SupportedChains.SEPOLIA]: [
    { symbol: 'ETH', address: null, decimals: 18 },
  ],
  [SupportedChains.POLYGON]: [
    { symbol: 'MATIC', address: null, decimals: 18 },
    {
      symbol: 'USDC',
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
    },
  ],
  [SupportedChains.BASE]: [
    { symbol: 'ETH', address: null, decimals: 18 },
    {
      symbol: 'USDC',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    },
  ],
};

// WebSocket events
export const BlikEvents = {
  REGISTER_CODE: 'register_code',
  REDEEM_CODE: 'redeem_code',
  CODE_MATCHED: 'code_matched',
  CODE_EXPIRED: 'code_expired',
  CONFIRM_TRANSACTION: 'confirm_transaction',
  TRANSACTION_CONFIRMED: 'transaction_confirmed',
} as const;
