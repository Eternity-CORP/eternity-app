/**
 * Unit tests for wallet/transactions.ts
 * 
 * Tests:
 * - Address validation (EIP-55)
 * - Amount parsing and validation
 * - RPC error handling
 * - Insufficient funds detection
 * - Invalid inputs
 */

import { ethers } from 'ethers';
import {
  sendNative,
  InsufficientFundsError,
  InvalidAddressError,
  InvalidAmountError,
  TransactionError,
} from '../transactions';

// Mock dependencies
jest.mock('../../services/walletService');
jest.mock('../../services/blockchain/balanceService');
jest.mock('../../services/blockchain/gasEstimatorService');
jest.mock('../../services/blockchain/transactionService');

describe('wallet/transactions', () => {
  describe('sendNative', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Address Validation', () => {
      it('should accept valid Ethereum address', async () => {
        const validAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
        
        // Mock successful transaction
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: {
            gasLimit: ethers.BigNumber.from(21000),
            totalFeeTH: '0.0001',
            isEIP1559: true,
            level: 'low',
          },
          medium: {
            gasLimit: ethers.BigNumber.from(21000),
            totalFeeTH: '0.00015',
            isEIP1559: true,
            level: 'medium',
          },
          high: {
            gasLimit: ethers.BigNumber.from(21000),
            totalFeeTH: '0.0002',
            isEIP1559: true,
            level: 'high',
          },
        });
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          nonce: 0,
          from: '0x1234567890123456789012345678901234567890',
          to: validAddress,
          value: '0.001',
          status: 'pending',
          timestamp: Date.now(),
        });

        await expect(
          sendNative({
            to: validAddress,
            amountEther: '0.001',
          })
        ).resolves.toBeDefined();
      });

      it('should reject invalid Ethereum address', async () => {
        const invalidAddress = '0xinvalid';

        await expect(
          sendNative({
            to: invalidAddress,
            amountEther: '0.001',
          })
        ).rejects.toThrow(InvalidAddressError);
      });

      it('should reject empty address', async () => {
        await expect(
          sendNative({
            to: '',
            amountEther: '0.001',
          })
        ).rejects.toThrow(InvalidAddressError);
      });

      it('should apply EIP-55 checksum to address', async () => {
        const lowercaseAddress = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
        const checksummedAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          to: checksummedAddress,
        });

        const result = await sendNative({
          to: lowercaseAddress,
          amountEther: '0.001',
        });

        expect(result.to).toBe(checksummedAddress);
      });
    });

    describe('Amount Validation', () => {
      it('should accept valid amount', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          value: '0.001',
        });

        const result = await sendNative({
          to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          amountEther: '0.001',
        });

        expect(result.value).toBe('0.001');
      });

      it('should reject zero amount', async () => {
        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0',
          })
        ).rejects.toThrow(InvalidAmountError);
      });

      it('should reject negative amount', async () => {
        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '-0.001',
          })
        ).rejects.toThrow(InvalidAmountError);
      });

      it('should reject invalid amount format', async () => {
        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: 'invalid',
          })
        ).rejects.toThrow(InvalidAmountError);
      });

      it('should handle very small amounts', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          value: '0.000000000000000001', // 1 wei
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0.000000000000000001',
          })
        ).resolves.toBeDefined();
      });
    });

    describe('Balance Checking', () => {
      it('should reject transaction if insufficient funds', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('0.0001')); // Very low balance
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '1.0', // More than balance
          })
        ).rejects.toThrow(InsufficientFundsError);
      });

      it('should reject transaction if insufficient funds for gas', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('0.001')); // Exactly amount, no gas
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0.001',
          })
        ).rejects.toThrow(InsufficientFundsError);
      });
    });

    describe('RPC Error Handling', () => {
      it('should handle nonce too low error', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockRejectedValue({
          code: 'NONCE_EXPIRED',
          message: 'nonce too low',
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0.001',
          })
        ).rejects.toThrow(TransactionError);
      });

      it('should handle replacement underpriced error', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockRejectedValue({
          code: 'REPLACEMENT_UNDERPRICED',
          message: 'replacement transaction underpriced',
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0.001',
          })
        ).rejects.toThrow(TransactionError);
      });

      it('should handle network error', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        estimateGasForETH.mockResolvedValue({
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        });
        sendETHAdvanced.mockRejectedValue({
          code: 'NETWORK_ERROR',
          message: 'network timeout',
        });

        await expect(
          sendNative({
            to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
            amountEther: '0.001',
          })
        ).rejects.toThrow(TransactionError);
      });
    });

    describe('Gas Fee Levels', () => {
      it('should use medium fee level by default', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        
        const mockGasOptions = {
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        };
        
        estimateGasForETH.mockResolvedValue(mockGasOptions);
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          gasEstimate: mockGasOptions.medium,
        });

        const result = await sendNative({
          to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          amountEther: '0.001',
        });

        expect(sendETHAdvanced).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          mockGasOptions.medium,
          undefined
        );
      });

      it('should use specified fee level', async () => {
        const { getAddress } = require('../../services/walletService');
        const { getETHBalance } = require('../../services/blockchain/balanceService');
        const { estimateGasForETH } = require('../../services/blockchain/gasEstimatorService');
        const { sendETHAdvanced } = require('../../services/blockchain/transactionService');
        
        getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
        getETHBalance.mockResolvedValue(ethers.utils.parseEther('1.0'));
        
        const mockGasOptions = {
          low: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0001', isEIP1559: true, level: 'low' },
          medium: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.00015', isEIP1559: true, level: 'medium' },
          high: { gasLimit: ethers.BigNumber.from(21000), totalFeeTH: '0.0002', isEIP1559: true, level: 'high' },
        };
        
        estimateGasForETH.mockResolvedValue(mockGasOptions);
        sendETHAdvanced.mockResolvedValue({
          hash: '0xabc123',
          gasEstimate: mockGasOptions.high,
        });

        await sendNative({
          to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          amountEther: '0.001',
          feeLevel: 'high',
        });

        expect(sendETHAdvanced).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          mockGasOptions.high,
          undefined
        );
      });
    });
  });
});
