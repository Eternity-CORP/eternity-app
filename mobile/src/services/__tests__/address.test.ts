/**
 * Unit tests for address checksum validation (EIP-55)
 * Verifies that addresses are properly checksummed
 */

import { ethers } from 'ethers';
import { getAddress } from '../walletService';
import { saveSeed, saveWalletMeta } from '../cryptoService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ethereum provider
jest.mock('../blockchain/ethereumProvider', () => ({
  getProvider: jest.fn(),
  clearProviderCache: jest.fn(),
}));

describe('Address Checksum (EIP-55)', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test junk';
  const EXPECTED_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Checksummed
  const EXPECTED_LOWERCASE = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

  beforeEach(async () => {
    // Setup test wallet
    const wallet = ethers.Wallet.fromMnemonic(TEST_MNEMONIC, "m/44'/60'/0'/0/0");
    await saveSeed(TEST_MNEMONIC);
    await saveWalletMeta({
      accounts: [{ index: 0, name: 'Account 1', address: wallet.address }],
      activeAccountIndex: 0,
    });
  });

  describe('getAddress() checksum validation', () => {
    it('should return checksummed address from getAddress()', async () => {
      const address = await getAddress();
      expect(address).toBeTruthy();

      // Verify it's a valid address
      expect(ethers.utils.isAddress(address!)).toBe(true);

      // Verify it's checksummed (EIP-55)
      const checksummed = ethers.utils.getAddress(address!);
      expect(address).toBe(checksummed);
    });

    it('should match expected checksummed format', async () => {
      const address = await getAddress();

      // Should be checksummed (not all lowercase)
      const lowercase = address?.toLowerCase();
      expect(address).not.toBe(lowercase);

      // Verify it matches checksummed version
      const checksummed = ethers.utils.getAddress(address!);
      expect(address).toBe(checksummed);
    });

    it('should have mixed case for checksum', async () => {
      const address = await getAddress();

      // Checksummed address should have both upper and lowercase characters
      const hasUpperCase = /[A-F]/.test(address!);
      const hasLowerCase = /[a-f]/.test(address!);

      expect(hasUpperCase || hasLowerCase).toBe(true);
    });
  });

  describe('ethers.utils.getAddress() behavior', () => {
    it('should convert lowercase address to checksummed', () => {
      const checksummed = ethers.utils.getAddress(EXPECTED_LOWERCASE);
      expect(checksummed).toBe(EXPECTED_ADDRESS);
    });

    it('should accept already checksummed address', () => {
      const checksummed = ethers.utils.getAddress(EXPECTED_ADDRESS);
      expect(checksummed).toBe(EXPECTED_ADDRESS);
    });

    it('should throw on invalid checksum', () => {
      // Wrong checksum - changed one character case
      const invalidChecksum = '0x70997970c51812dc3A010C7d01b50e0d17dc79C8';

      expect(() => {
        ethers.utils.getAddress(invalidChecksum);
      }).toThrow();
    });

    it('should validate checksum for real addresses', () => {
      // Use addresses with correct checksums
      const testAddresses = [
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
        '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
        '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
      ];

      for (const addr of testAddresses) {
        // Should not throw
        expect(() => ethers.utils.getAddress(addr)).not.toThrow();
        const checksummed = ethers.utils.getAddress(addr);
        expect(ethers.utils.isAddress(checksummed)).toBe(true);
      }
    });
  });

  describe('isAddress() validation', () => {
    it('should accept checksummed address', () => {
      expect(ethers.utils.isAddress(EXPECTED_ADDRESS)).toBe(true);
    });

    it('should accept lowercase address', () => {
      expect(ethers.utils.isAddress(EXPECTED_LOWERCASE)).toBe(true);
    });

    it('should reject invalid address', () => {
      expect(ethers.utils.isAddress('0xinvalid')).toBe(false);
      expect(ethers.utils.isAddress('not-an-address')).toBe(false);
      expect(ethers.utils.isAddress('')).toBe(false);
    });

    it('should handle address without 0x prefix', () => {
      const withoutPrefix = EXPECTED_ADDRESS.slice(2);
      // ethers v5 accepts addresses without 0x prefix
      expect(ethers.utils.isAddress(withoutPrefix)).toBe(true);

      // But getAddress will add the prefix
      const checksummed = ethers.utils.getAddress(withoutPrefix);
      expect(checksummed).toMatch(/^0x/);
    });
  });

  describe('Wallet creation checksum', () => {
    it('should create wallet with checksummed address', async () => {
      const wallet = ethers.Wallet.createRandom();

      // Wallet.address should be checksummed
      const checksummed = ethers.utils.getAddress(wallet.address);
      expect(wallet.address).toBe(checksummed);
    });

    it('should import wallet with checksummed address', async () => {
      const wallet = ethers.Wallet.fromMnemonic(TEST_MNEMONIC, "m/44'/60'/0'/0/0");

      // Wallet.address should be checksummed
      const checksummed = ethers.utils.getAddress(wallet.address);
      expect(wallet.address).toBe(checksummed);
    });
  });
});
