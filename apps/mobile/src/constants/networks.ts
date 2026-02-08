/**
 * Network Configuration
 * Extends shared multi-network config with mobile-specific fields (environment, Alchemy key).
 */

import {
  type NetworkId as SharedNetworkId,
  type MultiNetworkConfig,
  type NetworkTier,
  SUPPORTED_NETWORKS as SHARED_NETWORKS,
  TIER1_NETWORK_IDS as SHARED_TIER1_IDS,
  COMMON_TOKENS as SHARED_COMMON_TOKENS,
  getTokenAddress as sharedGetTokenAddress,
  getNetworkByChainId as sharedGetNetworkByChainId,
} from '@e-y/shared';

// Re-export shared types and constants for backward compatibility
export type NetworkId = SharedNetworkId;
export type { NetworkTier };

export type NetworkEnvironment = 'mainnet' | 'testnet';

/**
 * Mobile NetworkConfig — extends shared with `environment` field.
 */
export interface NetworkConfig extends MultiNetworkConfig {
  environment: NetworkEnvironment;
}

const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '';

/**
 * Tier 1 Networks — shared networks extended with `environment`.
 */
export const SUPPORTED_NETWORKS: Record<NetworkId, NetworkConfig> = Object.fromEntries(
  Object.entries(SHARED_NETWORKS).map(([id, config]) => [
    id,
    { ...config, environment: 'mainnet' as NetworkEnvironment },
  ]),
) as Record<NetworkId, NetworkConfig>;

/**
 * Tier 2 Networks — mobile-only, for smart scanning
 */
export const TIER2_NETWORKS: Record<string, NetworkConfig> = {
  bsc: {
    id: 'ethereum' as NetworkId,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    chainId: 56,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrlTemplate: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    tier: 'tier2',
    color: '#F3BA2F',
    alchemyNetwork: '',
    coingeckoPlatform: 'binance-smart-chain',
    coinGeckoId: 'binancecoin',
    environment: 'mainnet',
  },
  avalanche: {
    id: 'ethereum' as NetworkId,
    name: 'Avalanche',
    shortName: 'AVAX',
    chainId: 43114,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrlTemplate: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    tier: 'tier2',
    color: '#E84142',
    alchemyNetwork: '',
    coingeckoPlatform: 'avalanche',
    coinGeckoId: 'avalanche-2',
    environment: 'mainnet',
  },
  zksync: {
    id: 'ethereum' as NetworkId,
    name: 'zkSync Era',
    shortName: 'zkSync',
    chainId: 324,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrlTemplate: 'https://mainnet.era.zksync.io',
    blockExplorer: 'https://explorer.zksync.io',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
    tier: 'tier2',
    color: '#8C8DFC',
    alchemyNetwork: '',
    coingeckoPlatform: 'zksync',
    coinGeckoId: 'ethereum',
    environment: 'mainnet',
  },
};

/**
 * Get all Tier 1 network IDs
 */
export const TIER1_NETWORK_IDS: NetworkId[] = [...SHARED_TIER1_IDS];

/**
 * Get RPC URL for a network (injects mobile Alchemy key)
 */
export function getRpcUrl(networkId: NetworkId): string {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);
  return network.rpcUrlTemplate.replace('{apiKey}', ALCHEMY_API_KEY);
}

/**
 * Get Alchemy API URL for a network
 */
export function getAlchemyUrl(networkId: NetworkId): string {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);
  return `https://${network.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  const shared = sharedGetNetworkByChainId(chainId);
  if (!shared) return undefined;
  return SUPPORTED_NETWORKS[shared.id];
}

/**
 * Get network config by ID
 */
export function getNetworkConfig(networkId: NetworkId): NetworkConfig {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) throw new Error(`Unsupported network: ${networkId}`);
  return network;
}

/**
 * Check if network is supported (Tier 1)
 */
export function isNetworkSupported(networkId: string): networkId is NetworkId {
  return networkId in SUPPORTED_NETWORKS;
}

// Re-export shared token constants and helpers
export const COMMON_TOKENS = SHARED_COMMON_TOKENS;
export const getTokenAddress = sharedGetTokenAddress;

/**
 * Check if a token exists on a network
 */
export function tokenExistsOnNetwork(symbol: string, networkId: NetworkId): boolean {
  return !!COMMON_TOKENS[symbol]?.[networkId];
}
