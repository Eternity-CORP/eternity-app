/**
 * Contract Factory Utility
 * Creates ethers.Contract instances compatible with @e-y/shared ContractFactory type.
 * Single source of truth for mobile — eliminates inline copies across screens.
 */

import { ethers } from 'ethers';
import type { EthersLikeContract, ContractFactory } from '@e-y/shared';

/**
 * Standard ContractFactory that wraps ethers.Contract.
 * Use when you already have a signer/provider to pass per-call.
 */
export const ethersContractFactory: ContractFactory = (
  address: string,
  abi: readonly unknown[],
  signerOrProvider?: unknown,
) =>
  new ethers.Contract(
    address,
    abi as ethers.InterfaceAbi,
    signerOrProvider as ethers.ContractRunner,
  ) as unknown as EthersLikeContract;
