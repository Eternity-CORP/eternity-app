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
} from '../config/env';

export type Network = 'mainnet' | 'sepolia' | 'holesky';

// Multiple fallback RPC URLs for better reliability
// Ordered by priority (mobile-friendly endpoints first)
// NOTE: PublicNode blocks React Native with "unsupported platform" error
export const rpcFallbacks: Record<Network, string[]> = {
  mainnet: [
    ALCHEMY_MAINNET_URL,
    INFURA_MAINNET_URL,
    PUBLIC_MAINNET_URL,
    'https://rpc.ankr.com/eth',                  // Primary - Ankr (mobile-friendly)
    'https://eth.llamarpc.com',                  // Backup - LlamaNodes
    'https://cloudflare-eth.com',                // Backup - Cloudflare
    'https://ethereum.publicnode.com'            // Backup - PublicNode alternative
  ].filter(Boolean),
  sepolia: [
    ALCHEMY_SEPOLIA_URL,
    INFURA_SEPOLIA_URL,
    PUBLIC_SEPOLIA_URL,
    'https://rpc.sepolia.org',                   // Primary - Ethereum Foundation (reliable)
    'https://ethereum-sepolia-rpc.publicnode.com', // Backup - PublicNode (web-friendly)
    'https://sepolia.gateway.tenderly.co',       // Backup - Tenderly
    'https://rpc2.sepolia.org',                  // Backup - Ethereum Foundation #2
    'https://rpc-sepolia.rockx.com'              // Backup - RockX
  ].filter(Boolean),
  holesky: [
    ALCHEMY_HOLESKY_URL,
    INFURA_HOLESKY_URL,
    PUBLIC_HOLESKY_URL,
    'https://ethereum-holesky-rpc.publicnode.com', // Primary - PublicNode (web-friendly)
    'https://holesky.drpc.org',                  // Backup - dRPC
    'https://1rpc.io/holesky',                   // Backup - 1RPC
    'https://holesky.gateway.tenderly.co',       // Backup - Tenderly
    'https://rpc.holesky.ethpandaops.io'         // Backup - EthPandaOps
  ].filter(Boolean),
};

export const rpcUrls: Record<Network, string> = {
  mainnet: ALCHEMY_MAINNET_URL || INFURA_MAINNET_URL || PUBLIC_MAINNET_URL,
  sepolia: ALCHEMY_SEPOLIA_URL || INFURA_SEPOLIA_URL || PUBLIC_SEPOLIA_URL,
  holesky: ALCHEMY_HOLESKY_URL || INFURA_HOLESKY_URL || PUBLIC_HOLESKY_URL,
};

export const defaultNetwork: Network = DEFAULT_NETWORK;
