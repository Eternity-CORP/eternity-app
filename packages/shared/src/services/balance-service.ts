/**
 * Shared Balance Service
 * Pure fetch() functions for Alchemy and CoinGecko.
 * No caching — apps cache locally using their own storage.
 */

// ============================================
// Types
// ============================================

export interface AlchemyTokenBalanceEntry {
  contractAddress: string;
  tokenBalance: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

// ============================================
// Alchemy API
// ============================================

/**
 * Fetch ERC-20 token balances via Alchemy
 * Returns non-zero balances only.
 */
export async function fetchAlchemyTokenBalances(
  alchemyUrl: string,
  address: string,
): Promise<AlchemyTokenBalanceEntry[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = (await response.json()) as { result?: { tokenBalances?: AlchemyTokenBalanceEntry[] } };
    return (data.result?.tokenBalances || []).filter(
      (t) => t.tokenBalance !== '0x0' && t.tokenBalance !== '0x',
    );
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

/**
 * Fetch token metadata from Alchemy
 */
export async function fetchAlchemyTokenMetadata(
  alchemyUrl: string,
  contractAddress: string,
): Promise<TokenMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = (await response.json()) as { result: { name: string; symbol: string; decimals: number } };
    const { name, symbol, decimals } = data.result;
    return { name, symbol, decimals };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ============================================
// CoinGecko API
// ============================================

/**
 * Fetch ETH USD price from CoinGecko
 */
export async function fetchEthUsdPrice(): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) return 0;

    const data = (await response.json()) as { ethereum?: { usd?: number } };
    const price = data.ethereum?.usd;
    return typeof price === 'number' && price > 0 ? price : 0;
  } catch {
    clearTimeout(timeoutId);
    return 0;
  }
}

/**
 * Fetch USD prices for ETH and multiple ERC-20 tokens
 */
export async function fetchTokenPrices(
  contractAddresses: string[],
): Promise<{ ethPrice: number; tokenPrices: Record<string, number> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const ethResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    let ethPrice = 0;
    if (ethResponse.ok) {
      const ethData = (await ethResponse.json()) as { ethereum?: { usd?: number } };
      ethPrice = ethData.ethereum?.usd || 0;
    }

    const tokenPrices: Record<string, number> = {};

    if (contractAddresses.length > 0) {
      const addressList = contractAddresses.slice(0, 100).join(',');
      const tokenResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressList}&vs_currencies=usd`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        },
      );

      if (tokenResponse.ok) {
        const tokenData = (await tokenResponse.json()) as Record<string, { usd?: number }>;
        for (const [address, priceData] of Object.entries(tokenData)) {
          tokenPrices[address.toLowerCase()] = priceData?.usd || 0;
        }
      }
    }

    clearTimeout(timeoutId);
    return { ethPrice, tokenPrices };
  } catch {
    clearTimeout(timeoutId);
    return { ethPrice: 0, tokenPrices: {} };
  }
}

// ============================================
// Utility
// ============================================

// ============================================
// CoinGecko Price by Symbol
// ============================================

/**
 * Symbol → CoinGecko ID mapping for price lookups
 */
export const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  POL: 'matic-network',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
};

/**
 * Fetch USD prices for tokens by symbol via CoinGecko.
 * Returns a map of UPPER_SYMBOL → USD price.
 * Pure fetch — callers should cache the result themselves.
 */
export async function fetchTokenPricesBySymbol(
  symbols: string[],
): Promise<Record<string, number>> {
  const uniqueIds = new Set<string>();
  for (const symbol of symbols) {
    const id = COINGECKO_IDS[symbol.toUpperCase()];
    if (id) uniqueIds.add(id);
  }

  if (uniqueIds.size === 0) return {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const idsParam = Array.from(uniqueIds).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) return {};

    const data = (await response.json()) as Record<string, { usd?: number }>;

    const prices: Record<string, number> = {};
    for (const [symbol, coingeckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[coingeckoId]?.usd) {
        prices[symbol] = data[coingeckoId].usd!;
      }
    }

    return prices;
  } catch {
    clearTimeout(timeoutId);
    return {};
  }
}

/**
 * Apply symbol-keyed prices to an array of token balances.
 * Returns a new array with usdValue set for each balance.
 */
export function applyPricesToBalances<T extends { symbol: string; balance: string; usdValue: number }>(
  balances: T[],
  prices: Record<string, number>,
): T[] {
  return balances.map((b) => {
    const price = prices[b.symbol.toUpperCase()] || 0;
    return { ...b, usdValue: parseFloat(b.balance) * price };
  });
}

// ============================================
// Utility
// ============================================

/**
 * Get token icon URL from Trust Wallet Assets
 */
export function getTokenIconUrl(contractAddress: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${contractAddress}/logo.png`;
}

/**
 * Format raw token balance (hex string) to human-readable
 */
export function formatRawTokenBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
    return '0';
  }

  const balance = BigInt(rawBalance);
  const divisor = BigInt(10 ** decimals);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '') || '0';

  if (wholePart === BigInt(0) && balance > BigInt(0)) {
    return `0.${fractionalStr.slice(0, 6)}`;
  }

  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Calculate total USD value from balances
 */
export function calculateTotalUsdValue(
  balances: Array<{ usdValue?: number }>,
): number {
  return balances.reduce((total, token) => total + (token.usdValue || 0), 0);
}
