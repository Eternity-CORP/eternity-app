import { ethers } from 'ethers'
import type { EthersLikeContract, ContractFactory } from '@e-y/shared'

/**
 * Create a ContractFactory that wraps ethers.Contract into the shared
 * EthersLikeContract interface expected by @e-y/shared helpers.
 *
 * Use this instead of inline lambdas to avoid duplicating the cast
 * in every component that interacts with on-chain contracts.
 */
export const createContractFactory: ContractFactory = (
  address: string,
  abi: readonly unknown[],
  signerOrProvider?: unknown,
) =>
  new ethers.Contract(
    address,
    abi as ethers.InterfaceAbi,
    signerOrProvider as ethers.ContractRunner,
  ) as unknown as EthersLikeContract
