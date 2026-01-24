/**
 * Network Configuration
 * Supported EVM networks for E-Y wallet
 */

export type NetworkId =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'optimism';

export type NetworkTier = 'tier1' | 'tier2';

export type NetworkEnvironment = 'mainnet' | 'testnet';

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  shortName: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrlTemplate: string; // Template with {apiKey} placeholder
  blockExplorer: string;
  iconUrl: string;
  tier: NetworkTier;
  color: string; // For UI badges
  // Alchemy network name for API calls
  alchemyNetwork: string;
  // CoinGecko platform ID for token prices
  coingeckoPlatform: string;
  // Network environment (mainnet or testnet)
  environment: NetworkEnvironment;
}

const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '';

/**
 * Tier 1 Networks - Full support
 */
export const SUPPORTED_NETWORKS: Record<NetworkId, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    chainId: 1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    tier: 'tier1',
    color: '#627EEA',
    alchemyNetwork: 'eth-mainnet',
    coingeckoPlatform: 'ethereum',
    environment: 'mainnet',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'MATIC',
    chainId: 137,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://polygon-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://polygonscan.com',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    tier: 'tier1',
    color: '#8247E5',
    alchemyNetwork: 'polygon-mainnet',
    coingeckoPlatform: 'polygon-pos',
    environment: 'mainnet',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'ARB',
    chainId: 42161,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://arb-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://arbiscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    tier: 'tier1',
    color: '#28A0F0',
    alchemyNetwork: 'arb-mainnet',
    coingeckoPlatform: 'arbitrum-one',
    environment: 'mainnet',
  },
  base: {
    id: 'base',
    name: 'Base',
    shortName: 'BASE',
    chainId: 8453,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://base-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://basescan.org',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    tier: 'tier1',
    color: '#0052FF',
    alchemyNetwork: 'base-mainnet',
    coingeckoPlatform: 'base',
    environment: 'mainnet',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    shortName: 'OP',
    chainId: 10,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://opt-mainnet.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://optimistic.etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    tier: 'tier1',
    color: '#FF0420',
    alchemyNetwork: 'opt-mainnet',
    coingeckoPlatform: 'optimistic-ethereum',
    environment: 'mainnet',
  },
};

/**
 * Tier 2 Networks - For smart scanning only
 */
export const TIER2_NETWORKS: Record<string, NetworkConfig> = {
  bsc: {
    id: 'ethereum' as NetworkId, // placeholder, not fully supported
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    chainId: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    tier: 'tier2',
    color: '#F3BA2F',
    alchemyNetwork: '', // Not supported by Alchemy
    coingeckoPlatform: 'binance-smart-chain',
    environment: 'mainnet',
  },
  avalanche: {
    id: 'ethereum' as NetworkId, // placeholder
    name: 'Avalanche',
    shortName: 'AVAX',
    chainId: 43114,
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    tier: 'tier2',
    color: '#E84142',
    alchemyNetwork: '', // Not supported by Alchemy
    coingeckoPlatform: 'avalanche',
    environment: 'mainnet',
  },
  zksync: {
    id: 'ethereum' as NetworkId, // placeholder
    name: 'zkSync Era',
    shortName: 'zkSync',
    chainId: 324,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://mainnet.era.zksync.io',
    blockExplorer: 'https://explorer.zksync.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
    tier: 'tier2',
    color: '#8C8DFC',
    alchemyNetwork: '', // Not supported by Alchemy
    coingeckoPlatform: 'zksync',
    environment: 'mainnet',
  },
};

/**
 * Get all Tier 1 network IDs
 */
export const TIER1_NETWORK_IDS: NetworkId[] = Object.keys(SUPPORTED_NETWORKS) as NetworkId[];

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(networkId: NetworkId): string {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }
  return network.rpcUrlTemplate.replace('{apiKey}', ALCHEMY_API_KEY);
}

/**
 * Get Alchemy API URL for a network
 */
export function getAlchemyUrl(networkId: NetworkId): string {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }
  return `https://${network.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(SUPPORTED_NETWORKS).find((n) => n.chainId === chainId);
}

/**
 * Get network config by ID
 */
export function getNetworkConfig(networkId: NetworkId): NetworkConfig {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }
  return network;
}

/**
 * Check if network is supported (Tier 1)
 */
export function isNetworkSupported(networkId: string): networkId is NetworkId {
  return networkId in SUPPORTED_NETWORKS;
}

/**
 * Common token addresses across networks
 * Maps token symbol to contract addresses per network
 */
export const COMMON_TOKENS: Record<string, Partial<Record<NetworkId, string>>> = {
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Native USDC
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Native USDC
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Native USDC
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EescdeCB5d1d3BLMark',
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
  return COMMON_TOKENS[symbol]?.[networkId];
}

/**
 * Check if a token exists on a network
 */
export function tokenExistsOnNetwork(symbol: string, networkId: NetworkId): boolean {
  return !!COMMON_TOKENS[symbol]?.[networkId];
}
