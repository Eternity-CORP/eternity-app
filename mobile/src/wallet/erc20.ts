/**
 * ERC-20 Token Operations
 * 
 * Supports:
 * - Standard ERC-20 tokens
 * - "Silent" tokens (transfer without returns bool)
 * - Metadata fetching (symbol, decimals, name)
 * - Balance checking
 * - Token transfers with gas estimation
 * 
 * Features:
 * - Automatic decimals conversion
 * - Support for both human-readable and smallest units
 * - Robust error handling for non-standard tokens
 */

import { ethers, BigNumber } from 'ethers';
import { getProvider } from '../services/blockchain/ethereumProvider';
import { getSigner, getAddress } from '../services/walletService';
import { estimateGasForERC20, type GasEstimate, type GasFeeLevel } from '../services/blockchain/gasEstimatorService';
import type { Network } from '../config/env';

// Import ERC-20 ABI
import ERC20_ABI from '../abi/erc20.json';

// ============================================================================
// Types
// ============================================================================

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface TokenBalance {
  balance: BigNumber;
  balanceFormatted: string;
  decimals: number;
}

export interface SendErc20Params {
  token: string;                    // Token contract address
  to: string;                       // Recipient address
  amountUnits?: BigNumber;          // Amount in smallest units (e.g., wei for 18 decimals)
  amountHuman?: string;             // Amount in human-readable format (e.g., "1.5")
  feeLevel?: GasFeeLevel;          // Gas fee level (low/medium/high)
  gasLimit?: BigNumber;            // Custom gas limit
  maxFeePerGas?: BigNumber;        // Custom max fee per gas (EIP-1559)
  maxPriorityFeePerGas?: BigNumber; // Custom priority fee (EIP-1559)
  network?: Network;
}

export interface SendErc20Result {
  hash: string;
  nonce: number;
  from: string;
  to: string;
  token: string;
  value: string;                    // Human-readable amount
  valueUnits: BigNumber;            // Amount in smallest units
  gasEstimate: GasEstimate;
  timestamp: number;
  response: ethers.providers.TransactionResponse;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class TokenError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TokenError';
  }
}

export class InvalidTokenAddressError extends TokenError {
  constructor(address: string) {
    super(`Invalid token address: ${address}`, 'INVALID_TOKEN_ADDRESS', { address });
    this.name = 'InvalidTokenAddressError';
  }
}

export class TokenMetadataError extends TokenError {
  constructor(address: string, field: string, originalError?: any) {
    super(
      `Failed to fetch ${field} for token ${address}`,
      'TOKEN_METADATA_ERROR',
      { address, field, originalError: originalError?.message }
    );
    this.name = 'TokenMetadataError';
  }
}

