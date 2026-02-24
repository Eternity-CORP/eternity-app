/**
 * ERC-20 helpers for swap operations
 * Shared between web and mobile — requires ethers.js
 */

import { ethers } from 'ethers';
import { NATIVE_TOKEN_ADDRESS, ERC20_ALLOWANCE_ABI, ERC20_APPROVE_ABI } from '@e-y/shared';
import type { SwapQuote } from '@e-y/shared';

/**
 * Check ERC-20 token allowance for a spender.
 * Returns MaxUint256 for native tokens (no approval needed).
 */
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.Provider,
): Promise<bigint> {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return ethers.MaxUint256;
  }

  const contract = new ethers.Contract(
    tokenAddress,
    ERC20_ALLOWANCE_ABI as unknown as string[],
    provider,
  );
  const allowance = await contract.allowance(ownerAddress, spenderAddress);

  return allowance;
}

/**
 * Build an ERC-20 approve transaction (unsigned).
 */
export function getApprovalData(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
): { to: string; data: string } {
  const erc20Interface = new ethers.Interface(
    ERC20_APPROVE_ABI as unknown as string[],
  );
  const data = erc20Interface.encodeFunctionData('approve', [
    spenderAddress,
    amount,
  ]);

  return {
    to: tokenAddress,
    data,
  };
}

/**
 * Execute a swap by sending the transaction from the quote.
 */
export async function executeSwap(
  quote: SwapQuote,
  signer: ethers.Signer,
): Promise<ethers.TransactionResponse> {
  const tx = await signer.sendTransaction({
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value,
    gasLimit: quote.transactionRequest.gasLimit,
  });

  return tx;
}
