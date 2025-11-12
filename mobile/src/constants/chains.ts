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