export class InsufficientTokenBalanceError extends TokenError {
  constructor(required: string, available: string, symbol: string) {
    super(
      `Insufficient ${symbol} balance. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_TOKEN_BALANCE',
      { required, available, symbol }
    );
    this.name = 'InsufficientTokenBalanceError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate Ethereum address
 */
function validateTokenAddress(address: string): string {
  if (!address || !ethers.utils.isAddress(address)) {
    throw new InvalidTokenAddressError(address);
  }
  return ethers.utils.getAddress(address); // Return checksummed address
}

/**
 * Format token amount from smallest units to human-readable
 */
export function formatTokenAmount(amount: BigNumber, decimals: number): string {
  return ethers.utils.formatUnits(amount, decimals);
}

/**
 * Parse human-readable amount to smallest units
 */
export function parseTokenAmount(amount: string, decimals: number): BigNumber {
  try {
    return ethers.utils.parseUnits(amount, decimals);
  } catch (error) {
    const err = error as Error;
    throw new TokenError(
      `Invalid amount format: ${amount}`,
      'INVALID_AMOUNT_FORMAT',
      { amount, decimals, error: err.message }
    );
  }
}

// ============================================================================
// Token Metadata Functions
// ============================================================================

/**
 * Get ERC-20 token metadata (symbol, name, decimals)
 * 
 * Handles tokens that may not implement all optional methods
 */
export async function getErc20Meta(
  tokenAddress: string,
  network?: Network
): Promise<TokenMetadata> {
  const validatedAddress = validateTokenAddress(tokenAddress);
  const provider = getProvider(network);
  
  const contract = new ethers.Contract(validatedAddress, ERC20_ABI, provider);
  
  try {
    // Fetch metadata in parallel
    const [symbol, name, decimals] = await Promise.all([
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.name().catch(() => 'Unknown Token'),
      contract.decimals().catch(() => 18), // Default to 18 if not available
    ]);
    
    return {
      address: validatedAddress,
      symbol,
      name,
      decimals,
    };
  } catch (error) {
    const err = error as Error;
    throw new TokenMetadataError(validatedAddress, 'metadata', err);
  }
}

/**
 * Get token symbol
 */
export async function getTokenSymbol(
  tokenAddress: string,
  network?: Network
): Promise<string> {
  const validatedAddress = validateTokenAddress(tokenAddress);
  const provider = getProvider(network);
  
  const contract = new ethers.Contract(validatedAddress, ERC20_ABI, provider);
  
  try {
    return await contract.symbol();
  } catch (error: any) {
    console.warn(`Failed to get symbol for ${validatedAddress}, using UNKNOWN`);
    return 'UNKNOWN';
  }
}

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  tokenAddress: string,
  network?: Network
): Promise<number> {
  const validatedAddress = validateTokenAddress(tokenAddress);
  const provider = getProvider(network);
  
  const contract = new ethers.Contract(validatedAddress, ERC20_ABI, provider);
  
  try {
    return await contract.decimals();
  } catch (error: any) {
    console.warn(`Failed to get decimals for ${validatedAddress}, using 18`);
    return 18; // Default to 18 decimals
  }
}

// ============================================================================
// Balance Functions
// ============================================================================

/**
 * Get ERC-20 token balance (in smallest units)
 * 
 * Returns BigNumber for precise calculations
 */
export async function getErc20Balance(
  tokenAddress: string,
  address: string,
  network?: Network
): Promise<BigNumber> {
  const validatedTokenAddress = validateTokenAddress(tokenAddress);
  const validatedAddress = ethers.utils.getAddress(address);
  const provider = getProvider(network);
  
  const contract = new ethers.Contract(validatedTokenAddress, ERC20_ABI, provider);
  
  try {
    const balance: BigNumber = await contract.balanceOf(validatedAddress);
    return balance;
  } catch (error: any) {
    throw new TokenError(
      `Failed to get balance for ${validatedAddress}`,
      'BALANCE_FETCH_ERROR',
      { tokenAddress: validatedTokenAddress, address: validatedAddress, error: error.message }
    );
  }
}

/**
 * Get ERC-20 token balance with metadata (formatted)
 */
export async function getErc20BalanceFormatted(
  tokenAddress: string,
  address: string,
  network?: Network
): Promise<TokenBalance> {
  const balance = await getErc20Balance(tokenAddress, address, network);
  const decimals = await getTokenDecimals(tokenAddress, network);
  
  return {
    balance,
    balanceFormatted: formatTokenAmount(balance, decimals),
    decimals,
  };
}

// ============================================================================
// Transfer Functions
// ============================================================================

/**
 * Send ERC-20 tokens
 * 
 * Supports:
 * - Standard tokens (with returns bool)
 * - "Silent" tokens (without returns bool)
 * - Both amountUnits and amountHuman
 * - Automatic gas estimation
 * - Custom gas parameters
 * 
 * @param params - Transfer parameters
 * @returns Transaction result
 */
export async function sendErc20(params: SendErc20Params): Promise<SendErc20Result> {
  const {
    token,
    to,
    amountUnits,
    amountHuman,
    feeLevel = 'medium',
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    network,
  } = params;
  
  console.log('🪙 Sending ERC-20 token...');
  console.log(`  Token: ${token}`);
  console.log(`  To: ${to}`);
  console.log(`  Amount Units: ${amountUnits?.toString()}`);
  console.log(`  Amount Human: ${amountHuman}`);
  
  // Validate addresses
  const validatedToken = validateTokenAddress(token);
  const validatedTo = ethers.utils.getAddress(to);
  
  // Get sender address
  const from = await getAddress();
  if (!from) {
    throw new TokenError('No wallet address available', 'NO_WALLET');
  }
  
  // Get token metadata
  const metadata = await getErc20Meta(validatedToken, network);
  console.log(`  Token: ${metadata.symbol} (${metadata.decimals} decimals)`);
  
  // Determine amount in smallest units
  let transferAmount: BigNumber;
  
  if (amountUnits) {
    transferAmount = amountUnits;
  } else if (amountHuman) {
    transferAmount = parseTokenAmount(amountHuman, metadata.decimals);
  } else {
    throw new TokenError('Either amountUnits or amountHuman must be provided', 'NO_AMOUNT');
  }
  
  console.log(`  Transfer Amount: ${transferAmount.toString()} (${formatTokenAmount(transferAmount, metadata.decimals)} ${metadata.symbol})`);
  
  // Check balance
  const balance = await getErc20Balance(validatedToken, from, network);
  if (balance.lt(transferAmount)) {
    throw new InsufficientTokenBalanceError(
      formatTokenAmount(transferAmount, metadata.decimals),
      formatTokenAmount(balance, metadata.decimals),
      metadata.symbol
    );
  }
  
  // Get signer
  const signer = await getSigner(network);
  
  // Create contract instance
  const contract = new ethers.Contract(validatedToken, ERC20_ABI, signer);
  
  // Get nonce
  const provider = getProvider(network);
  const nonce = await provider.getTransactionCount(from, 'pending');
  console.log(`  Nonce: ${nonce}`);
  
  // Estimate gas or use provided values
  let gasEstimate: GasEstimate;
  
  if (gasLimit && (maxFeePerGas || maxPriorityFeePerGas)) {
    // Use custom gas parameters
    console.log('⚙️  Using custom gas parameters');
    gasEstimate = {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      totalFeeTH: '0', // Will be calculated
      isEIP1559: !!(maxFeePerGas && maxPriorityFeePerGas),
      level: 'custom',
    };
  } else {
    // Estimate gas automatically
    console.log('⚙️  Estimating gas...');
    const feeOptions = await estimateGasForERC20(
      validatedToken,
      validatedTo,
      transferAmount,
      network
    );
    
    gasEstimate = feeOptions[feeLevel === 'custom' ? 'medium' : feeLevel];
    console.log(`  Gas Limit: ${gasEstimate.gasLimit.toString()}`);
    console.log(`  Total Fee: ${gasEstimate.totalFeeTH} ETH`);
  }
  
  // Prepare transaction
  const txRequest: any = {
    nonce,
    gasLimit: gasEstimate.gasLimit,
  };
  
  // Add gas price (EIP-1559 or legacy)
  if (gasEstimate.isEIP1559 && gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
    txRequest.maxFeePerGas = gasEstimate.maxFeePerGas;
    txRequest.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
    txRequest.type = 2; // EIP-1559
  } else if (gasEstimate.gasPrice) {
    txRequest.gasPrice = gasEstimate.gasPrice;
    txRequest.type = 0; // Legacy
  }
  
  try {
    console.log('📤 Sending transaction...');
    
    // Call transfer function
    // Note: Some tokens don't return bool, so we handle both cases
    const tx = await contract.transfer(validatedTo, transferAmount, txRequest);
    
    console.log(`✅ Transaction sent: ${tx.hash}`);
    
    // Note: Transaction tracking can be added later if needed
    // For now, we just return the result
    
    const result: SendErc20Result = {
      hash: tx.hash,
      nonce,
      from,
      to: validatedTo,
      token: validatedToken,
      value: formatTokenAmount(transferAmount, metadata.decimals),
      valueUnits: transferAmount,
      gasEstimate,
      timestamp: Date.now(),
      response: tx,
    };
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new TokenError(
        'Insufficient ETH for gas fees',
        'INSUFFICIENT_GAS',
        { error: error.message }
      );
    }
    
    if (error.code === 'NONCE_EXPIRED' || error.message?.includes('nonce')) {
      throw new TokenError(
        'Nonce too low. Please wait for previous transactions to confirm.',
        'NONCE_TOO_LOW',
        { error: error.message }
      );
    }
    
    if (error.code === 'REPLACEMENT_UNDERPRICED') {
      throw new TokenError(
        'Gas price too low. Please increase gas price.',
        'UNDERPRICED',
        { error: error.message }
      );
    }
    
    // Generic error
    throw new TokenError(
      error.message || 'Failed to send token',
      error.code || 'TRANSFER_FAILED',
      { error: error.message, originalError: error }
    );
  }
}

/**
 * Approve token spending (for DEX, etc.)
 */
export async function approveErc20(
  tokenAddress: string,
  spender: string,
  amount: BigNumber,
  network?: Network
): Promise<ethers.providers.TransactionResponse> {
  const validatedToken = validateTokenAddress(tokenAddress);
  const validatedSpender = ethers.utils.getAddress(spender);
  
  const signer = await getSigner(network);
  const contract = new ethers.Contract(validatedToken, ERC20_ABI, signer);
  
  try {
    const tx = await contract.approve(validatedSpender, amount);
    console.log(`✅ Approval transaction sent: ${tx.hash}`);
    return tx;
  } catch (error: any) {
    throw new TokenError(
      `Failed to approve ${validatedSpender}`,
      'APPROVAL_FAILED',
      { error: error.message }
    );
  }
}

/**
 * Check token allowance
 */
export async function getErc20Allowance(
  tokenAddress: string,
  owner: string,
  spender: string,
  network?: Network
): Promise<BigNumber> {
  const validatedToken = validateTokenAddress(tokenAddress);
  const validatedOwner = ethers.utils.getAddress(owner);
  const validatedSpender = ethers.utils.getAddress(spender);
  
  const provider = getProvider(network);
  const contract = new ethers.Contract(validatedToken, ERC20_ABI, provider);
  
  try {
    return await contract.allowance(validatedOwner, validatedSpender);
  } catch (error: any) {
    throw new TokenError(
      'Failed to get allowance',
      'ALLOWANCE_FETCH_ERROR',
      { error: error.message }
    );
  }
}
