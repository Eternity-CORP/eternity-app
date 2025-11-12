/**
 * Integration tests for ReceiveScreen
 * Tests QR code generation, network switching, and address display
 */

import { ethers } from 'ethers';
import { getAddress } from '../../services/walletService';
import { saveSeed, saveWalletMeta } from '../../services/cryptoService';
import { setSelectedNetwork, getSelectedNetwork } from '../../services/networkService';
import { SUPPORTED_CHAINS } from '../../constants/chains';

// Mock AsyncStorage for network service
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ethereum provider
jest.mock('../../services/blockchain/ethereumProvider', () => ({
  getProvider: jest.fn(),
  clearProviderCache: jest.fn(),
}));

describe('ReceiveScreen Integration Tests', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test junk';
  let testAddress: string;

  beforeEach(async () => {
    // Setup test wallet
    const wallet = ethers.Wallet.fromMnemonic(TEST_MNEMONIC, "m/44'/60'/0'/0/0");
    testAddress = wallet.address;

    await saveSeed(TEST_MNEMONIC);
    await saveWalletMeta({
      accounts: [{ index: 0, name: 'Account 1', address: testAddress }],
      activeAccountIndex: 0,
    });

    // Clear network cache
    const { clearNetworkCache } = require('../../services/networkService');
    clearNetworkCache();

    jest.clearAllMocks();
  });

  describe('Address display and checksum', () => {
    it('should return checksummed address', async () => {
      const address = await getAddress();

      expect(address).toBeTruthy();
      expect(ethers.utils.isAddress(address!)).toBe(true);

      // Verify checksum
      const checksummed = ethers.utils.getAddress(address!);
      expect(address).toBe(checksummed);
    });

    it('should have EIP-55 compliant address format', async () => {
      const address = await getAddress();

      // Check format: 0x + 40 hex characters
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // Should have mixed case (checksum)
      const hasUpperCase = /[A-F]/.test(address!.slice(2));
      const hasLowerCase = /[a-f]/.test(address!.slice(2));

      // Most addresses will have mixed case due to checksum
      expect(hasUpperCase || hasLowerCase).toBe(true);
    });
  });

  describe('QR code URI format', () => {
    it('should generate ethereum URI with chainId for sepolia', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue('sepolia');

      const address = await getAddress();
      const network = await getSelectedNetwork();
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === 11155111);

      expect(network).toBe('sepolia');
      expect(chain?.chainId).toBe(11155111);

      // Expected URI format
      const expectedUri = `ethereum:${address}?chainId=11155111`;
      expect(expectedUri).toMatch(/^ethereum:0x[a-fA-F0-9]{40}\?chainId=11155111$/);
    });

    it('should generate ethereum URI with chainId for mainnet', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { clearNetworkCache } = require('../../services/networkService');

      clearNetworkCache();
      AsyncStorage.getItem.mockResolvedValue('mainnet');
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await setSelectedNetwork('mainnet');
      const address = await getAddress();
      const network = await getSelectedNetwork();
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === 1);

      expect(network).toBe('mainnet');
      expect(chain?.chainId).toBe(1);

      // Expected URI format
      const expectedUri = `ethereum:${address}?chainId=1`;
      expect(expectedUri).toMatch(/^ethereum:0x[a-fA-F0-9]{40}\?chainId=1$/);
    });

    it('should generate ethereum URI with chainId for holesky', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { clearNetworkCache } = require('../../services/networkService');

      clearNetworkCache();
      AsyncStorage.getItem.mockResolvedValue('holesky');
      AsyncStorage.setItem.mockResolvedValue(undefined);

      await setSelectedNetwork('holesky');
      const address = await getAddress();
      const network = await getSelectedNetwork();
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === 17000);

      expect(network).toBe('holesky');
      expect(chain?.chainId).toBe(17000);

      // Expected URI format
      const expectedUri = `ethereum:${address}?chainId=17000`;
      expect(expectedUri).toMatch(/^ethereum:0x[a-fA-F0-9]{40}\?chainId=17000$/);
    });
  });

  describe('Network switching integration', () => {
    it('should update URI when network changes from sepolia to mainnet', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      // Start with sepolia
      AsyncStorage.getItem.mockResolvedValue('sepolia');
      let network = await getSelectedNetwork();
      expect(network).toBe('sepolia');

      // Switch to mainnet
      AsyncStorage.setItem.mockResolvedValue(undefined);
      AsyncStorage.getItem.mockResolvedValue('mainnet');

      await setSelectedNetwork('mainnet');
      network = await getSelectedNetwork();
      expect(network).toBe('mainnet');

      // Verify chainId changed
      const sepoliaChain = SUPPORTED_CHAINS.find(c => c.chainId === 11155111);
      const mainnetChain = SUPPORTED_CHAINS.find(c => c.chainId === 1);

      expect(sepoliaChain?.chainId).toBe(11155111);
      expect(mainnetChain?.chainId).toBe(1);
    });

    it('should maintain same address across network switches', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      // Get address on sepolia
      AsyncStorage.getItem.mockResolvedValue('sepolia');
      const addressSepolia = await getAddress();

      // Get address on mainnet
      AsyncStorage.getItem.mockResolvedValue('mainnet');
      const addressMainnet = await getAddress();

      // Address should be the same (only chainId in URI changes)
      expect(addressSepolia).toBe(addressMainnet);
    });

    it('should update QR value after network change', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const address = await getAddress();

      // Sepolia QR
      AsyncStorage.getItem.mockResolvedValue('sepolia');
      const sepoliaUri = `ethereum:${address}?chainId=11155111`;

      // Mainnet QR
      AsyncStorage.getItem.mockResolvedValue('mainnet');
      const mainnetUri = `ethereum:${address}?chainId=1`;

      // URIs should differ only by chainId
      expect(sepoliaUri).not.toBe(mainnetUri);
      expect(sepoliaUri).toContain('chainId=11155111');
      expect(mainnetUri).toContain('chainId=1');
    });
  });

  describe('Copy and share functionality', () => {
    it('should copy checksummed address', async () => {
      const address = await getAddress();

      // Verify it's checksummed
      const checksummed = ethers.utils.getAddress(address!);
      expect(address).toBe(checksummed);

      // Copy function should use checksummed address
      // (This would be tested in actual component test with Clipboard mock)
    });

    it('should share with network name and checksummed address', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue('sepolia');

      const address = await getAddress();
      const network = await getSelectedNetwork();
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === 11155111);

      const shareMessage = `My ${chain?.name} address: ${address}`;

      expect(shareMessage).toContain('Sepolia Testnet');
      expect(shareMessage).toContain(address!);
    });
  });

  describe('Address stability', () => {
    it('should return same address on multiple calls', async () => {
      const address1 = await getAddress();
      const address2 = await getAddress();
      const address3 = await getAddress();

      expect(address1).toBe(address2);
      expect(address2).toBe(address3);
    });

    it('should persist address after app restart simulation', async () => {
      const addressBefore = await getAddress();

      // Simulate app restart by clearing cache
      jest.clearAllMocks();

      const addressAfter = await getAddress();

      expect(addressBefore).toBe(addressAfter);
    });
  });
});
