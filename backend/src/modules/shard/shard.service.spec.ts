import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ShardService } from './shard.service';
import { UserShardState } from '../../../database/entities/user-shard-state.entity';
import { ShardTransaction, ShardReason, ShardTransactionType } from '../../../database/entities/shard-transaction.entity';

describe('ShardService', () => {
  let service: ShardService;
  let userShardStateRepository: Repository<UserShardState>;
  let shardTransactionRepository: Repository<ShardTransaction>;
  let dataSource: DataSource;

  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    const mockDataSource = {
      transaction: jest.fn((callback) => callback({
        findOne: jest.fn(),
        create: jest.fn((_entity, data) => data),
        save: jest.fn((_entity, data) => Promise.resolve(data)),
        count: jest.fn(),
        getRepository: jest.fn(() => ({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            getQuery: jest.fn(),
          })),
        })),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShardService,
        {
          provide: getRepositoryToken(UserShardState),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ShardTransaction),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'shards.maxShardsPerDay') return 3;
              if (key === 'shards.minTxAmountForShard') return 0.001;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ShardService>(ShardService);
    userShardStateRepository = module.get(getRepositoryToken(UserShardState));
    shardTransactionRepository = module.get(getRepositoryToken(ShardTransaction));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardShardOnce', () => {
    it('should award shard for first profile creation', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((_entity, data) => ({ ...data, userId: mockUserId })),
        save: jest.fn((_entity, data) => Promise.resolve(data)),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => 
        callback(mockManager)
      );

      const result = await service.awardShardOnce(
        mockUserId,
        ShardReason.ONBOARD_PROFILE_CREATED,
      );

      expect(result.awarded).toBe(true);
      expect(result.totalShards).toBe(1);
      expect(mockManager.save).toHaveBeenCalledTimes(2); // UserShardState + ShardTransaction
    });

    it('should not award shard twice for same onboarding action', async () => {
      const existingState = {
        userId: mockUserId,
        totalShards: 1,
        shardsEarnedToday: 0,
        hasProfileCreationShard: true,
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(existingState),
        create: jest.fn(),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => 
        callback(mockManager)
      );

      const result = await service.awardShardOnce(
        mockUserId,
        ShardReason.ONBOARD_PROFILE_CREATED,
      );

      expect(result.awarded).toBe(false);
      expect(result.totalShards).toBe(1);
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });

  describe('tryAwardDailyShard', () => {
    it('should award daily shard when under limit', async () => {
      const today = new Date();
      const existingState = {
        userId: mockUserId,
        totalShards: 5,
        shardsEarnedToday: 1,
        shardsDayStartedAt: today,
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(existingState),
        create: jest.fn(),
        save: jest.fn((_entity, data) => Promise.resolve(data)),
        count: jest.fn().mockResolvedValue(0), // No daily reward yet today
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => 
        callback(mockManager)
      );

      const result = await service.tryAwardDailyShard(
        mockUserId,
        ShardReason.DAILY_FIRST_SEND,
      );

      expect(result.awarded).toBe(true);
      expect(result.totalShards).toBe(6);
      expect(result.shardsEarnedToday).toBe(2);
    });

    it('should not award daily shard when limit reached', async () => {
      const today = new Date();
      const existingState = {
        userId: mockUserId,
        totalShards: 10,
        shardsEarnedToday: 3, // Max limit
        shardsDayStartedAt: today,
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(existingState),
        create: jest.fn(),
        save: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => 
        callback(mockManager)
      );

      const result = await service.tryAwardDailyShard(
        mockUserId,
        ShardReason.DAILY_FIRST_SEND,
      );

      expect(result.awarded).toBe(false);
      expect(result.totalShards).toBe(10);
      expect(result.reason).toBe('Daily limit reached');
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('should reset daily counter on new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const existingState = {
        userId: mockUserId,
        totalShards: 10,
        shardsEarnedToday: 3,
        shardsDayStartedAt: yesterday,
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(existingState),
        create: jest.fn(),
        save: jest.fn((_entity, data) => Promise.resolve(data)),
        count: jest.fn().mockResolvedValue(0),
      };

      (dataSource.transaction as jest.Mock).mockImplementation((callback) => 
        callback(mockManager)
      );

      const result = await service.tryAwardDailyShard(
        mockUserId,
        ShardReason.DAILY_FIRST_SEND,
      );

      expect(result.awarded).toBe(true);
      expect(result.shardsEarnedToday).toBe(1); // Reset to 1 after awarding
    });
  });

  describe('isTransactionAmountEligible', () => {
    it('should return true for amounts >= minimum', () => {
      expect(service.isTransactionAmountEligible(0.001)).toBe(true);
      expect(service.isTransactionAmountEligible(0.01)).toBe(true);
      expect(service.isTransactionAmountEligible(1.0)).toBe(true);
    });

    it('should return false for amounts < minimum', () => {
      expect(service.isTransactionAmountEligible(0.0001)).toBe(false);
      expect(service.isTransactionAmountEligible(0.0009)).toBe(false);
    });
  });

  describe('getUserShardState', () => {
    it('should return user shard state', async () => {
      const mockState = {
        userId: mockUserId,
        totalShards: 10,
        shardsEarnedToday: 2,
      };

      jest.spyOn(userShardStateRepository, 'findOne').mockResolvedValue(mockState as any);

      const result = await service.getUserShardState(mockUserId);

      expect(result).toEqual(mockState);
      expect(userShardStateRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should return null if user has no shard state', async () => {
      jest.spyOn(userShardStateRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserShardState(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserShardTransactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: mockUserId,
          amount: 1,
          type: ShardTransactionType.EARN,
          reason: ShardReason.ONBOARD_PROFILE_CREATED,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(shardTransactionRepository, 'find').mockResolvedValue(mockTransactions as any);

      const result = await service.getUserShardTransactions(mockUserId, 10);

      expect(result).toEqual(mockTransactions);
      expect(shardTransactionRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });
});
