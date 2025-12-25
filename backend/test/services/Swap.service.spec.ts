import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SwapService } from '../../src/modules/swap/swap.service';
import { SwapExecution, SwapStatus } from '../../src/entities/SwapExecution.entity';
import { LifiRouterService } from '../../src/services/routers/LifiRouter.service';
import { EthereumRpcService } from '../../src/services/EthereumRpc.service';

describe('SwapService', () => {
  let service: SwapService;
  let swapExecutionRepo: jest.Mocked<Repository<SwapExecution>>;
  let lifiRouter: jest.Mocked<LifiRouterService>;
  let ethereumRpc: jest.Mocked<EthereumRpcService>;

  const mockSwapExecution: Partial<SwapExecution> = {
    id: 'exec-123',
    routeId: 'route-123',
    router: 'lifi',
    transactionHash: '0xabc123',
    status: SwapStatus.PENDING,
    fromChainId: 11155111,
    toChainId: 11155111,
    fromTokenAddress: '0xtoken1',
    toTokenAddress: '0xtoken2',
    fromAmount: '1000000000000000000',
    toAmount: '999000000',
  };

  const mockQuote = {
    estimatedOutput: '999000000',
    fee: '1000000',
    feeToken: 'ETH',
    route: {
      id: 'route-123',
      fromChain: { id: 'sepolia', name: 'Sepolia', chainType: 'EVM' },
      toChain: { id: 'sepolia', name: 'Sepolia', chainType: 'EVM' },
      fromToken: { address: '0xtoken1', symbol: 'WETH', decimals: 18, chainId: 'sepolia' },
      toToken: { address: '0xtoken2', symbol: 'USDC', decimals: 6, chainId: 'sepolia' },
      steps: [{ estimatedGas: '150000' }],
    },
    durationSeconds: 30,
  };

  beforeEach(async () => {
    const mockSwapRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLifiRouter = {
      getQuote: jest.fn(),
      prepareTransaction: jest.fn(),
    };

    const mockEthereumRpc = {
      broadcastTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwapService,
        {
          provide: getRepositoryToken(SwapExecution),
          useValue: mockSwapRepo,
        },
        {
          provide: LifiRouterService,
          useValue: mockLifiRouter,
        },
        {
          provide: EthereumRpcService,
          useValue: mockEthereumRpc,
        },
      ],
    }).compile();

    service = module.get<SwapService>(SwapService);
    swapExecutionRepo = module.get(getRepositoryToken(SwapExecution));
    lifiRouter = module.get(LifiRouterService);
    ethereumRpc = module.get(EthereumRpcService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getQuote', () => {
    const quoteRequest = {
      fromChainId: 11155111, // Sepolia
      toChainId: 11155111,
      fromTokenAddress: '0xtoken1',
      toTokenAddress: '0xtoken2',
      amount: '1000000000000000000',
      fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    };

    it('should return quote for valid request', async () => {
      lifiRouter.getQuote.mockResolvedValue(mockQuote as any);

      const result = await service.getQuote(quoteRequest);

      expect(result).toBeDefined();
      expect(result.routeId).toBe('route-123');
      expect(result.router).toBe('lifi');
      expect(result.toAmount).toBe('999000000');
      expect(lifiRouter.getQuote).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported chainId', async () => {
      const invalidRequest = {
        ...quoteRequest,
        fromChainId: 999999, // Unsupported
      };

      await expect(service.getQuote(invalidRequest))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle LiFi router errors', async () => {
      lifiRouter.getQuote.mockRejectedValue(new Error('No routes available'));

      await expect(service.getQuote(quoteRequest))
        .rejects.toThrow(BadRequestException);
    });

    it('should calculate estimated gas from route steps', async () => {
      const quoteWithMultipleSteps = {
        ...mockQuote,
        route: {
          ...mockQuote.route,
          steps: [
            { estimatedGas: '100000' },
            { estimatedGas: '50000' },
          ],
        },
      };
      lifiRouter.getQuote.mockResolvedValue(quoteWithMultipleSteps as any);

      const result = await service.getQuote(quoteRequest);

      expect(result.estimatedGas).toBe('150000'); // 100000 + 50000
    });
  });

  describe('executeSwap', () => {
    const executeRequest = {
      routeId: 'route-123',
      router: 'lifi',
      signedTx: '0xsigned_transaction_data',
    };

    it('should execute swap and return execution details', async () => {
      ethereumRpc.broadcastTransaction.mockResolvedValue('0xnewtxhash');
      swapExecutionRepo.create.mockReturnValue(mockSwapExecution as SwapExecution);
      swapExecutionRepo.save.mockResolvedValue(mockSwapExecution as SwapExecution);

      const result = await service.executeSwap(executeRequest);

      expect(result).toBeDefined();
      expect(result.transactionHash).toBe('0xnewtxhash');
      expect(result.status).toBe(SwapStatus.PENDING);
      expect(ethereumRpc.broadcastTransaction).toHaveBeenCalledWith(executeRequest.signedTx);
      expect(swapExecutionRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if broadcast fails', async () => {
      ethereumRpc.broadcastTransaction.mockRejectedValue(new Error('Broadcast failed'));

      await expect(service.executeSwap(executeRequest))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('should return status for existing execution', async () => {
      swapExecutionRepo.findOne.mockResolvedValue(mockSwapExecution as SwapExecution);

      const result = await service.getStatus('exec-123');

      expect(result).toBeDefined();
      expect(result.executionId).toBe('exec-123');
      expect(result.transactionHash).toBe('0xabc123');
    });

    it('should throw NotFoundException for non-existent execution', async () => {
      swapExecutionRepo.findOne.mockResolvedValue(null);

      await expect(service.getStatus('non-existent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should update status to CONFIRMED when receipt shows success', async () => {
      const pendingExecution = { ...mockSwapExecution, status: SwapStatus.PENDING };
      swapExecutionRepo.findOne.mockResolvedValue(pendingExecution as SwapExecution);
      ethereumRpc.getTransactionReceipt.mockResolvedValue({ status: '0x1' } as any);
      swapExecutionRepo.save.mockResolvedValue({
        ...pendingExecution,
        status: SwapStatus.CONFIRMED,
      } as SwapExecution);

      await service.getStatus('exec-123');

      expect(swapExecutionRepo.save).toHaveBeenCalled();
    });

    it('should update status to FAILED when receipt shows failure', async () => {
      const pendingExecution = { ...mockSwapExecution, status: SwapStatus.PENDING };
      swapExecutionRepo.findOne.mockResolvedValue(pendingExecution as SwapExecution);
      ethereumRpc.getTransactionReceipt.mockResolvedValue({ status: '0x0' } as any);
      swapExecutionRepo.save.mockResolvedValue({
        ...pendingExecution,
        status: SwapStatus.FAILED,
      } as SwapExecution);

      await service.getStatus('exec-123');

      expect(swapExecutionRepo.save).toHaveBeenCalled();
    });

    it('should return existing status for already confirmed execution', async () => {
      const confirmedExecution = { ...mockSwapExecution, status: SwapStatus.CONFIRMED };
      swapExecutionRepo.findOne.mockResolvedValue(confirmedExecution as SwapExecution);

      const status = await service.getStatus('exec-123');

      expect(status.status).toBe(SwapStatus.CONFIRMED);
      // Should not check RPC for already final status
      expect(ethereumRpc.getTransactionReceipt).not.toHaveBeenCalled();
    });

    it('should handle RPC errors gracefully', async () => {
      const pendingExecution = { ...mockSwapExecution, status: SwapStatus.PENDING };
      swapExecutionRepo.findOne.mockResolvedValue(pendingExecution as SwapExecution);
      ethereumRpc.getTransactionReceipt.mockRejectedValue(new Error('RPC error'));

      // Should not throw, just return current status
      const result = await service.getStatus('exec-123');
      expect(result.status).toBe(SwapStatus.PENDING);
    });
  });

  describe('supported chains', () => {
    it('should support Sepolia (11155111)', async () => {
      lifiRouter.getQuote.mockResolvedValue(mockQuote as any);

      const result = await service.getQuote({
        fromChainId: 11155111,
        toChainId: 11155111,
        fromTokenAddress: '0x...',
        toTokenAddress: '0x...',
        amount: '1000',
        fromAddress: '0x...',
      });

      expect(result).toBeDefined();
    });

    it('should support Ethereum mainnet (1)', async () => {
      lifiRouter.getQuote.mockResolvedValue(mockQuote as any);

      const result = await service.getQuote({
        fromChainId: 1,
        toChainId: 1,
        fromTokenAddress: '0x...',
        toTokenAddress: '0x...',
        amount: '1000',
        fromAddress: '0x...',
      });

      expect(result).toBeDefined();
    });

    it('should support Polygon (137)', async () => {
      lifiRouter.getQuote.mockResolvedValue(mockQuote as any);

      const result = await service.getQuote({
        fromChainId: 137,
        toChainId: 137,
        fromTokenAddress: '0x...',
        toTokenAddress: '0x...',
        amount: '1000',
        fromAddress: '0x...',
      });

      expect(result).toBeDefined();
    });
  });
});
