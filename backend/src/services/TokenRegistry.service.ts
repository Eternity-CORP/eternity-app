import { Injectable, Logger } from '@nestjs/common';

/**
 * Token Registry Service
 * Централизованный реестр токенов для всех поддерживаемых сетей
 * 
 * Используется для:
 * - Получения адресов токенов по chainId и symbol
 * - Валидации поддерживаемых токенов
 * - Определения native токенов
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  isNative: boolean;
  logoUri?: string;
}

export interface ChainTokens {
  chainId: string;
  chainName: string;
  nativeToken: TokenInfo;
  tokens: TokenInfo[];
}

// Zero address for native tokens
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

@Injectable()
export class TokenRegistryService {
  private readonly logger = new Logger(TokenRegistryService.name);
  
  // Registry of all supported chains and tokens
  private readonly registry: Map<string, ChainTokens> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Initialize the token registry with all supported chains
   */
  private initializeRegistry(): void {
    // Ethereum Mainnet
    this.registry.set('ethereum', {
      chainId: 'ethereum',
      chainName: 'Ethereum',
      nativeToken: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          isNative: false,
        },
        {
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          address: '0x6B175474E89094C44Da98b954EescdeCB5166F6f',
          isNative: false,
        },
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          isNative: false,
        },
      ],
    });

    // Also register as 'mainnet' alias
    this.registry.set('mainnet', this.registry.get('ethereum')!);

    // Polygon
    this.registry.set('polygon', {
      chainId: 'polygon',
      chainName: 'Polygon',
      nativeToken: {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          isNative: false,
        },
        {
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
          isNative: false,
        },
        {
          symbol: 'WMATIC',
          name: 'Wrapped MATIC',
          decimals: 18,
          address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          isNative: false,
        },
      ],
    });

    // Arbitrum
    this.registry.set('arbitrum', {
      chainId: 'arbitrum',
      chainName: 'Arbitrum One',
      nativeToken: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          isNative: false,
        },
        {
          symbol: 'ARB',
          name: 'Arbitrum',
          decimals: 18,
          address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
          isNative: false,
        },
      ],
    });

    // Optimism
    this.registry.set('optimism', {
      chainId: 'optimism',
      chainName: 'Optimism',
      nativeToken: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
          isNative: false,
        },
        {
          symbol: 'OP',
          name: 'Optimism',
          decimals: 18,
          address: '0x4200000000000000000000000000000000000042',
          isNative: false,
        },
      ],
    });

    // Base
    this.registry.set('base', {
      chainId: 'base',
      chainName: 'Base',
      nativeToken: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          isNative: false,
        },
        {
          symbol: 'USDbC',
          name: 'USD Base Coin',
          decimals: 6,
          address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
          isNative: false,
        },
      ],
    });

    // BSC (Binance Smart Chain)
    this.registry.set('bsc', {
      chainId: 'bsc',
      chainName: 'BNB Chain',
      nativeToken: {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 18,
          address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 18,
          address: '0x55d398326f99059fF775485246999027B3197955',
          isNative: false,
        },
        {
          symbol: 'BUSD',
          name: 'Binance USD',
          decimals: 18,
          address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          isNative: false,
        },
      ],
    });

    // Avalanche
    this.registry.set('avalanche', {
      chainId: 'avalanche',
      chainName: 'Avalanche',
      nativeToken: {
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          isNative: false,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
          isNative: false,
        },
      ],
    });

    // Testnets
    // Sepolia
    this.registry.set('sepolia', {
      chainId: 'sepolia',
      chainName: 'Sepolia Testnet',
      nativeToken: {
        symbol: 'ETH',
        name: 'Sepolia ETH',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin (Test)',
          decimals: 6,
          address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          isNative: false,
        },
        {
          symbol: 'SEPOLIAETH',
          name: 'Sepolia ETH',
          decimals: 18,
          address: NATIVE_TOKEN_ADDRESS,
          isNative: true,
        },
      ],
    });

    // Holesky
    this.registry.set('holesky', {
      chainId: 'holesky',
      chainName: 'Holesky Testnet',
      nativeToken: {
        symbol: 'ETH',
        name: 'Holesky ETH',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'HOLESKYETH',
          name: 'Holesky ETH',
          decimals: 18,
          address: NATIVE_TOKEN_ADDRESS,
          isNative: true,
        },
      ],
    });

    // Mumbai (Polygon Testnet)
    this.registry.set('mumbai', {
      chainId: 'mumbai',
      chainName: 'Polygon Mumbai',
      nativeToken: {
        symbol: 'MATIC',
        name: 'Test MATIC',
        decimals: 18,
        address: NATIVE_TOKEN_ADDRESS,
        isNative: true,
      },
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin (Test)',
          decimals: 6,
          address: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
          isNative: false,
        },
      ],
    });

    this.logger.log(`TokenRegistry initialized with ${this.registry.size} chains`);
  }

  /**
   * Get token address by chain and symbol
   */
  getTokenAddress(chainId: string, tokenSymbol: string): string {
    const chainLower = chainId.toLowerCase();
    const symbolUpper = tokenSymbol.toUpperCase();

    const chain = this.registry.get(chainLower);
    if (!chain) {
      this.logger.warn(`Chain ${chainId} not found in registry, returning native address`);
      return NATIVE_TOKEN_ADDRESS;
    }

    // Check if it's the native token
    if (chain.nativeToken.symbol === symbolUpper) {
      return chain.nativeToken.address;
    }

    // Search in tokens list
    const token = chain.tokens.find(t => t.symbol === symbolUpper);
    if (token) {
      return token.address;
    }

    // Check for native token aliases (ETH, MATIC, BNB, etc.)
    const nativeAliases = ['ETH', 'MATIC', 'BNB', 'AVAX', 'SEPOLIAETH', 'HOLESKYETH'];
    if (nativeAliases.includes(symbolUpper)) {
      return NATIVE_TOKEN_ADDRESS;
    }

    this.logger.warn(`Token ${tokenSymbol} not found on chain ${chainId}, returning native address`);
    return NATIVE_TOKEN_ADDRESS;
  }

  /**
   * Get full token info
   */
  getTokenInfo(chainId: string, tokenSymbol: string): TokenInfo | null {
    const chainLower = chainId.toLowerCase();
    const symbolUpper = tokenSymbol.toUpperCase();

    const chain = this.registry.get(chainLower);
    if (!chain) {
      return null;
    }

    // Check native token
    if (chain.nativeToken.symbol === symbolUpper) {
      return chain.nativeToken;
    }

    // Search in tokens
    return chain.tokens.find(t => t.symbol === symbolUpper) || null;
  }

  /**
   * Check if token is native for the chain
   */
  isNativeToken(chainId: string, tokenSymbol: string): boolean {
    const chainLower = chainId.toLowerCase();
    const symbolUpper = tokenSymbol.toUpperCase();

    const chain = this.registry.get(chainLower);
    if (!chain) {
      return false;
    }

    return chain.nativeToken.symbol === symbolUpper;
  }

  /**
   * Get all tokens for a chain
   */
  getChainTokens(chainId: string): ChainTokens | null {
    return this.registry.get(chainId.toLowerCase()) || null;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if chain is supported
   */
  isChainSupported(chainId: string): boolean {
    return this.registry.has(chainId.toLowerCase());
  }

  /**
   * Get token decimals
   */
  getTokenDecimals(chainId: string, tokenSymbol: string): number {
    const token = this.getTokenInfo(chainId, tokenSymbol);
    return token?.decimals ?? 18; // Default to 18 decimals
  }

  /**
   * Get native token address constant
   */
  getNativeTokenAddress(): string {
    return NATIVE_TOKEN_ADDRESS;
  }
}
