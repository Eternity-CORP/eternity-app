/**
 * Parse raw blockchain/ethers.js error messages into user-friendly text.
 * Zero dependencies — works on any platform.
 */

interface ErrorPattern {
  test: (message: string) => boolean;
  friendly: string | ((message: string) => string);
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Insufficient funds for gas
  {
    test: (m) => /insufficient funds/i.test(m) || /INSUFFICIENT_FUNDS/i.test(m),
    friendly: 'Insufficient funds to cover gas fees. Make sure you have enough native tokens (ETH/MATIC) on this network.',
  },
  // User rejected/denied transaction
  {
    test: (m) => /user rejected|user denied|ACTION_REJECTED/i.test(m),
    friendly: 'Transaction was cancelled.',
  },
  // Nonce too low (tx already processed)
  {
    test: (m) => /nonce.*too low|NONCE_EXPIRED/i.test(m),
    friendly: 'Transaction conflict. Please wait a moment and try again.',
  },
  // Replacement underpriced
  {
    test: (m) => /replacement.*underpriced|REPLACEMENT_UNDERPRICED/i.test(m),
    friendly: 'A pending transaction is blocking this one. Wait for it to confirm or increase gas.',
  },
  // Gas estimation failed / CALL_EXCEPTION
  {
    test: (m) => /CALL_EXCEPTION|execution reverted|revert/i.test(m),
    friendly: 'Transaction would fail. Check your token balance and allowance.',
  },
  // Unpredictable gas limit
  {
    test: (m) => /UNPREDICTABLE_GAS_LIMIT/i.test(m),
    friendly: 'Unable to estimate gas. The transaction may fail — check your balance and token approval.',
  },
  // Network/connection errors
  {
    test: (m) => /network|timeout|ETIMEDOUT|ECONNREFUSED|SERVER_ERROR|NETWORK_ERROR/i.test(m),
    friendly: 'Network error. Check your connection and try again.',
  },
  // Rate limiting
  {
    test: (m) => /429|rate limit|too many requests/i.test(m),
    friendly: 'Too many requests. Please wait a moment and try again.',
  },
  // No route found (LI.FI)
  {
    test: (m) => /no.*route|ROUTE_NOT_FOUND|no available quotes/i.test(m),
    friendly: 'No swap route available for this pair. Try a different token or amount.',
  },
  // Slippage exceeded
  {
    test: (m) => /slippage|price.*moved/i.test(m),
    friendly: 'Price moved too much during swap. Try increasing slippage tolerance.',
  },
  // Approval / allowance
  {
    test: (m) => /allowance|not approved|ERC20.*approve/i.test(m),
    friendly: 'Token approval required. Please approve the token first.',
  },
  // Transaction underpriced
  {
    test: (m) => /transaction.*underpriced/i.test(m),
    friendly: 'Gas price too low. Try again — gas prices fluctuate.',
  },
  // Deadline exceeded
  {
    test: (m) => /deadline|expired/i.test(m),
    friendly: 'Transaction expired. Please get a new quote and try again.',
  },
];

/**
 * Convert a raw error message (e.g. from ethers.js) to a user-friendly string.
 * If no pattern matches, returns a generic message instead of the raw error.
 */
export function formatErrorMessage(error: unknown, fallback?: string): string {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String(error);

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(rawMessage)) {
      return typeof pattern.friendly === 'function'
        ? pattern.friendly(rawMessage)
        : pattern.friendly;
    }
  }

  return fallback || 'Something went wrong. Please try again.';
}
