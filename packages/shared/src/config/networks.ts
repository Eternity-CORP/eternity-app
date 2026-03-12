import type { AccountType } from '../types/wallet';
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId, type MultiNetworkConfig } from './multi-network';

export interface SimpleNetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (address: string) => string;
  symbol: string;
}

/**
 * Build the networks config with API key injection.
 * Call once at app startup with the relevant env key.
 */
export function buildNetworks(alchemyKey: string): Record<AccountType, SimpleNetworkConfig> {
  return {
    test: {
      name: 'Sepolia',
      chainId: 11155111,
      rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
      explorerUrl: 'https://sepolia.etherscan.io',
      explorerTxUrl: (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`,
      explorerAddressUrl: (address: string) => `https://sepolia.etherscan.io/address/${address}`,
      symbol: 'ETH',
    },
    real: {
      name: 'Ethereum',
      chainId: 1,
      rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      explorerUrl: 'https://etherscan.io',
      explorerTxUrl: (hash: string) => `https://etherscan.io/tx/${hash}`,
      explorerAddressUrl: (address: string) => `https://etherscan.io/address/${address}`,
      symbol: 'ETH',
    },
  };
}

export type AccountNetworkMode = 'single' | 'multi';

/**
 * Determine network mode for an account type.
 * Real accounts use multi-network (5 chains), test accounts are single-network (Sepolia).
 */
export function getAccountNetworkMode(accountType: AccountType): AccountNetworkMode {
  return accountType === 'real' ? 'multi' : 'single';
}

/**
 * Build multi-network configs for real accounts.
 * Returns SimpleNetworkConfig for each mainnet chain.
 */
export function buildMultiNetworkConfigs(alchemyKey: string): Record<NetworkId, SimpleNetworkConfig> {
  const result = {} as Record<NetworkId, SimpleNetworkConfig>;
  for (const id of TIER1_NETWORK_IDS) {
    const net = SUPPORTED_NETWORKS[id];
    const rpcUrl = net.rpcUrlTemplate.replace('{apiKey}', alchemyKey);
    result[id] = {
      name: net.name,
      chainId: net.chainId,
      rpcUrl,
      explorerUrl: net.blockExplorer,
      explorerTxUrl: (hash: string) => `${net.blockExplorer}/tx/${hash}`,
      explorerAddressUrl: (address: string) => `${net.blockExplorer}/address/${address}`,
      symbol: net.nativeCurrency.symbol,
    };
  }
  return result;
}
