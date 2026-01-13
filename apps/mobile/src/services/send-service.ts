/**
 * Send Service
 * Handles transaction signing and broadcasting
 */

import { isAddress, parseEther, formatEther } from 'ethers';
import { getProvider } from './balance-service';
import { signAndSendTransaction } from '@e-y/crypto';
import type { HDNodeWallet } from 'ethers';

export interface SendTransactionParams {
  wallet: HDNodeWallet;
  to: string;
  amount: string; // Human-readable amount (e.g., "0.1")
  token: string; // 'ETH' or token contract address
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  totalGasCost: string; // In ETH
  totalGasCostUsd: number; // In USD
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
 * Estimate gas for transaction
 */
export async function estimateGas(
  from: string,
  to: string,
  amount: string
): Promise<GasEstimate> {
  try {
    const provider = getProvider();
    const value = parseEther(amount);
    
    const gasLimit = await provider.estimateGas({
      from,
      to,
      value,
    });
    
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const totalGasCost = gasLimit * gasPrice;
    
    // Get ETH price for USD conversion
    const ethPrice = await fetchEthPrice();
    const totalGasCostEth = formatEther(totalGasCost);
    const totalGasCostUsd = parseFloat(totalGasCostEth) * ethPrice;
    
    return {
      gasLimit,
      gasPrice,
      totalGasCost: totalGasCostEth,
      totalGasCostUsd,
    };
  } catch (error) {
    console.error('Error estimating gas:', error);
    throw new Error('Failed to estimate gas');
  }
}

/**
 * Fetch ETH price (reuse from balance service logic)
 */
async function fetchEthPrice(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return data.ethereum?.usd || 0;
  } catch {
    return 0;
  }
}

/**
 * Send transaction
 */
export async function sendTransaction(
  params: SendTransactionParams
): Promise<string> {
  const { wallet, to, amount, token } = params;
  
  if (!validateAddress(to)) {
    throw new Error('Invalid address');
  }
  
  if (token !== 'ETH') {
    throw new Error('Only ETH transfers supported for now');
  }
  
  const provider = getProvider();
  const value = parseEther(amount);
  
  const txResponse = await signAndSendTransaction(wallet, provider, {
    to,
    value,
  });
  
  return txResponse.hash;
}
