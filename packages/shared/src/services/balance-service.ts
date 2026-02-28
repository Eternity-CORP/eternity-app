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
  platform = 'ethereum',
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
        `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${addressList}&vs_currencies=usd`,
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
// CoinGecko Price by Symbol
// ============================================

import { COINGECKO_IDS } from '../constants/coingecko';

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
// Spam Detection
// ============================================

const SPAM_PATTERNS = [
  /t\.me\//i,
  /https?:\/\//i,
  /\.com/i,
  /\.org/i,
  /\.io/i,
  /\.xyz/i,
  /claim/i,
  /airdrop/i,
  /reward/i,
  /visit/i,
  /free\s+mint/i,
  /\.net/i,
];

/** Well-known tokens that should never be filtered out */
const KNOWN_TOKENS = new Set([
  'ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI',
  'AAVE', 'ARB', 'OP', 'MATIC', 'WMATIC', 'CBETH', 'RETH', 'STETH',
  'FRAX', 'LUSD', 'TUSD', 'BUSD', 'COMP', 'MKR', 'SNX', 'CRV',
  'LDO', 'RPL', 'GRT', 'ENS', 'DYDX', 'GMX', 'PEPE', 'SHIB',
]);

/**
 * Detect spam/scam tokens using whitelist approach.
 * Only known, legitimate tokens pass through. Everything else is filtered.
 * This prevents dust attacks, airdrop scams, and random shitcoins.
 */
export function isSpamToken(symbol: string, name: string, balance?: string): boolean {
  // Empty or whitespace-only symbol/name is always spam
  if (!symbol.trim() || !name.trim()) return true;

  // Whitelist approach: if token is known, it's safe
  if (KNOWN_TOKENS.has(symbol.toUpperCase())) return false;

  // Everything else is treated as spam
  return true;
}

// ============================================
// Utility
// ============================================

// Well-known token icons by symbol (chain-agnostic)
const WELL_KNOWN_TOKEN_ICONS: Record<string, string> = {
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  WETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  WBTC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  LINK: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
  UNI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
  AAVE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png',
  ARB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png',
  OP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/assets/0x4200000000000000000000000000000000000042/logo.png',
};

/** Supported Trust Wallet chain names for icon lookups */
const TRUSTWALLET_CHAINS = new Set(['ethereum', 'polygon', 'arbitrum', 'base', 'optimism']);

/**
 * Get token icon URL — first checks well-known symbol map,
 * then falls back to Trust Wallet Assets CDN by contract address.
 */
export function getTokenIconUrl(
  contractAddress: string,
  symbol?: string,
  networkId?: string,
): string {
  // 1. Well-known symbol lookup (works across all chains)
  if (symbol) {
    const upper = symbol.toUpperCase();
    if (WELL_KNOWN_TOKEN_ICONS[upper]) {
      return WELL_KNOWN_TOKEN_ICONS[upper];
    }
  }

  // 2. Trust Wallet Assets by chain + contract address
  const chain = networkId && TRUSTWALLET_CHAINS.has(networkId) ? networkId : 'ethereum';
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${contractAddress}/logo.png`;
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
