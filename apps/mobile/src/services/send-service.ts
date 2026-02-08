/**
 * Send Service
 * Handles transaction signing and broadcasting
 */

import { isAddress, parseEther, formatEther, Contract, parseUnits } from 'ethers';
import { getProvider, fetchEthUsdPrice, fetchTokenMetadata } from './balance-service';
import type { HDNodeWallet } from 'ethers';
import { ERC20_TRANSFER_ABI, type GasEstimate } from '@e-y/shared';

const ERC20_ABI = ERC20_TRANSFER_ABI as unknown as string[];

export type { GasEstimate };

export interface SendTransactionParams {
  wallet: HDNodeWallet;
  to: string;
  amount: string;
  token: string;
}

/**
 * Validate EVM address format
 */
export function validateAddress(address: string): boolean {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Estimate gas for transaction (ETH or ERC-20)
 */
export async function estimateGas(
  from: string,
  to: string,
  amount: string,
  token: string = 'ETH'
): Promise<GasEstimate> {
  try {
    const provider = getProvider();
    let gasLimit: bigint;

    if (token === 'ETH') {
      // ETH transfer
      const value = parseEther(amount);
      gasLimit = await provider.estimateGas({
        from,
        to,
        value,
      });
    } else {
      // ERC-20 transfer - need to estimate gas for contract call
      const tokenContract = new Contract(token, ERC20_ABI, provider);

      // Get token decimals from metadata cache or contract
      const metadata = await fetchTokenMetadata(token);
      const decimals = metadata?.decimals ?? 18;

      // Parse amount with correct decimals
      const amountInUnits = parseUnits(amount, decimals);

      // Estimate gas for transfer function
      gasLimit = await tokenContract.transfer.estimateGas(to, amountInUnits, { from });
    }

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const totalGasCost = gasLimit * gasPrice;

    // Get ETH price for USD conversion (uses cached price from balance-service)
    const ethPrice = await fetchEthUsdPrice();
    const totalGasCostEth = formatEther(totalGasCost);
    const totalGasCostUsd = parseFloat(totalGasCostEth) * ethPrice;

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      totalGasCost: totalGasCostEth,
      totalGasCostUsd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('insufficient funds')) {
      throw new Error('Insufficient balance to cover amount + gas fees');
    }
    if (message.includes('execution reverted')) {
      throw new Error('Insufficient token balance');
    }

    console.error('Error estimating gas:', error);
    throw new Error('Failed to estimate gas');
  }
}

/**
 * Send transaction (ETH or ERC-20)
 */
export async function sendTransaction(
  params: SendTransactionParams
): Promise<string> {
  const { wallet, to, amount, token } = params;

  if (!validateAddress(to)) {
    throw new Error('Invalid address');
  }

  const provider = getProvider();

  // Connect wallet to provider
  const connectedWallet = wallet.connect(provider);

  if (token === 'ETH') {
    // ETH transfer
    const value = parseEther(amount);
    const txResponse = await connectedWallet.sendTransaction({
      to,
      value,
    });
    return txResponse.hash;
  }

  // ERC-20 transfer
  if (!validateAddress(token)) {
    throw new Error('Invalid token contract address');
  }

  // Get token decimals from metadata cache or contract
  const metadata = await fetchTokenMetadata(token);
  const decimals = metadata?.decimals ?? 18;

  // Parse amount with correct decimals
  const amountInUnits = parseUnits(amount, decimals);

  // Create contract instance with connected wallet (for signing)
  const tokenContract = new Contract(token, ERC20_ABI, connectedWallet);

  // Execute transfer
  const txResponse = await tokenContract.transfer(to, amountInUnits);

  return txResponse.hash;
}
