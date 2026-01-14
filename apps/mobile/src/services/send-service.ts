/**
 * Send Service
 * Handles transaction signing and broadcasting
 */

import { isAddress, parseEther, formatEther, Contract, parseUnits } from 'ethers';
import { getProvider, fetchEthUsdPrice, fetchTokenMetadata } from './balance-service';
import type { HDNodeWallet } from 'ethers';

// Minimal ERC-20 ABI for transfer function
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export interface SendTransactionParams {
  wallet: HDNodeWallet;
  to: string;
  amount: string; // Human-readable amount (e.g., "0.1")
  token: string; // 'ETH' or token contract address
}

export interface GasEstimate {
  gasLimit: string; // BigInt as string for Redux serialization
  gasPrice: string; // BigInt as string for Redux serialization
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
