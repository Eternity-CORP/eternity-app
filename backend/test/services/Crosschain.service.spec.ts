import { Test, TestingModule } from '@nestjs/testing';
import { CrosschainService } from '../../src/services/Crosschain.service';
import { ICrosschainRouter } from '../../src/interfaces/CrosschainRouter.interface';
import { CrosschainQuote, CrosschainQuoteParams } from '../../src/types/crosschain.types';

describe('CrosschainService', () => {
  let service: CrosschainService;

  // Mock router implementation
  const createMockRouter = (name: string, supportedChainTypes: string[]): ICrosschainRouter => ({
    name,
    supportedChainTypes,
    getQuote: jest.fn().mockResolvedValue({
      estimatedOutput: '1000000',
      fee: '10000',
      feeToken: 'USDC',
      route: {
        id: `route-${name}-1`,
        fromChain: { id: 'ethereum', name: 'Ethereum', chainType: 'EVM' },
        toChain: { id: 'polygon', name: 'Polygon', chainType: 'EVM' },
        fromToken: { address: '0x...', symbol: 'USDC', decimals: 6, chainId: 'ethereum' },
        toToken: { address: '0x...', symbol: 'USDC', decimals: 6, chainId: 'polygon' },
        steps: [],
      },
      durationSeconds: 300,
    } as CrosschainQuote),
    prepareTransaction: jest.fn().mockResolvedValue({
      to: '0x...',
      data: '0x...',
      value: '0',
      chainId: 'ethereum',
    }),
    getTransactionStatus: jest.fn().mockResolvedValue({
      status: 'completed',
      fromTxHash: '0x...',
      toTxHash: '0x...',
    }),
    supportsRoute: jest.fn().mockResolvedValue(true),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrosschainService],
    }).compile();

    service = module.get<CrosschainService>(CrosschainService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have no routers initially', () => {
      const routers = service.getAvailableRouters();
      expect(routers).toEqual([]);
    });
  });

  describe('registerRouter', () => {
    it('should register a router', () => {
      const mockRouter = createMockRouter('TestRouter', ['EVM']);
      
      service.registerRouter(mockRouter);
      
      const routers = service.getAvailableRouters();
      expect(routers).toContain('TestRouter');
    });

    it('should register multiple routers', () => {
      const router1 = createMockRouter('Router1', ['EVM']);
      const router2 = createMockRouter('Router2', ['EVM', 'SVM']);
      
      service.registerRouter(router1);
      service.registerRouter(router2);
      
      const routers = service.getAvailableRouters();
      expect(routers).toHaveLength(2);
      expect(routers).toContain('Router1');
      expect(routers).toContain('Router2');
    });
  });

  describe('getQuote', () => {
    const quoteParams: CrosschainQuoteParams = {
      fromChainId: 'ethereum',
      toChainId: 'polygon',
      fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      amount: '1000000',
      fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    };

    it('should throw error when no routers available', async () => {
      await expect(service.getQuote(quoteParams))
        .rejects.toThrow('No router available');
    });

    it('should get quote from registered router', async () => {
      const mockRouter = createMockRouter('LI.FI', ['EVM']);
      service.registerRouter(mockRouter);

      const quote = await service.getQuote(quoteParams);

      expect(quote).toBeDefined();
      expect(quote.estimatedOutput).toBe('1000000');
      expect(mockRouter.getQuote).toHaveBeenCalledWith(quoteParams);
    });
  });

  describe('getAllQuotes', () => {
    const quoteParams: CrosschainQuoteParams = {
      fromChainId: 'ethereum',
      toChainId: 'polygon',
      fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      amount: '1000000',
      fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    };

    it('should get quotes from multiple routers', async () => {
      const router1 = createMockRouter('Router1', ['EVM']);
      const router2 = createMockRouter('Router2', ['EVM']);
      
      // Make router2 return better output
      (router2.getQuote as jest.Mock).mockResolvedValue({
        estimatedOutput: '1100000', // Better
        fee: '5000',
        feeToken: 'USDC',
        route: { id: 'route-2' },
        durationSeconds: 200,
      });

      service.registerRouter(router1);
      service.registerRouter(router2);

      const quotes = await service.getAllQuotes(quoteParams);

      expect(quotes).toHaveLength(2);
      expect(router1.getQuote).toHaveBeenCalled();
      expect(router2.getQuote).toHaveBeenCalled();
      // Should be sorted by output (best first)
      expect(quotes[0].quote.estimatedOutput).toBe('1100000');
    });

    it('should handle router errors gracefully', async () => {
      const workingRouter = createMockRouter('Working', ['EVM']);
      const failingRouter = createMockRouter('Failing', ['EVM']);
      
      (failingRouter.getQuote as jest.Mock).mockRejectedValue(new Error('API Error'));

      service.registerRouter(workingRouter);
      service.registerRouter(failingRouter);

      const quotes = await service.getAllQuotes(quoteParams);

      // Should still get quote from working router
      expect(quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw when no routers return quotes', async () => {
      await expect(service.getAllQuotes(quoteParams))
        .rejects.toThrow('No quotes available');
    });
  });

  describe('prepareTransaction', () => {
    it('should prepare transaction from registered router', async () => {
      const mockRouter = createMockRouter('TestRouter', ['EVM']);
      service.registerRouter(mockRouter);

      const txData = await service.prepareTransaction('TestRouter', {
        routeId: 'route-1',
        fromAddress: '0x...',
        toAddress: '0x...',
      });

      expect(txData).toBeDefined();
      expect(txData.to).toBeDefined();
      expect(txData.data).toBeDefined();
      expect(mockRouter.prepareTransaction).toHaveBeenCalled();
    });

    it('should throw error for non-existent router', async () => {
      await expect(
        service.prepareTransaction('NonExistent', {
          routeId: 'route-1',
          fromAddress: '0x...',
          toAddress: '0x...',
        })
      ).rejects.toThrow('Router NonExistent not found');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get status from registered router', async () => {
      const mockRouter = createMockRouter('TestRouter', ['EVM']);
      service.registerRouter(mockRouter);

      const status = await service.getTransactionStatus('TestRouter', '0xTxHash');

      expect(status).toBeDefined();
      expect(status.status).toBe('completed');
      expect(mockRouter.getTransactionStatus).toHaveBeenCalledWith('0xTxHash');
    });

    it('should throw error for non-existent router', async () => {
      await expect(
        service.getTransactionStatus('NonExistent', '0xTxHash')
      ).rejects.toThrow('Router NonExistent not found');
    });
  });

  describe('supportsRoute', () => {
    it('should return true when router supports route', async () => {
      const mockRouter = createMockRouter('LI.FI', ['EVM']);
      service.registerRouter(mockRouter);

      const supports = await service.supportsRoute('ethereum', 'polygon');
      
      expect(supports).toBe(true);
    });

    it('should return false when no router supports route', async () => {
      const supports = await service.supportsRoute('ethereum', 'polygon');
      
      expect(supports).toBe(false);
    });
  });

  describe('validation', () => {
    it('should reject same chain transfers', async () => {
      const mockRouter = createMockRouter('LI.FI', ['EVM']);
      service.registerRouter(mockRouter);

      await expect(
        service.getQuote({
          fromChainId: 'ethereum',
          toChainId: 'ethereum', // Same!
          fromTokenAddress: '0x...',
          toTokenAddress: '0x...',
          amount: '1000000',
          fromAddress: '0x...',
          toAddress: '0x...',
        })
      ).rejects.toThrow('fromChainId and toChainId must be different');
    });

    it('should reject invalid amount', async () => {
      const mockRouter = createMockRouter('LI.FI', ['EVM']);
      service.registerRouter(mockRouter);

      await expect(
        service.getQuote({
          fromChainId: 'ethereum',
          toChainId: 'polygon',
          fromTokenAddress: '0x...',
          toTokenAddress: '0x...',
          amount: '0', // Invalid
          fromAddress: '0x...',
          toAddress: '0x...',
        })
      ).rejects.toThrow('amount must be a positive number');
    });

    it('should reject missing addresses', async () => {
      const mockRouter = createMockRouter('LI.FI', ['EVM']);
      service.registerRouter(mockRouter);

      await expect(
        service.getQuote({
          fromChainId: 'ethereum',
          toChainId: 'polygon',
          fromTokenAddress: '0x...',
          toTokenAddress: '0x...',
          amount: '1000000',
          fromAddress: '', // Missing
          toAddress: '0x...',
        })
      ).rejects.toThrow('fromAddress and toAddress are required');
    });
  });
});
