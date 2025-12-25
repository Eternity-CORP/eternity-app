import { Test, TestingModule } from '@nestjs/testing';
import { TokenRegistryService } from '../../src/services/TokenRegistry.service';

describe('TokenRegistryService', () => {
  let service: TokenRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenRegistryService],
    }).compile();

    service = module.get<TokenRegistryService>(TokenRegistryService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have supported chains', () => {
      const chains = service.getSupportedChains();
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('sepolia');
    });
  });

  describe('getTokenAddress', () => {
    it('should return USDC address for ethereum', () => {
      const address = service.getTokenAddress('ethereum', 'USDC');
      expect(address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });

    it('should return USDT address for ethereum', () => {
      const address = service.getTokenAddress('ethereum', 'USDT');
      expect(address).toBe('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    });

    it('should return native token address (zero) for ETH', () => {
      const address = service.getTokenAddress('ethereum', 'ETH');
      expect(address).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should return USDC address for polygon', () => {
      const address = service.getTokenAddress('polygon', 'USDC');
      expect(address).toBe('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
    });

    it('should return native address for MATIC on polygon', () => {
      const address = service.getTokenAddress('polygon', 'MATIC');
      expect(address).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should be case-insensitive for chainId', () => {
      const lower = service.getTokenAddress('ethereum', 'USDC');
      const upper = service.getTokenAddress('ETHEREUM', 'USDC');
      const mixed = service.getTokenAddress('Ethereum', 'USDC');
      expect(lower).toBe(upper);
      expect(lower).toBe(mixed);
    });

    it('should be case-insensitive for tokenSymbol', () => {
      const lower = service.getTokenAddress('ethereum', 'usdc');
      const upper = service.getTokenAddress('ethereum', 'USDC');
      expect(lower).toBe(upper);
    });

    it('should return native address for unknown token', () => {
      const address = service.getTokenAddress('ethereum', 'UNKNOWN_TOKEN');
      expect(address).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should return native address for unknown chain', () => {
      const address = service.getTokenAddress('unknown_chain', 'USDC');
      expect(address).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  describe('getTokenInfo', () => {
    it('should return full token info for USDC', () => {
      const info = service.getTokenInfo('ethereum', 'USDC');
      expect(info).toBeDefined();
      expect(info?.symbol).toBe('USDC');
      expect(info?.decimals).toBe(6);
      expect(info?.isNative).toBe(false);
    });

    it('should return native token info for ETH', () => {
      const info = service.getTokenInfo('ethereum', 'ETH');
      expect(info).toBeDefined();
      expect(info?.symbol).toBe('ETH');
      expect(info?.decimals).toBe(18);
      expect(info?.isNative).toBe(true);
    });

    it('should return null for unknown token', () => {
      const info = service.getTokenInfo('ethereum', 'UNKNOWN');
      expect(info).toBeNull();
    });

    it('should return null for unknown chain', () => {
      const info = service.getTokenInfo('unknown', 'USDC');
      expect(info).toBeNull();
    });
  });

  describe('isNativeToken', () => {
    it('should return true for ETH on ethereum', () => {
      expect(service.isNativeToken('ethereum', 'ETH')).toBe(true);
    });

    it('should return true for MATIC on polygon', () => {
      expect(service.isNativeToken('polygon', 'MATIC')).toBe(true);
    });

    it('should return false for USDC on ethereum', () => {
      expect(service.isNativeToken('ethereum', 'USDC')).toBe(false);
    });

    it('should return false for unknown chain', () => {
      expect(service.isNativeToken('unknown', 'ETH')).toBe(false);
    });
  });

  describe('getTokenDecimals', () => {
    it('should return 6 for USDC', () => {
      expect(service.getTokenDecimals('ethereum', 'USDC')).toBe(6);
    });

    it('should return 18 for ETH', () => {
      expect(service.getTokenDecimals('ethereum', 'ETH')).toBe(18);
    });

    it('should return 18 as default for unknown token', () => {
      expect(service.getTokenDecimals('ethereum', 'UNKNOWN')).toBe(18);
    });
  });

  describe('isChainSupported', () => {
    it('should return true for ethereum', () => {
      expect(service.isChainSupported('ethereum')).toBe(true);
    });

    it('should return true for polygon', () => {
      expect(service.isChainSupported('polygon')).toBe(true);
    });

    it('should return true for testnets', () => {
      expect(service.isChainSupported('sepolia')).toBe(true);
      expect(service.isChainSupported('holesky')).toBe(true);
    });

    it('should return false for unknown chain', () => {
      expect(service.isChainSupported('unknown_chain')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(service.isChainSupported('ETHEREUM')).toBe(true);
      expect(service.isChainSupported('Polygon')).toBe(true);
    });
  });

  describe('getChainTokens', () => {
    it('should return chain tokens for ethereum', () => {
      const chainTokens = service.getChainTokens('ethereum');
      expect(chainTokens).toBeDefined();
      expect(chainTokens?.chainId).toBe('ethereum');
      expect(chainTokens?.nativeToken.symbol).toBe('ETH');
      expect(chainTokens?.tokens.length).toBeGreaterThan(0);
    });

    it('should return null for unknown chain', () => {
      const chainTokens = service.getChainTokens('unknown');
      expect(chainTokens).toBeNull();
    });
  });

  describe('getNativeTokenAddress', () => {
    it('should return zero address', () => {
      expect(service.getNativeTokenAddress()).toBe('0x0000000000000000000000000000000000000000');
    });
  });
});
