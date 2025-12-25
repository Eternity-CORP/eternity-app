import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlikService } from '../../src/services/Blik.service';
import { PaymentRequest } from '../../src/entities/PaymentRequest.entity';
import { User } from '../../database/entities/user.entity';
import { UserWallet } from '../../src/entities/UserWallet.entity';
import { IdentityResolverService } from '../../src/services/IdentityResolver.service';
import { CrosschainService } from '../../src/services/Crosschain.service';
import { TokenRegistryService } from '../../src/services/TokenRegistry.service';
import { PaymentRequestStatus } from '../../src/types/blik.types';

describe('BlikService', () => {
  let service: BlikService;
  let paymentRequestRepository: jest.Mocked<Repository<PaymentRequest>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let walletRepository: jest.Mocked<Repository<UserWallet>>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    nickname: 'testuser',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  };

  const mockPaymentRequest: Partial<PaymentRequest> = {
    id: 'request-123',
    code: 'ABC123',
    toUserId: 'user-123',
    amount: '0.1',
    tokenSymbol: 'ETH',
    status: PaymentRequestStatus.PENDING,
    expiresAt: new Date(Date.now() + 300000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPaymentRequestRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      })),
      manager: {
        transaction: jest.fn((cb) => cb({
          findOne: jest.fn(),
          save: jest.fn(),
        })),
      },
    };

    const mockUserRepo = {
      findOne: jest.fn(),
    };

    const mockWalletRepo = {
      find: jest.fn(),
    };

    const mockIdentityResolver = {
      resolveIdentifier: jest.fn(),
      getAddressForChain: jest.fn(),
    };

    const mockCrosschainService = {
      getQuote: jest.fn(),
      prepareTransaction: jest.fn(),
      compareQuotes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlikService,
        TokenRegistryService,
        {
          provide: getRepositoryToken(PaymentRequest),
          useValue: mockPaymentRequestRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserWallet),
          useValue: mockWalletRepo,
        },
        {
          provide: IdentityResolverService,
          useValue: mockIdentityResolver,
        },
        {
          provide: CrosschainService,
          useValue: mockCrosschainService,
        },
      ],
    }).compile();

    service = module.get<BlikService>(BlikService);
    paymentRequestRepository = module.get(getRepositoryToken(PaymentRequest));
    userRepository = module.get(getRepositoryToken(User));
    walletRepository = module.get(getRepositoryToken(UserWallet));
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createRequest', () => {
    it('should create a payment request with valid params', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      paymentRequestRepository.count.mockResolvedValue(0);
      paymentRequestRepository.findOne.mockResolvedValue(null); // No duplicate code
      paymentRequestRepository.create.mockReturnValue(mockPaymentRequest as PaymentRequest);
      paymentRequestRepository.save.mockResolvedValue(mockPaymentRequest as PaymentRequest);

      const result = await service.createRequest({
        toUserId: 'user-123',
        amount: '0.1',
        tokenSymbol: 'ETH',
      });

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('expiresAt');
      expect(result.code).toHaveLength(6);
    });

    it('should reject invalid amount (zero)', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.createRequest({
          toUserId: 'user-123',
          amount: '0',
          tokenSymbol: 'ETH',
        })
      ).rejects.toThrow('INVALID_AMOUNT');
    });

    it('should reject invalid amount (negative)', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.createRequest({
          toUserId: 'user-123',
          amount: '-1',
          tokenSymbol: 'ETH',
        })
      ).rejects.toThrow('INVALID_AMOUNT');
    });

    it('should reject non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createRequest({
          toUserId: 'non-existent',
          amount: '0.1',
          tokenSymbol: 'ETH',
        })
      ).rejects.toThrow('RECIPIENT_NOT_FOUND');
    });

    it('should reject when max active codes exceeded', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      paymentRequestRepository.count.mockResolvedValue(10); // Max is 10, so 10 should fail (>= check)

      await expect(
        service.createRequest({
          toUserId: 'user-123',
          amount: '0.1',
          tokenSymbol: 'ETH',
        })
      ).rejects.toThrow('MAX_ACTIVE_CODES_EXCEEDED');
    });
  });

  describe('getRequestByCode', () => {
    it('should return request info for valid code', async () => {
      const mockRequest = {
        ...mockPaymentRequest,
        toUser: mockUser,
      };
      paymentRequestRepository.findOne.mockResolvedValue(mockRequest as any);
      walletRepository.find.mockResolvedValue([]);

      const result = await service.getRequestByCode('ABC123');

      expect(result).toBeDefined();
      expect(result?.code).toBe('ABC123');
      expect(result?.toUser.id).toBe('user-123');
    });

    it('should mark expired code status correctly', async () => {
      const expiredRequest = {
        ...mockPaymentRequest,
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: PaymentRequestStatus.EXPIRED,
        toUser: mockUser,
      };
      paymentRequestRepository.findOne.mockResolvedValue(expiredRequest as any);
      walletRepository.find.mockResolvedValue([]);

      const result = await service.getRequestByCode('ABC123');

      // Service returns info but with expired status
      expect(result?.status).toBe(PaymentRequestStatus.EXPIRED);
    });

    it('should return null for non-existent code', async () => {
      paymentRequestRepository.findOne.mockResolvedValue(null);

      const result = await service.getRequestByCode('INVALID');

      expect(result).toBeNull();
    });

    it('should convert code to uppercase', async () => {
      const mockRequest = {
        ...mockPaymentRequest,
        toUser: mockUser,
      };
      paymentRequestRepository.findOne.mockResolvedValue(mockRequest as any);
      walletRepository.find.mockResolvedValue([]);

      await service.getRequestByCode('abc123');

      expect(paymentRequestRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'ABC123' },
        })
      );
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a pending request by owner', async () => {
      const mockRequest = {
        ...mockPaymentRequest,
        status: PaymentRequestStatus.PENDING,
      };
      paymentRequestRepository.findOne.mockResolvedValue(mockRequest as any);
      paymentRequestRepository.save.mockResolvedValue({
        ...mockRequest,
        status: PaymentRequestStatus.CANCELLED,
      } as any);

      await service.cancelRequest('ABC123', 'user-123');

      expect(paymentRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentRequestStatus.CANCELLED,
        })
      );
    });

    it('should reject cancellation by non-owner', async () => {
      const mockRequest = {
        ...mockPaymentRequest,
        status: PaymentRequestStatus.PENDING,
      };
      paymentRequestRepository.findOne.mockResolvedValue(mockRequest as any);

      await expect(
        service.cancelRequest('ABC123', 'other-user')
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should reject cancellation of non-pending request', async () => {
      const mockRequest = {
        ...mockPaymentRequest,
        status: PaymentRequestStatus.COMPLETED,
      };
      paymentRequestRepository.findOne.mockResolvedValue(mockRequest as any);

      await expect(
        service.cancelRequest('ABC123', 'user-123')
      ).rejects.toThrow('REQUEST_NOT_CANCELLABLE');
    });

    it('should reject cancellation of non-existent request', async () => {
      paymentRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelRequest('INVALID', 'user-123')
      ).rejects.toThrow('REQUEST_NOT_FOUND');
    });
  });

  describe('code generation', () => {
    it('should generate 6-character alphanumeric codes', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      paymentRequestRepository.count.mockResolvedValue(0);
      paymentRequestRepository.findOne.mockResolvedValue(null);
      paymentRequestRepository.create.mockReturnValue(mockPaymentRequest as PaymentRequest);
      paymentRequestRepository.save.mockResolvedValue(mockPaymentRequest as PaymentRequest);

      const result = await service.createRequest({
        toUserId: 'user-123',
        amount: '0.1',
        tokenSymbol: 'ETH',
      });

      expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
    });
  });
});
