/**
 * Business Token Service
 * Pure functions wrapping BusinessToken (ERC-20) smart contract calls.
 * Uses dependency injection — accepts an ethers-like contract factory.
 * ZERO runtime dependencies.
 */

import type { TransferPolicy } from '../types/business';
import { BUSINESS_TOKEN_ABI } from '../constants/business';
import type { ContractFactory } from './business-factory.service';

// ============================================
// Return types
// ============================================

export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  transferPolicy: TransferPolicy;
  treasuryAddress: string;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percent: number;
}

// ============================================
// Internal helpers
// ============================================

function indexToTransferPolicy(index: number): TransferPolicy {
  return index === 0 ? 'FREE' : 'APPROVAL_REQUIRED';
}

// ============================================
// Service functions
// ============================================

/**
 * Get full token info from a BusinessToken contract.
 */
export async function getTokenInfo(
  contractFactory: ContractFactory,
  tokenAddress: string,
  provider: unknown,
): Promise<TokenInfo> {
  const contract = contractFactory(tokenAddress, BUSINESS_TOKEN_ABI, provider);

  const [name, symbol, totalSupply, decimals, transferPolicy, treasuryAddress] = await Promise.all([
    contract['name']() as Promise<string>,
    contract['symbol']() as Promise<string>,
    contract['totalSupply']() as Promise<bigint>,
    contract['decimals']() as Promise<number>,
    contract['transferPolicy']() as Promise<number>,
    contract['treasury']() as Promise<string>,
  ]);

  return {
    name,
    symbol,
    totalSupply: Number(totalSupply),
    decimals: Number(decimals),
    transferPolicy: indexToTransferPolicy(Number(transferPolicy)),
    treasuryAddress,
  };
}

/**
 * Get the share balance of a specific address.
 */
export async function getShareBalance(
  contractFactory: ContractFactory,
  tokenAddress: string,
  provider: unknown,
  address: string,
): Promise<number> {
  const contract = contractFactory(tokenAddress, BUSINESS_TOKEN_ABI, provider);
  const balance = (await contract['balanceOf'](address)) as bigint;
  return Number(balance);
}

/**
 * Get all known holders with their balances and ownership percentages.
 * Since ERC-20 doesn't have an enumerable holder list on-chain,
 * you must supply the list of known addresses (founders, transfer recipients, etc.).
 */
export async function getAllHolders(
  contractFactory: ContractFactory,
  tokenAddress: string,
  provider: unknown,
  knownAddresses: string[],
): Promise<TokenHolder[]> {
  const contract = contractFactory(tokenAddress, BUSINESS_TOKEN_ABI, provider);

  const totalSupply = Number((await contract['totalSupply']()) as bigint);

  if (totalSupply === 0) {
    return knownAddresses.map((addr) => ({
      address: addr,
      balance: 0,
      percent: 0,
    }));
  }

  const balancePromises = knownAddresses.map(async (addr) => {
    const balance = Number((await contract['balanceOf'](addr)) as bigint);
    return {
      address: addr,
      balance,
      percent: Math.round((balance / totalSupply) * 10000) / 100,
    };
  });

  const holders = await Promise.all(balancePromises);

  // Filter out zero-balance addresses
  return holders.filter((h) => h.balance > 0);
}
