/**
 * Multi-Network Configuration
 * Supported EVM networks for E-Y wallet — shared between web and mobile.
 * Zero runtime dependencies.
 */

export type NetworkId =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'optimism';

export type NetworkTier = 'tier1' | 'tier2';

export interface MultiNetworkConfig {
  id: NetworkId;
  name: string;
  shortName: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrlTemplate: string;
  blockExplorer: string;
  iconUrl: string;
  tier: NetworkTier;
  color: string;
  alchemyNetwork: string;
  coingeckoPlatform: string;
  coinGeckoId: string;
}

export const SUPPORTED_NETWORKS: Record<NetworkId, MultiNetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    chainId: 1,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrlTemplate: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    tier: 'tier1',
    color: '#627EEA',
    alchemyNetwork: 'eth-mainnet',
    coingeckoPlatform: 'ethereum',
    coinGeckoId: 'ethereum',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'MATIC',
    chainId: 137,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrlTemplate: 'https://polygon-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://polygonscan.com',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    tier: 'tier1',
    color: '#8247E5',
    alchemyNetwork: 'polygon-mainnet',
    coingeckoPlatform: 'polygon-pos',
    coinGeckoId: 'matic-network',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'ARB',
    chainId: 42161,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrlTemplate: 'https://arb-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://arbiscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    tier: 'tier1',
    color: '#28A0F0',
    alchemyNetwork: 'arb-mainnet',
    coingeckoPlatform: 'arbitrum-one',
    coinGeckoId: 'ethereum',
  },
  base: {
    id: 'base',
    name: 'Base',
    shortName: 'BASE',
    chainId: 8453,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrlTemplate: 'https://base-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://basescan.org',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    tier: 'tier1',
    color: '#0052FF',
    alchemyNetwork: 'base-mainnet',
    coingeckoPlatform: 'base',
    coinGeckoId: 'ethereum',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    shortName: 'OP',
    chainId: 10,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrlTemplate: 'https://opt-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://optimistic.etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    tier: 'tier1',
    color: '#FF0420',
    alchemyNetwork: 'opt-mainnet',
    coingeckoPlatform: 'optimistic-ethereum',
    coinGeckoId: 'ethereum',
  },
};

export const TIER1_NETWORK_IDS: NetworkId[] = Object.keys(SUPPORTED_NETWORKS) as NetworkId[];

export const NETWORK_TO_CHAIN_ID: Record<NetworkId, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

export const CHAIN_ID_TO_NETWORK: Record<number, NetworkId> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  8453: 'base',
  10: 'optimism',
};

/**
 * Common token addresses across networks
 */
export const COMMON_TOKENS: Record<string, Partial<Record<NetworkId, string>>> = {
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  WETH: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    base: '0x4200000000000000000000000000000000000006',
    optimism: '0x4200000000000000000000000000000000000006',
  },
};

/**
 * Get token address on a specific network
 */
export function getTokenAddress(symbol: string, networkId: NetworkId): string | undefined {
  return COMMON_TOKENS[symbol.toUpperCase()]?.[networkId];
}

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): MultiNetworkConfig | undefined {
  const networkId = CHAIN_ID_TO_NETWORK[chainId];
  return networkId ? SUPPORTED_NETWORKS[networkId] : undefined;
}

/** Sepolia testnet chain ID */
export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Get the correct chainId based on account type and selected network.
 * Test accounts always use Sepolia; real accounts use the selected network.
 */
export function resolveChainId(isTestAccount: boolean, selectedNetwork?: NetworkId): number {
  return isTestAccount ? SEPOLIA_CHAIN_ID : NETWORK_TO_CHAIN_ID[selectedNetwork || 'ethereum'];
}

/**
 * Get a display-friendly network label from a chainId.
 * Returns null for Sepolia (testnet default) and unknown chains.
 */
export function getNetworkLabel(chainId: number | null | undefined): string | null {
  if (!chainId || chainId === SEPOLIA_CHAIN_ID) return null;
  const networkId = CHAIN_ID_TO_NETWORK[chainId];
  return networkId ? SUPPORTED_NETWORKS[networkId].shortName : null;
}

/**
 * Get network badge info (name + color) from a chainId.
 * Returns null for Sepolia and unknown chains.
 */
