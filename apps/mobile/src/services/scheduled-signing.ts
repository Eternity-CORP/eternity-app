/**
 * Scheduled Payment Transaction Signing Service
 * Pre-signs transactions at payment creation time for automatic execution
 */

import { Wallet, parseEther, parseUnits, Contract, Transaction } from 'ethers';
import { getProvider, getTestnetProvider, type AnyNetworkId } from './network-service';
import { createLogger } from '@/src/utils/logger';
import type { AccountType } from '@/src/store/slices/wallet-slice';

const log = createLogger('ScheduledSigningService');

// Minimal ERC-20 ABI for transfer function
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

/**
 * Result of signing a scheduled transaction
 */
export interface SignedScheduledPayment {
  signedTransaction: string;
  estimatedGasPrice: string;
  nonce: number;
  chainId: number;
}

/**
 * Parameters for signing a scheduled transaction
 */
export interface SignScheduledParams {
  privateKey: string;
  recipient: string;
  amount: string;
  tokenAddress: string | null; // null for native ETH/currency
  networkId: AnyNetworkId;
  accountType: AccountType;
  decimals?: number; // Token decimals (default 18)
}

/**
 * Get the appropriate provider based on account type
 */
function getProviderForNetwork(networkId: AnyNetworkId, accountType: AccountType) {
  if (accountType === 'test') {
    return getTestnetProvider(networkId as any);
  }
  return getProvider(networkId as any);
}

/**
 * Sign a scheduled transaction for later broadcast
 * The signed transaction can be stored and broadcast by the backend at the scheduled time
 */
export async function signScheduledTransaction(
  params: SignScheduledParams
): Promise<SignedScheduledPayment> {
  const { privateKey, recipient, amount, tokenAddress, networkId, accountType, decimals = 18 } = params;

  log.info('Signing scheduled transaction', { recipient, amount, networkId, isToken: !!tokenAddress });

  const provider = getProviderForNetwork(networkId, accountType);
  const wallet = new Wallet(privateKey, provider);

  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;

  if (!gasPrice) {
    throw new Error('Failed to fetch gas price');
  }

  // Get nonce
  const nonce = await wallet.getNonce();

  // Get chain ID from network
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  let tx: Transaction;

  if (tokenAddress === null) {
    // Native currency transfer (ETH, MATIC, etc.)
    const value = parseEther(amount);

    // Estimate gas for native transfer
    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: recipient,
      value,
    });

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;

    tx = Transaction.from({
      to: recipient,
      value,
      gasLimit,
      gasPrice,
      nonce,
      chainId,
      type: 0, // Legacy transaction for wider compatibility
    });
  } else {
    // ERC-20 transfer
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

    // Parse amount with correct decimals
    const amountInUnits = parseUnits(amount, decimals);

    // Encode the transfer function call
    const data = tokenContract.interface.encodeFunctionData('transfer', [recipient, amountInUnits]);

    // Estimate gas for token transfer
    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: tokenAddress,
      data,
    });

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;

    tx = Transaction.from({
      to: tokenAddress,
      data,
      gasLimit,
      gasPrice,
      nonce,
      chainId,
      type: 0, // Legacy transaction for wider compatibility
    });
  }

  // Sign the transaction
  const signedTx = await wallet.signTransaction(tx);

  log.info('Transaction signed successfully', {
    nonce,
    chainId,
    gasPrice: gasPrice.toString(),
  });

  return {
    signedTransaction: signedTx,
    estimatedGasPrice: gasPrice.toString(),
    nonce,
    chainId,
  };
}

/**
 * Verify a signed transaction before storing
 * Returns the transaction details if valid
 */
export function verifySignedTransaction(signedTx: string): {
  from: string;
  to: string | null;
  value: string;
  nonce: number;
  chainId: number;
} | null {
  try {
    const tx = Transaction.from(signedTx);

    if (!tx.from) {
      log.error('Signed transaction has no from address');
      return null;
    }

    return {
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      nonce: tx.nonce,
      chainId: Number(tx.chainId),
    };
  } catch (error) {
    log.error('Failed to verify signed transaction', error);
    return null;
  }
}
