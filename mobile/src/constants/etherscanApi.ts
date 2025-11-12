import { DEFAULT_NETWORK, Network } from '../config/env';

export const ETHERSCAN_API_KEY = process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY || '';

// Etherscan API V2 - unified endpoint for all chains
export const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/v2/api';

// Chain IDs for Etherscan API V2
export const ETHERSCAN_CHAIN_IDS: Record<Network, number> = {
  mainnet: 1,
  sepolia: 11155111,
  holesky: 17000,
};

export const ETHERSCAN_EXPLORER_URLS: Record<Network, string> = {
  mainnet: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
  holesky: 'https://holesky.etherscan.io',
};

export const ENDPOINTS = {
  NORMAL_TX: 'module=account&action=txlist',
  INTERNAL_TX: 'module=account&action=txlistinternal',
  TOKEN_TX: 'module=account&action=tokentx',
};

// Rate limiting and timeouts
export const RATE_LIMIT_REQUESTS_PER_SECOND = 5; // free tier limit
export const REQUEST_TIMEOUT_MS = 10000;
export const RETRY_COUNT = 2;
export const RETRY_BACKOFF_MS = 500; // exponential backoff base

export function getBaseUrl(network: Network = DEFAULT_NETWORK) {
  return ETHERSCAN_BASE_URL;
}

export function getChainId(network: Network = DEFAULT_NETWORK) {
  return ETHERSCAN_CHAIN_IDS[network];
}

export function getExplorerUrl(network: Network = DEFAULT_NETWORK) {
  return ETHERSCAN_EXPLORER_URLS[network];
}
