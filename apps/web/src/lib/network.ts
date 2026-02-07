import type { AccountType } from './account-storage'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

export interface NetworkConfig {
  name: string
  chainId: number
  rpcUrl: string
  explorerUrl: string
  explorerTxUrl: (hash: string) => string
  explorerAddressUrl: (address: string) => string
  symbol: string
}

const NETWORKS: Record<AccountType, NetworkConfig> = {
  test: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerTxUrl: (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address: string) => `https://sepolia.etherscan.io/address/${address}`,
    symbol: 'ETH',
  },
  real: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    explorerUrl: 'https://etherscan.io',
    explorerTxUrl: (hash: string) => `https://etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address: string) => `https://etherscan.io/address/${address}`,
    symbol: 'ETH',
  },
}

export function getNetwork(type: AccountType): NetworkConfig {
  return NETWORKS[type]
}
