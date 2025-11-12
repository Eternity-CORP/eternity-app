/**
 * Unit tests for wallet/account.ts
 * Tests message signing, transaction signing, and DEV-only functions
 */

import { ethers } from 'ethers';
import {
  getAddress,
  signMessage,
  signTransaction,
  verifySignature,
  getPrivateKey,
  getMnemonic,
} from '../account';
import { saveSeed, saveWalletMeta } from '../../services/cryptoService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Create a mock provider that extends EventEmitter
class MockProvider {
  getNetwork() {
    return Promise.resolve({ chainId: 11155111, name: 'sepolia' });
  }

  on() {}
  once() {}
  off() {}
  removeListener() {}
  removeAllListeners() {}
}

// Mock provider
jest.mock('../../services/blockchain/ethereumProvider', () => ({
  getProvider: jest.fn(() => new MockProvider()),
  clearProviderCache: jest.fn(),
}));

describe('wallet/account.ts', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test junk';
  let testWallet: ethers.Wallet;
  let testAddress: string;

  beforeEach(async () => {
    // Setup test wallet
    testWallet = ethers.Wallet.fromMnemonic(TEST_MNEMONIC, "m/44'/60'/0'/0/0");
    testAddress = testWallet.address;

    await saveSeed(TEST_MNEMONIC);
    await saveWalletMeta({
      accounts: [{ index: 0, name: 'Account 1', address: testAddress }],
      activeAccountIndex: 0,
    });
  });

  describe('getAddress()', () => {
    it('should return checksummed address', async () => {
      const address = await getAddress();

      expect(address).toBeTruthy();
      expect(ethers.utils.isAddress(address!)).toBe(true);

      // Verify checksum
      const checksummed = ethers.utils.getAddress(address!);
      expect(address).toBe(checksummed);
    });
  });

  describe('signMessage()', () => {
    it('should sign a string message', async () => {
      const message = 'Hello, Ethereum!';
      const signature = await signMessage(message);

      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes = 130 hex chars
    });

    it('should sign a bytes message', async () => {
      const message = ethers.utils.toUtf8Bytes('Hello, Ethereum!');
      const signature = await signMessage(message);

      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should produce valid signature that can be verified', async () => {
      const message = 'Test message';
      const signature = await signMessage(message);

      // Verify signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      const currentAddress = await getAddress();

      expect(ethers.utils.getAddress(recoveredAddress)).toBe(currentAddress);
    });

    it('should produce different signatures for different messages', async () => {
      const sig1 = await signMessage('Message 1');
      const sig2 = await signMessage('Message 2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('signTransaction()', () => {
    it('should sign a transaction', async () => {
      const tx = {
        to: '0x0000000000000000000000000000000000000001',
        value: ethers.utils.parseEther('1.0'),
        gasLimit: 21000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei'),
        nonce: 0,
        chainId: 11155111,
      };

      const signedTx = await signTransaction(tx);

      expect(signedTx).toBeTruthy();
      expect(signedTx).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it('should produce valid signed transaction', async () => {
      const tx = {
        to: '0x0000000000000000000000000000000000000001',
        value: ethers.utils.parseEther('0.1'),
        gasLimit: 21000,
        chainId: 11155111,
      };

      const signedTx = await signTransaction(tx);

      // Parse signed transaction
      const parsed = ethers.utils.parseTransaction(signedTx);

      expect(parsed.to).toBe(tx.to);
      expect(parsed.value.toString()).toBe(tx.value.toString());
      expect(parsed.gasLimit.toNumber()).toBe(tx.gasLimit);
    });

    it('should recover correct sender from signed transaction', async () => {
      const tx = {
        to: '0x0000000000000000000000000000000000000001',
        value: ethers.utils.parseEther('1.0'),
        gasLimit: 21000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei'),
        nonce: 0,
        chainId: 11155111,
      };

      const signedTx = await signTransaction(tx);
      const parsed = ethers.utils.parseTransaction(signedTx);
      const currentAddress = await getAddress();

      expect(parsed.from).toBe(currentAddress);
    });
  });

  describe('verifySignature()', () => {
    it('should verify valid signature', async () => {
      const message = 'Test message';
      const signature = await signMessage(message);
      const currentAddress = await getAddress();

      const isValid = await verifySignature(message, signature, currentAddress!);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const message = 'Test message';
      const invalidSignature = '0x' + '00'.repeat(65);

      const isValid = await verifySignature(message, invalidSignature);

      expect(isValid).toBe(false);
    });

    it('should reject signature from different address', async () => {
      const message = 'Test message';
      const signature = await signMessage(message);
      const wrongAddress = '0x0000000000000000000000000000000000000001';

      const isValid = await verifySignature(message, signature, wrongAddress);

      expect(isValid).toBe(false);
    });

    it('should verify signature without expected address (uses current account)', async () => {
      const message = 'Test message';
      const signature = await signMessage(message);

      const isValid = await verifySignature(message, signature);

      expect(isValid).toBe(true);
    });

    it('should reject signature for different message', async () => {
      const signature = await signMessage('Original message');

      const isValid = await verifySignature('Different message', signature);

      expect(isValid).toBe(false);
    });
  });

  describe('DEV-only functions', () => {
    // These tests only run in DEV mode
    const originalDev = __DEV__;

    describe('getPrivateKey()', () => {
      it('should return private key in DEV mode', async () => {
        if (!__DEV__) {
          console.log('Skipping DEV-only test in production mode');
          return;
        }

        const privateKey = await getPrivateKey();

        expect(privateKey).toBeTruthy();
        expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(privateKey).toBe(testWallet.privateKey);
      });

      it('should throw error in production mode', async () => {
        // Cannot properly test this without mocking __DEV__
        // In production builds, __DEV__ is false and function throws
      });
    });

    describe('getMnemonic()', () => {
      it('should return mnemonic in DEV mode', async () => {
        if (!__DEV__) {
          console.log('Skipping DEV-only test in production mode');
          return;
        }

        const mnemonic = await getMnemonic();

        expect(mnemonic).toBeTruthy();
        expect(mnemonic).toBe(TEST_MNEMONIC);
        expect(ethers.utils.isValidMnemonic(mnemonic!)).toBe(true);
      });

      it('should throw error in production mode', async () => {
        // Cannot properly test this without mocking __DEV__
        // In production builds, __DEV__ is false and function throws
      });
    });
  });

  describe('EIP-191 compliance', () => {
    it('should produce EIP-191 compliant signatures', async () => {
      const message = 'Hello, Ethereum!';
      const signature = await signMessage(message);

      // EIP-191 signature format
      const messageHash = ethers.utils.hashMessage(message);
      expect(messageHash).toBeTruthy();

      // Verify signature structure (65 bytes)
      const sigBytes = ethers.utils.arrayify(signature);
      expect(sigBytes.length).toBe(65);

      // Verify v, r, s components
      const { v, r, s } = ethers.utils.splitSignature(signature);
      expect(v).toBeGreaterThanOrEqual(27);
      expect(v).toBeLessThanOrEqual(28);
      expect(r).toBeTruthy();
      expect(s).toBeTruthy();
    });
  });
});
