import type { Network } from './rpcUrls';

export interface TokenInfo {
  name: string;
  symbol: string;
  address: string; // mainnet address by default
  decimals: number;
  logoUri: string;
  networks?: Partial<Record<Network, string>>; // optional per-network overrides
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48', // Ethereum mainnet
    decimals: 6,
    logoUri: 'https://assets.coingecko.com/coins/images/6319/thumb/usdc.png',
    networks: {
      mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48',
      // Sepolia: No official USDC on testnet
    },
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum mainnet
    decimals: 6,
    logoUri: 'https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png',
    networks: {
      mainnet: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      // Sepolia: No official USDT on testnet
    },
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum mainnet
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png',
    networks: {
      mainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      // Sepolia: No official DAI on testnet
    },
  },
  // Sepolia testnet tokens (for testing purposes)
  {
    name: 'ChainLink Token',
    symbol: 'LINK',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Mainnet
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png',
    networks: {
      mainnet: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      sepolia: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Sepolia LINK
    },
  },
];

export function getTokenAddressForNetwork(token: TokenInfo, network: Network): string | null {
  if (token.networks && token.networks[network]) return token.networks[network] || null;
  if (network === 'mainnet') return token.address;
  return null; // no default address for non-mainnet unless specified
}
