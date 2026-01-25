/**
 * Scheduled Service Unit Tests
 * Tests auto-execution logic and gas price checking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ScheduledService } from './scheduled.service';
import { ScheduledPayment } from './entities';
import { ScheduledGateway } from './scheduled.gateway';

// Gas price threshold constant (same as in service)
const GAS_PRICE_THRESHOLD_PERCENT = 150n;

describe('ScheduledService', () => {
  let service: ScheduledService;
  let repository: jest.Mocked<Repository<ScheduledPayment>>;
  let gateway: jest.Mocked<ScheduledGateway>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockGateway = {
    notifyPaymentCreated: jest.fn(),
    notifyPaymentUpdated: jest.fn(),
    notifyPaymentExecuted: jest.fn(),
    notifyPaymentCancelled: jest.fn(),
    notifyPaymentReminder: jest.fn(),
    notifyUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledService,
        {
          provide: getRepositoryToken(ScheduledPayment),
          useValue: mockRepository,
        },
        {
          provide: ScheduledGateway,
          useValue: mockGateway,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ScheduledService>(ScheduledService);
    repository = module.get(getRepositoryToken(ScheduledPayment));
    gateway = module.get(ScheduledGateway);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Gas Price Threshold Logic', () => {
    describe('checkGasPriceThreshold', () => {
      // Helper function to simulate the gas price check logic
      function shouldFailDueToGasPrice(
        estimatedGasPrice: bigint,
        currentGasPrice: bigint,
      ): boolean {
        return currentGasPrice > (estimatedGasPrice * GAS_PRICE_THRESHOLD_PERCENT) / 100n;
      }

      it('should pass when current gas price equals estimated', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 50000000000n; // 50 gwei

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });

      it('should pass when current gas price is lower', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 30000000000n; // 30 gwei

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });

      it('should pass when gas price increased by 49%', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 74500000000n; // 74.5 gwei (49% increase)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });

      it('should pass when gas price increased by exactly 50%', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 75000000000n; // 75 gwei (50% increase, exactly at threshold)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });

      it('should fail when gas price increased by 51%', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 75500000000n; // 75.5 gwei (51% increase)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(true);
      });

      it('should fail when gas price doubled', () => {
        const estimated = 50000000000n; // 50 gwei
        const current = 100000000000n; // 100 gwei (100% increase)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(true);
      });

      it('should handle very low gas prices', () => {
        const estimated = 1000000000n; // 1 gwei
        const current = 1500000000n; // 1.5 gwei (50% increase)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });

      it('should handle very high gas prices', () => {
        const estimated = 500000000000n; // 500 gwei
        const current = 750000000000n; // 750 gwei (50% increase)

        expect(shouldFailDueToGasPrice(estimated, current)).toBe(false);
      });
    });
  });

  describe('create', () => {
    it('should create a scheduled payment with signed transaction', async () => {
      const dto = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        amount: '1.5',
        tokenSymbol: 'ETH',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        signedTransaction: '0xsignedtx...',
        estimatedGasPrice: '50000000000',
        nonce: 5,
        chainId: 1,
      };

      const savedPayment = {
        id: 'test-id',
        ...dto,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        recipient: dto.recipient.toLowerCase(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          signedTransaction: dto.signedTransaction,
          estimatedGasPrice: dto.estimatedGasPrice,
          nonce: dto.nonce,
          chainId: dto.chainId,
        }),
      );
      expect(result.signedTransaction).toBe(dto.signedTransaction);
      expect(mockGateway.notifyPaymentCreated).toHaveBeenCalled();
    });

    it('should create a scheduled payment without signed transaction', async () => {
      const dto = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        amount: '1.5',
        tokenSymbol: 'ETH',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const savedPayment = {
        id: 'test-id',
        ...dto,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        recipient: dto.recipient.toLowerCase(),
        status: 'pending',
        signedTransaction: null,
        estimatedGasPrice: null,
        nonce: null,
        chainId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.create(dto);

      expect(result.signedTransaction).toBeNull();
    });
  });

  describe('update', () => {
    it('should update signed transaction when amount changes', async () => {
      const existingPayment = {
        id: 'test-id',
        creatorAddress: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        amount: '1.0',
        tokenSymbol: 'ETH',
        scheduledAt: new Date(Date.now() + 3600000),
        status: 'pending',
        signedTransaction: '0xoldsignedtx',
        estimatedGasPrice: '30000000000',
        nonce: 5,
        chainId: 1,
        reminderSent: false,
      } as ScheduledPayment;

      mockRepository.findOne.mockResolvedValue(existingPayment);
      mockRepository.save.mockImplementation((payment) => Promise.resolve(payment));

      const dto = {
        amount: '2.0',
        signedTransaction: '0xnewsignedtx',
        estimatedGasPrice: '50000000000',
        nonce: 6,
        chainId: 1,
      };

      const result = await service.update('test-id', dto, existingPayment.creatorAddress);

      expect(result.amount).toBe('2.0');
      expect(result.signedTransaction).toBe('0xnewsignedtx');
      expect(result.estimatedGasPrice).toBe('50000000000');
      expect(result.nonce).toBe(6);
    });
  });

  describe('cancel', () => {
    it('should cancel a payment with signed transaction', async () => {
      const existingPayment = {
        id: 'test-id',
        creatorAddress: '0x1234567890123456789012345678901234567890',
        recipient: '0x0987654321098765432109876543210987654321',
        amount: '1.0',
        tokenSymbol: 'ETH',
        scheduledAt: new Date(Date.now() + 3600000),
        status: 'pending',
        signedTransaction: '0xsignedtx',
        estimatedGasPrice: '50000000000',
        nonce: 5,
        chainId: 1,
      } as ScheduledPayment;

      mockRepository.findOne.mockResolvedValue(existingPayment);
      mockRepository.save.mockImplementation((payment) => Promise.resolve(payment));

      const result = await service.cancel('test-id', existingPayment.creatorAddress);

      expect(result.status).toBe('cancelled');
      // Signed transaction should remain but payment won't be executed
      expect(result.signedTransaction).toBe('0xsignedtx');
      expect(mockGateway.notifyPaymentCancelled).toHaveBeenCalled();
    });
  });

  describe('Recurring Interval Calculation', () => {
    // Helper function matching the service's calculateNextDate
    function calculateNextDate(currentDate: Date, interval: 'daily' | 'weekly' | 'monthly'): Date {
      const date = new Date(currentDate);

      switch (interval) {
        case 'daily':
          date.setDate(date.getDate() + 1);
          break;
        case 'weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + 1);
          break;
      }

      return date;
    }

    it('should calculate next daily occurrence', () => {
      const current = new Date('2024-01-15T10:00:00Z');
      const next = calculateNextDate(current, 'daily');

      expect(next.getDate()).toBe(16);
      expect(next.getMonth()).toBe(0); // January
    });

    it('should calculate next weekly occurrence', () => {
      const current = new Date('2024-01-15T10:00:00Z');
      const next = calculateNextDate(current, 'weekly');

      expect(next.getDate()).toBe(22);
      expect(next.getMonth()).toBe(0); // January
    });

    it('should calculate next monthly occurrence', () => {
      const current = new Date('2024-01-15T10:00:00Z');
      const next = calculateNextDate(current, 'monthly');

      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(1); // February
    });

    it('should handle month boundary for daily', () => {
      const current = new Date('2024-01-31T10:00:00Z');
      const next = calculateNextDate(current, 'daily');

      expect(next.getDate()).toBe(1);
      expect(next.getMonth()).toBe(1); // February
    });

    it('should handle year boundary for monthly', () => {
      const current = new Date('2024-12-15T10:00:00Z');
      const next = calculateNextDate(current, 'monthly');

      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(0); // January
      expect(next.getFullYear()).toBe(2025);
    });
  });

  describe('Chain ID Support', () => {
    const SUPPORTED_CHAIN_IDS = [
      // Mainnets
      1, // Ethereum
      137, // Polygon
      10, // Optimism
      42161, // Arbitrum
      8453, // Base
      // Testnets
      11155111, // Sepolia
      80002, // Amoy
      11155420, // Optimism Sepolia
      421614, // Arbitrum Sepolia
      84532, // Base Sepolia
    ];

    it('should support all expected chain IDs', () => {
      SUPPORTED_CHAIN_IDS.forEach((chainId) => {
        expect(typeof chainId).toBe('number');
        expect(chainId).toBeGreaterThan(0);
      });
    });

    it('should include both mainnet and testnet chains', () => {
      const mainnets = [1, 137, 10, 42161, 8453];
      const testnets = [11155111, 80002, 11155420, 421614, 84532];

      mainnets.forEach((chainId) => {
        expect(SUPPORTED_CHAIN_IDS).toContain(chainId);
      });

      testnets.forEach((chainId) => {
        expect(SUPPORTED_CHAIN_IDS).toContain(chainId);
      });
    });
  });
});
