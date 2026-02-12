/**
 * Testnet Network Configuration
 * Supported EVM testnet networks for E-Y wallet development and testing
 */

import { type NetworkId } from '@e-y/shared';
import { NetworkConfig } from './networks';

export type TestnetNetworkId =
  | 'sepolia'
  | 'polygon-amoy'
  | 'arbitrum-sepolia'
  | 'base-sepolia'
  | 'optimism-sepolia';

const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '';

/**
 * Testnet Networks - For development and testing
 */
export const TESTNET_NETWORKS: Record<TestnetNetworkId, NetworkConfig> = {
  sepolia: {
    id: 'ethereum' as NetworkId, // Maps to mainnet equivalent
    name: 'Sepolia',
    shortName: 'SEP',
    chainId: 11155111,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://eth-sepolia.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://sepolia.etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    tier: 'tier1',
    color: '#627EEA',
    alchemyNetwork: 'eth-sepolia',
    coingeckoPlatform: '', // Testnets don't have CoinGecko prices
    coinGeckoId: 'ethereum',
    environment: 'testnet',
  },
  'polygon-amoy': {
    id: 'polygon' as NetworkId, // Maps to mainnet equivalent
    name: 'Polygon Amoy',
    shortName: 'AMOY',
    chainId: 80002,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://polygon-amoy.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://amoy.polygonscan.com',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    tier: 'tier1',
    color: '#8247E5',
    alchemyNetwork: 'polygon-amoy',
    coingeckoPlatform: '', // Testnets don't have CoinGecko prices
    coinGeckoId: 'matic-network',
    environment: 'testnet',
  },
  'arbitrum-sepolia': {
    id: 'arbitrum' as NetworkId, // Maps to mainnet equivalent
    name: 'Arbitrum Sepolia',
    shortName: 'ARB-SEP',
    chainId: 421614,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://arb-sepolia.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://sepolia.arbiscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    tier: 'tier1',
    color: '#28A0F0',
    alchemyNetwork: 'arb-sepolia',
    coingeckoPlatform: '', // Testnets don't have CoinGecko prices
    coinGeckoId: 'ethereum',
    environment: 'testnet',
  },
  'base-sepolia': {
    id: 'base' as NetworkId, // Maps to mainnet equivalent
    name: 'Base Sepolia',
    shortName: 'BASE-SEP',
    chainId: 84532,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://base-sepolia.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://sepolia.basescan.org',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    tier: 'tier1',
    color: '#0052FF',
    alchemyNetwork: 'base-sepolia',
    coingeckoPlatform: '', // Testnets don't have CoinGecko prices
    coinGeckoId: 'ethereum',
    environment: 'testnet',
  },
  'optimism-sepolia': {
    id: 'optimism' as NetworkId, // Maps to mainnet equivalent
    name: 'Optimism Sepolia',
    shortName: 'OP-SEP',
    chainId: 11155420,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrlTemplate: 'https://opt-sepolia.g.alchemy.com/v2/{apiKey}',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    tier: 'tier1',
    color: '#FF0420',
    alchemyNetwork: 'opt-sepolia',
    coingeckoPlatform: '', // Testnets don't have CoinGecko prices
    coinGeckoId: 'ethereum',
    environment: 'testnet',
  },
};

/**
 * Get all testnet network IDs
 */
export const TESTNET_NETWORK_IDS: TestnetNetworkId[] = Object.keys(
  TESTNET_NETWORKS
) as TestnetNetworkId[];

/**
 * Get RPC URL for a testnet network
 */
export function getTestnetRpcUrl(networkId: TestnetNetworkId): string {
  const network = TESTNET_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported testnet network: ${networkId}`);
  }
  return network.rpcUrlTemplate.replace('{apiKey}', ALCHEMY_API_KEY);
}

/**
 * Get Alchemy API URL for a testnet network
 */
export function getTestnetAlchemyUrl(networkId: TestnetNetworkId): string {
  const network = TESTNET_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported testnet network: ${networkId}`);
  }
  return `https://${network.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

/**
 * Get testnet network by chain ID
 */
export function getTestnetByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(TESTNET_NETWORKS).find((n) => n.chainId === chainId);
}

/**
 * Get testnet network config by ID
 */
export function getTestnetConfig(networkId: TestnetNetworkId): NetworkConfig {
  const network = TESTNET_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported testnet network: ${networkId}`);
  }
  return network;
}

/**
 * Check if network is a supported testnet
 */
export function isTestnetSupported(networkId: string): networkId is TestnetNetworkId {
  return networkId in TESTNET_NETWORKS;
}

/**
 * Get the mainnet equivalent network ID for a testnet
 */
export function getMainnetEquivalent(
  testnetId: TestnetNetworkId
): 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' {
  const mapping: Record<TestnetNetworkId, 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism'> = {
    sepolia: 'ethereum',
    'polygon-amoy': 'polygon',
    'arbitrum-sepolia': 'arbitrum',
    'base-sepolia': 'base',
    'optimism-sepolia': 'optimism',
  };
  return mapping[testnetId];
}

/**
 * Get the testnet equivalent for a mainnet network ID
 */
export function getTestnetEquivalent(
  mainnetId: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism'
): TestnetNetworkId {
  const mapping: Record<string, TestnetNetworkId> = {
    ethereum: 'sepolia',
    polygon: 'polygon-amoy',
    arbitrum: 'arbitrum-sepolia',
    base: 'base-sepolia',
    optimism: 'optimism-sepolia',
  };
  return mapping[mainnetId];
}
