// Ethereum RPC URLs with support for Alchemy/Infura via env vars and public fallbacks
// Replace placeholders or set env vars for production usage.

import {
  DEFAULT_NETWORK,
  ALCHEMY_MAINNET_URL,
  ALCHEMY_SEPOLIA_URL,
  ALCHEMY_HOLESKY_URL,
  INFURA_MAINNET_URL,
  INFURA_SEPOLIA_URL,
  INFURA_HOLESKY_URL,
  PUBLIC_MAINNET_URL,
  PUBLIC_SEPOLIA_URL,
  PUBLIC_HOLESKY_URL,
  ANKR_API_KEY,
} from '../config/env';

export type Network = 'mainnet' | 'sepolia' | 'holesky';

/**
 * Filter out problematic RPC URLs
 * - PublicNode blocks React Native with 403
 * - Alchemy Holesky is not supported (returns "Unsupported network: ETH_HOLESKY")
 */
function filterProblematicUrls(url: string | undefined): boolean {
  if (!url) return false;
  
  // Block PublicNode (blocks React Native)
  if (url.includes('publicnode.com')) {
    return false;
  }
  
  // Block Alchemy Holesky (not supported)
  if (url.includes('alchemy.com') && url.includes('holesky')) {
    return false;
  }
  
  return true;
}

/**
 * Append Ankr API key to Ankr RPC URLs
 * Ankr requires the API key as a query parameter: ?apikey=YOUR_KEY
 */
export function addAnkrApiKey(url: string): string {
  if (!url || !url.includes('rpc.ankr.com')) {
    return url;
  }

  if (!ANKR_API_KEY) {
    return url;
  }

  // Check if URL already has query parameters
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}apikey=${ANKR_API_KEY}`;
}

// Multiple fallback RPC URLs for better reliability
// Ordered by priority (mobile-friendly endpoints first)
// ⚠️ IMPORTANT: PublicNode blocks React Native with 403 "unsupported platform" - DO NOT USE!
export const rpcFallbacks: Record<Network, string[]> = {
  mainnet: [
    ALCHEMY_MAINNET_URL,
    INFURA_MAINNET_URL,
    PUBLIC_MAINNET_URL,
    'https://eth.llamarpc.com',                  // Primary - LlamaNodes (reliable, no API key)
    'https://cloudflare-eth.com',                // Backup - Cloudflare (reliable, no API key)
    'https://1rpc.io/eth',                       // Backup - 1RPC (mobile-friendly)
    'https://rpc.ankr.com/eth',                  // Last resort - Ankr (API key configured)
    // PublicNode removed - blocks React Native
  ].filter(filterProblematicUrls),
  sepolia: [
    ALCHEMY_SEPOLIA_URL,
    INFURA_SEPOLIA_URL,
    PUBLIC_SEPOLIA_URL,
    'https://rpc.sepolia.org',                   // Primary - Ethereum Foundation (official, reliable)
    'https://rpc2.sepolia.org',                  // Backup - Ethereum Foundation #2
    'https://sepolia.gateway.tenderly.co',       // Backup - Tenderly
    'https://1rpc.io/sepolia',                   // Backup - 1RPC (mobile-friendly)
    'https://rpc.ankr.com/eth_sepolia',          // Last resort - Ankr (API key configured)
    // PublicNode removed - blocks React Native
  ].filter(filterProblematicUrls),
  holesky: [
    // Alchemy does not support Holesky - removed to avoid errors
    INFURA_HOLESKY_URL,
    PUBLIC_HOLESKY_URL,
    'https://holesky.drpc.org',                  // Primary - dRPC (reliable, no API key needed)
    'https://rpc.holesky.ethpandaops.io',        // Backup - EthPandaOps (community-run, reliable)
    'https://1rpc.io/holesky',                   // Backup - 1RPC (mobile-friendly)
    'https://holesky.gateway.tenderly.co',       // Backup - Tenderly
    'https://rpc.ankr.com/eth_holesky',          // Last resort - Ankr (API key configured)
    // PublicNode removed - blocks React Native with 403
    // Alchemy removed - does not support Holesky network
  ].filter(filterProblematicUrls),
};

export const rpcUrls: Record<Network, string> = {
  mainnet: ALCHEMY_MAINNET_URL || INFURA_MAINNET_URL || PUBLIC_MAINNET_URL,
  sepolia: ALCHEMY_SEPOLIA_URL || INFURA_SEPOLIA_URL || PUBLIC_SEPOLIA_URL,
  holesky: INFURA_HOLESKY_URL || PUBLIC_HOLESKY_URL, // Alchemy does not support Holesky
};

export const defaultNetwork: Network = DEFAULT_NETWORK;
