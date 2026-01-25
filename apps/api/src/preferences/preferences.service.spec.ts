import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, HDNodeWallet } from 'ethers';
import { PreferencesService } from './preferences.service';
import { AddressPreferences } from './entities/address-preferences.entity';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repository: jest.Mocked<Repository<AddressPreferences>>;

  // Test wallet for signature tests
  const testWallet: HDNodeWallet = Wallet.createRandom();
  const testAddress = testWallet.address.toLowerCase();

  const mockPreferences: AddressPreferences = {
    address: testAddress,
    defaultNetwork: 'polygon',
    tokenOverrides: { USDC: 'polygon' },
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getRepositoryToken(AddressPreferences),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    repository = module.get(getRepositoryToken(AddressPreferences));
  });

  describe('findByAddress', () => {
    it('should return null for unknown address', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { address: '0x1234567890123456789012345678901234567890' },
      });
    });

    it('should return preferences for known address', async () => {
      repository.findOne.mockResolvedValue(mockPreferences);

      const result = await service.findByAddress(testAddress);

      expect(result).toEqual(mockPreferences);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { address: testAddress },
      });
    });

    it('should normalize address to lowercase', async () => {
      const upperCaseAddress = testAddress.toUpperCase();
      repository.findOne.mockResolvedValue(mockPreferences);

      await service.findByAddress(upperCaseAddress);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { address: testAddress },
      });
    });
  });

  describe('upsert', () => {
    it('should create new preferences when none exist', async () => {
      const newPreferences: AddressPreferences = {
        address: testAddress,
        defaultNetwork: 'ethereum',
        tokenOverrides: { ETH: 'ethereum' },
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newPreferences);
      repository.save.mockResolvedValue(newPreferences);

      const result = await service.upsert(testAddress, 'ethereum', { ETH: 'ethereum' });

      expect(repository.create).toHaveBeenCalledWith({
        address: testAddress,
        defaultNetwork: 'ethereum',
        tokenOverrides: { ETH: 'ethereum' },
      });
      expect(repository.save).toHaveBeenCalledWith(newPreferences);
      expect(result).toEqual(newPreferences);
    });

    it('should update existing preferences', async () => {
      const existingPreferences: AddressPreferences = {
        address: testAddress,
        defaultNetwork: 'ethereum',
        tokenOverrides: {},
        updatedAt: new Date(),
      };

      const updatedPreferences: AddressPreferences = {
        ...existingPreferences,
        defaultNetwork: 'polygon',
        tokenOverrides: { USDC: 'arbitrum' },
      };

      repository.findOne.mockResolvedValue(existingPreferences);
      repository.save.mockResolvedValue(updatedPreferences);

      const result = await service.upsert(testAddress, 'polygon', { USDC: 'arbitrum' });

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.defaultNetwork).toBe('polygon');
      expect(result.tokenOverrides).toEqual({ USDC: 'arbitrum' });
    });

    it('should normalize address to lowercase on create', async () => {
      const upperCaseAddress = testAddress.toUpperCase();
      const newPreferences: AddressPreferences = {
        address: testAddress,
        defaultNetwork: null,
        tokenOverrides: {},
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newPreferences);
      repository.save.mockResolvedValue(newPreferences);

      await service.upsert(upperCaseAddress, null, {});

      expect(repository.create).toHaveBeenCalledWith({
        address: testAddress,
        defaultNetwork: null,
        tokenOverrides: {},
      });
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      const result = service.verifySignature(testWallet.address, signature, timestamp);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const timestamp = Date.now();
      const invalidSignature = '0x' + '00'.repeat(65);

      const result = service.verifySignature(testAddress, invalidSignature, timestamp);

      expect(result).toBe(false);
    });

    it('should return false for expired timestamp (>5 min)', async () => {
      // Timestamp from 6 minutes ago
      const expiredTimestamp = Date.now() - 6 * 60 * 1000;
      const message = `E-Y:preferences:${testAddress}:${expiredTimestamp}`;
      const signature = await testWallet.signMessage(message);

      const result = service.verifySignature(testWallet.address, signature, expiredTimestamp);

      expect(result).toBe(false);
    });

    it('should return false for future timestamp (>5 min)', async () => {
      // Timestamp 6 minutes in the future
      const futureTimestamp = Date.now() + 6 * 60 * 1000;
      const message = `E-Y:preferences:${testAddress}:${futureTimestamp}`;
      const signature = await testWallet.signMessage(message);

      const result = service.verifySignature(testWallet.address, signature, futureTimestamp);

      expect(result).toBe(false);
    });

    it('should return false for wrong address', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      // Use a different address
      const wrongAddress = '0x1234567890123456789012345678901234567890';

      const result = service.verifySignature(wrongAddress, signature, timestamp);

      expect(result).toBe(false);
    });

    it('should be case-insensitive for address comparison', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      // Use upper case address
      const upperCaseAddress = testWallet.address.toUpperCase();

      const result = service.verifySignature(upperCaseAddress, signature, timestamp);

      expect(result).toBe(true);
    });

    it('should return false for malformed signature', () => {
      const timestamp = Date.now();
      const malformedSignature = 'not-a-valid-signature';

      const result = service.verifySignature(testAddress, malformedSignature, timestamp);

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong message', async () => {
      const timestamp = Date.now();
      // Sign a different message
      const wrongMessage = `wrong-message:${timestamp}`;
      const signature = await testWallet.signMessage(wrongMessage);

      const result = service.verifySignature(testWallet.address, signature, timestamp);

      expect(result).toBe(false);
    });
  });
});
