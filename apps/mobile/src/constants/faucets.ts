/**
 * Faucet Configuration
 * Links to testnet faucets for obtaining test tokens
 */

import { TestnetNetworkId } from './networks-testnet';

export interface FaucetInfo {
  networkId: TestnetNetworkId;
  name: string;
  url: string;
  description: string;
}

/**
 * Faucet links for supported testnet networks
 */
export const FAUCETS: FaucetInfo[] = [
  {
    networkId: 'sepolia',
    name: 'Sepolia ETH',
    url: 'https://sepoliafaucet.com',
    description: 'Get free Sepolia ETH for testing',
  },
  {
    networkId: 'polygon-amoy',
    name: 'Polygon Amoy',
    url: 'https://faucet.polygon.technology',
    description: 'Get free MATIC on Amoy testnet',
  },
  {
    networkId: 'arbitrum-sepolia',
    name: 'Arbitrum Sepolia',
    url: 'https://faucet.arbitrum.io',
    description: 'Get free ETH on Arbitrum Sepolia',
  },
  {
    networkId: 'base-sepolia',
    name: 'Base Sepolia',
    url: 'https://www.alchemy.com/faucets/base-sepolia',
    description: 'Get free ETH on Base Sepolia',
  },
  {
    networkId: 'optimism-sepolia',
    name: 'Optimism Sepolia',
    url: 'https://www.alchemy.com/faucets/optimism-sepolia',
    description: 'Get free ETH on Optimism Sepolia',
  },
];

/**
 * Get faucet info for a specific testnet network
 * @param networkId - The testnet network ID
 * @returns FaucetInfo if found, undefined otherwise
 */
export function getFaucetForNetwork(networkId: TestnetNetworkId): FaucetInfo | undefined {
  return FAUCETS.find((f) => f.networkId === networkId);
}

/**
 * Get faucet info by network ID string (for more flexible lookups)
 * @param networkId - Network ID as string
 * @returns FaucetInfo if found, undefined otherwise
 */
export function getFaucetByNetworkId(networkId: string): FaucetInfo | undefined {
  return FAUCETS.find((f) => f.networkId === networkId);
}

/**
 * Check if a faucet is available for a network
 * @param networkId - Network ID to check
 * @returns true if faucet exists for the network
 */
export function hasFaucet(networkId: string): boolean {
  return FAUCETS.some((f) => f.networkId === networkId);
}

/**
 * Get all available faucets
 * @returns Array of all faucet info
 */
export function getAllFaucets(): FaucetInfo[] {
  return [...FAUCETS];
}