export function getNetworkBadge(chainId: number | null | undefined): { name: string; color: string } | null {
  if (!chainId || chainId === SEPOLIA_CHAIN_ID) return null;
  const networkId = CHAIN_ID_TO_NETWORK[chainId];
  if (!networkId) return null;
  const net = SUPPORTED_NETWORKS[networkId];
  return net ? { name: net.shortName, color: net.color } : null;
}

/**
 * Build Onramper fiat on-ramp URL for a wallet address.
 * Returns null if no address provided.
 *
 * NOTE: The `wallets` parameter requires HMAC-SHA256 URL signing (server-side secret).
 * Without signing, Onramper rejects the URL as "Invalid Link".
 * We omit `wallets` so the widget loads — the user pastes their address at checkout.
 */
export function buildOnramperUrl(address: string | undefined, apiKey: string): string | null {
  if (!address) return null;
  const cryptos = 'eth,matic,usdc,usdt,dai';
  const networks = 'ethereum,polygon,arbitrum,base,optimism';
  return `https://buy.onramper.com?apiKey=${apiKey}&defaultCrypto=eth&onlyCryptos=${cryptos}&onlyCryptoNetworks=${networks}&mode=buy&darkMode=true`;
}

/**
 * Build RPC URL for a single network with an Alchemy API key.
 */
export function buildRpcUrl(networkId: NetworkId, alchemyKey: string): string {
  return SUPPORTED_NETWORKS[networkId].rpcUrlTemplate.replace('{apiKey}', alchemyKey);
}

/**
 * Build RPC URLs for all networks with an API key
 */
export function buildMultiNetworkRpcUrls(
  alchemyKey: string,
): Record<NetworkId, { rpcUrl: string; alchemyUrl: string }> {
  const result = {} as Record<NetworkId, { rpcUrl: string; alchemyUrl: string }>;
  for (const id of TIER1_NETWORK_IDS) {
    const network = SUPPORTED_NETWORKS[id];
    const rpcUrl = network.rpcUrlTemplate.replace('{apiKey}', alchemyKey);
    const alchemyUrl = `https://${network.alchemyNetwork}.g.alchemy.com/v2/${alchemyKey}`;
    result[id] = { rpcUrl, alchemyUrl };
  }
  return result;
}

/**
 * Network gas cost ranking (lower = cheaper)
 */
export const NETWORK_GAS_RANKING: Record<NetworkId, number> = {
  base: 1,
  arbitrum: 2,
  optimism: 3,
  polygon: 4,
  ethereum: 5,
};

/**
 * Chain ID to RPC URL mapping for server-side use (API gateway, cron jobs).
 * Alchemy URLs end with `/v2/` — append API key at runtime.
 * Public RPCs (testnets) are complete URLs that need no key.
 */
export const CHAIN_RPC_URLS: Record<number, string> = {
  // Mainnets (Alchemy — append API key)
  1: 'https://eth-mainnet.g.alchemy.com/v2/',       // Ethereum
  137: 'https://polygon-mainnet.g.alchemy.com/v2/',   // Polygon
  10: 'https://opt-mainnet.g.alchemy.com/v2/',        // Optimism
  42161: 'https://arb-mainnet.g.alchemy.com/v2/',     // Arbitrum
  8453: 'https://base-mainnet.g.alchemy.com/v2/',     // Base
  // Testnets (public RPCs — Alchemy 500s from Railway)
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com', // Sepolia
  80002: 'https://polygon-amoy.g.alchemy.com/v2/',        // Amoy
  11155420: 'https://opt-sepolia.g.alchemy.com/v2/',       // Optimism Sepolia
  421614: 'https://arb-sepolia.g.alchemy.com/v2/',         // Arbitrum Sepolia
  84532: 'https://base-sepolia.g.alchemy.com/v2/',         // Base Sepolia
};

/**
 * Build an RPC URL for a given chainId.
 * Appends the Alchemy API key to Alchemy-hosted URLs; returns as-is for public RPCs.
 */
export function buildChainRpcUrl(chainId: number, alchemyApiKey: string): string | null {
  const baseUrl = CHAIN_RPC_URLS[chainId];
  if (!baseUrl) return null;
  return baseUrl.includes('alchemy.com') ? baseUrl + alchemyApiKey : baseUrl;
}
