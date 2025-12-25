// Supported chains configuration
// Uses env-configured RPC URLs with sensible public fallbacks.

import {
  ALCHEMY_MAINNET_URL,
  ALCHEMY_SEPOLIA_URL,
  ALCHEMY_HOLESKY_URL,
  INFURA_MAINNET_URL,
  INFURA_SEPOLIA_URL,
  INFURA_HOLESKY_URL,
  PUBLIC_MAINNET_URL,
  PUBLIC_SEPOLIA_URL,
  PUBLIC_HOLESKY_URL,
} from '../config/env';

export type Chain = {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  explorerUrl: string;
  testnet: boolean;
};

export const SUPPORTED_CHAINS: Chain[] = [
  {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: ALCHEMY_MAINNET_URL || INFURA_MAINNET_URL || PUBLIC_MAINNET_URL,
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
    testnet: false,
  },
  {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: ALCHEMY_SEPOLIA_URL || INFURA_SEPOLIA_URL || PUBLIC_SEPOLIA_URL,
    symbol: 'SepoliaETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    testnet: true,
  },
  {
    chainId: 17000,
    name: 'Holesky Testnet',
    rpcUrl: ALCHEMY_HOLESKY_URL || INFURA_HOLESKY_URL || PUBLIC_HOLESKY_URL,
    symbol: 'HoleskyETH',
    explorerUrl: 'https://holesky.etherscan.io',
    testnet: true,
  },
];

// For development use Sepolia by default
export const DEFAULT_CHAIN_ID = 11155111;

export function getChainById(chainId: number): Chain | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}

/**
 * Chain display metadata for UI (bilingual support)
 */
export interface ChainInfo {
  id: string;
  name: string;
  nameRu: string; // Russian name for bilingual UI
  icon: string;
  color: string; // Primary color for this chain
}

/**
 * Chain metadata for wallet preferences UI (bilingual)
 */
export const CHAIN_METADATA: ChainInfo[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    nameRu: 'Ethereum',
    icon: '⟠',
    color: '#627EEA',
  },
  {
    id: 'mainnet',
    name: 'Mainnet',
    nameRu: 'Mainnet',
    icon: '🔷',
    color: '#627EEA',
  },
  {
    id: 'sepolia',
    name: 'Sepolia',
    nameRu: 'Sepolia',
    icon: '🧪',
    color: '#FB8C00',
  },
  {
    id: 'holesky',
    name: 'Holesky',
    nameRu: 'Holesky',
    icon: '🧪',
    color: '#AB47BC',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    nameRu: 'Polygon',
    icon: '🟣',
    color: '#8247E5',
  },
  {
    id: 'bsc',
    name: 'BSC',
    nameRu: 'BSC',
    icon: '🟡',
    color: '#F3BA2F',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    nameRu: 'Arbitrum',
    icon: '🔵',
    color: '#28A0F0',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    nameRu: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    nameRu: 'Avalanche',
    icon: '🔺',
    color: '#E84142',
  },
  {
    id: 'solana',
    name: 'Solana',
    nameRu: 'Solana',
    icon: '◎',
    color: '#14F195',
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    nameRu: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
  },
];

/**
 * Get chain metadata by ID
 */
export function getChainInfo(chainId: string): ChainInfo | undefined {
  return CHAIN_METADATA.find((c) => c.id.toLowerCase() === chainId.toLowerCase());
}

/**
 * Get chain display name (bilingual with fallback)
 */
export function getChainName(chainId: string, locale: 'en' | 'ru' = 'en'): string {
  const chain = getChainInfo(chainId);
  if (!chain) return chainId.charAt(0).toUpperCase() + chainId.slice(1);
  return locale === 'ru' ? chain.nameRu : chain.name;
}

/**
 * Get chain icon (with fallback)
 */
export function getChainIcon(chainId: string): string {
  const chain = getChainInfo(chainId);
  return chain?.icon || '🔗';
}

/**
 * Get chain color (with fallback)
 */
export function getChainColor(chainId: string): string {
  const chain = getChainInfo(chainId);
  return chain?.color || '#666666';
}
