/**
 * Business Factory Service
 * Pure functions wrapping BusinessFactory smart contract calls.
 * Uses dependency injection — accepts an ethers-like contract factory.
 * ZERO runtime dependencies.
 */

import type { CreateBusinessParams, TransferPolicy } from '../types/business';
import { BUSINESS_FACTORY_ABI } from '../constants/business';
import { proposalTypeToIndex } from '../utils/business';

// ============================================
// Dependency injection interfaces
// ============================================

/**
 * Minimal interface for an ethers-like contract instance.
 * The actual ethers.Contract is passed in from the app layer.
 */
export interface EthersLikeContract {
  [method: string]: (...args: unknown[]) => Promise<unknown>;
}

/**
 * Minimal interface for an ethers-like provider (read-only).
 */
export interface EthersLikeProvider {
  getBalance(address: string): Promise<bigint>;
}

/**
 * Factory function that creates a contract instance.
 * Mirrors `new ethers.Contract(address, abi, signerOrProvider)`.
 */
export type ContractFactory = (
  address: string,
  abi: readonly unknown[],
  signerOrProvider?: unknown,
) => EthersLikeContract;

// ============================================
// Return types
// ============================================

export interface CreateBusinessResult {
  businessId: number;
  tokenAddress: string;
  treasuryAddress: string;
  txHash: string;
}

export interface BusinessDetails {
  tokenAddress: string;
  treasuryAddress: string;
  creator: string;
  name: string;
  createdAt: number;
}

// ============================================
// Internal helpers
// ============================================

function transferPolicyToIndex(policy: TransferPolicy): number {
  return policy === 'FREE' ? 0 : 1;
}

// ============================================
// Service functions
// ============================================

/**
 * Deploy a new business via the BusinessFactory contract.
 * Requires a signer-backed contract factory.
 */
export async function createBusiness(
  contractFactory: ContractFactory,
  factoryAddress: string,
  signer: unknown,
  params: CreateBusinessParams,
): Promise<CreateBusinessResult> {
  const contract = contractFactory(factoryAddress, BUSINESS_FACTORY_ABI, signer);

  const founders = params.founders.map((f) => f.address);
  const shares = params.founders.map((f) => f.shares);

  // Convert vesting config from months to seconds
  const vestingEnabled = params.vestingEnabled && !!params.vestingConfig;
  const cliffSeconds = vestingEnabled
    ? (params.vestingConfig!.cliffMonths * 30 * 24 * 3600)
    : 0;
  const vestingSeconds = vestingEnabled
    ? (params.vestingConfig!.durationMonths * 30 * 24 * 3600)
    : 0;

  // Ethers v6: tuple struct must be passed as an array (positional),
  // NOT as a plain object (which ethers interprets as tx overrides).
  const tupleParam = [
    params.name,
    params.tokenSymbol,
    params.tokenSupply,
    founders,
    shares,
    transferPolicyToIndex(params.transferPolicy),
    params.quorumThreshold,
    params.votingPeriod,
    vestingEnabled,
    cliffSeconds,
    vestingSeconds,
  ];

  const tx = (await contract['createBusiness'](tupleParam)) as {
    hash: string;
    wait(): Promise<{ logs: unknown[] }>;
  };

  const receipt = await tx.wait();

  // Parse BusinessCreated event from logs.
  // BusinessCreated(uint256 indexed businessId, address tokenAddress, address treasuryAddress, address creator, string name, string symbol)
  // keccak256 topic0: 0x + first 64 hex chars of keccak256("BusinessCreated(uint256,address,address,address,string,string)")
  let businessId = 0;
  let tokenAddress = '';
  let treasuryAddress = '';

  const logs = receipt.logs as Array<{
    // Ethers EventLog (decoded)
    args?: { businessId?: bigint; tokenAddress?: string; treasuryAddress?: string };
    fragment?: { name?: string };
    // Raw Log fields
    topics?: string[];
    data?: string;
    address?: string;
  }>;

  for (const log of logs) {
    // Method 1: decoded EventLog (when ethers decodes it)
    if (log.fragment?.name === 'BusinessCreated' && log.args) {
      businessId = Number(log.args.businessId ?? 0);
      tokenAddress = log.args.tokenAddress ?? '';
      treasuryAddress = log.args.treasuryAddress ?? '';
      break;
    }

    // Method 2: raw log — match by emitter address (factory) and decode manually
    if (
      log.address?.toLowerCase() === factoryAddress.toLowerCase() &&
      log.topics &&
      log.topics.length === 2 &&
      log.data
    ) {
      // topics[0] = event signature, topics[1] = indexed businessId
      // data = abi.encode(address tokenAddress, address treasuryAddress, address creator, string name, string symbol)
      try {
        businessId = Number(BigInt(log.topics[1]));
        // Decode non-indexed params: (address, address, address, string, string)
        // Quick extraction: addresses are at fixed offsets in ABI encoding
        // Each address is left-padded to 32 bytes in the data
        const dataHex = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
        // First 3 slots (each 64 hex chars) are: tokenAddress, treasuryAddress, creator
        tokenAddress = '0x' + dataHex.slice(24, 64);
        treasuryAddress = '0x' + dataHex.slice(88, 128);
        break;
      } catch {
        // Skip if parsing fails
      }
    }
  }

  return {
    businessId,
    tokenAddress,
    treasuryAddress,
    txHash: tx.hash,
  };
}

/**
 * Get total number of businesses created via the factory.
 */
export async function getBusinessCount(
  contractFactory: ContractFactory,
  factoryAddress: string,
  provider: unknown,
): Promise<number> {
  const contract = contractFactory(factoryAddress, BUSINESS_FACTORY_ABI, provider);
  const count = (await contract['getBusinessCount']()) as bigint;
  return Number(count);
}

/**
 * Get list of business IDs owned by a specific address.
 */
export async function getBusinessesByOwner(
  contractFactory: ContractFactory,
  factoryAddress: string,
  provider: unknown,
  owner: string,
): Promise<number[]> {
  const contract = contractFactory(factoryAddress, BUSINESS_FACTORY_ABI, provider);
  const ids = (await contract['getBusinessesByOwner'](owner)) as bigint[];
  return ids.map((id) => Number(id));
}

/**
 * Get details of a specific business by ID.
 */
export async function getBusinessDetails(
  contractFactory: ContractFactory,
  factoryAddress: string,
  provider: unknown,
  id: number,
): Promise<BusinessDetails> {
  const contract = contractFactory(factoryAddress, BUSINESS_FACTORY_ABI, provider);
  const result = (await contract['getBusiness'](id)) as {
    tokenAddress: string;
    treasuryAddress: string;
    creator: string;
    name: string;
    createdAt: bigint;
  };

  return {
    tokenAddress: result.tokenAddress,
    treasuryAddress: result.treasuryAddress,
    creator: result.creator,
    name: result.name,
    createdAt: Number(result.createdAt),
  };
}
