import type { Network } from './rpcUrls';

export interface TokenInfo {
  name: string;
  symbol: string;
  address: string; // mainnet address by default
  decimals: number;
  logoUri: string;
  networks?: Partial<Record<Network, string>>; // optional per-network overrides
}

// Helper function to get high-quality token logo URL
// Uses CoinGecko large images for better quality, with fallback to thumb
function getTokenLogo(symbol: string, coinGeckoId: string): string {
  // Use large images for better quality (256x256 instead of thumb which is ~50x50)
  return `https://assets.coingecko.com/coins/images/${coinGeckoId}/large/${symbol.toLowerCase()}.png`;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48', // Ethereum mainnet
    decimals: 6,
    logoUri: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', // High quality
    networks: {
      mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48',
      sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    },
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum mainnet
    decimals: 6,
    logoUri: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png', // High quality
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
    logoUri: 'https://assets.coingecko.com/coins/images/9956/large/4943.png', // High quality
    networks: {
      mainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      sepolia: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', // Sepolia DAI
    },
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Mainnet
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/2518/large/weth.png', // High quality
    networks: {
      mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      sepolia: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
    },
  },
  // Sepolia testnet tokens (for testing purposes)
  {
    name: 'ChainLink Token',
    symbol: 'LINK',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Mainnet
    decimals: 18,
    logoUri: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png', // High quality
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
