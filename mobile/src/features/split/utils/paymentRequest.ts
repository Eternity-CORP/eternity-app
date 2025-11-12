/**
 * Payment Request Generator (EIP-681)
 * 
 * Generates payment URIs for split bill participants:
 * - ETH: ethereum:<address>?value=<wei>&chain_id=<id>
 * - ERC-20: ethereum:<token>/transfer?address=<recipient>&uint256=<amount>&chain_id=<id>
 * 
 * Reference: https://eips.ethereum.org/EIPS/eip-681
 */

import { ethers } from 'ethers';
import type { SplitBill, SplitParticipant } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PaymentRequest {
  participantId: string;
  participantAddress: string;
  recipientAddress: string;
  amountSmallestUnit: string;
  amountHuman: string;
  chainId: number;
  asset: {
    type: 'ETH' | 'ERC20';
    tokenAddress?: string;
    symbol?: string;
    decimals?: number;
  };
  uri: string;
  qrData: string;
  shareText: string;
}

export interface GeneratePaymentRequestParams {
  bill: SplitBill;
  participant: SplitParticipant;
  recipientAddress: string; // Our address to receive payment
}

// ============================================================================
// EIP-681 URI Generator
// ============================================================================

/**
 * Generate EIP-681 payment URI for ETH
 * 
 * Format: ethereum:<address>?value=<wei>&chain_id=<id>
 * 
 * @example
 * ethereum:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266?value=1000000000000000000&chain_id=11155111
 */
function generateEthUri(
  recipientAddress: string,
  amountWei: string,
  chainId: number
): string {
  // Remove 0x prefix from address
  const address = recipientAddress.toLowerCase().replace('0x', '');
  
  return `ethereum:${address}?value=${amountWei}&chain_id=${chainId}`;
}

/**
 * Generate EIP-681 payment URI for ERC-20
 * 
 * Format: ethereum:<token>/transfer?address=<recipient>&uint256=<amount>&chain_id=<id>
 * 
 * @example
 * ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/transfer?address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&uint256=1000000&chain_id=1
 */
function generateErc20Uri(
  tokenAddress: string,
  recipientAddress: string,
  amountSmallestUnit: string,
  chainId: number
): string {
  // Remove 0x prefix
  const token = tokenAddress.toLowerCase().replace('0x', '');
  const recipient = recipientAddress.toLowerCase().replace('0x', '');
  
  return `ethereum:${token}/transfer?address=${recipient}&uint256=${amountSmallestUnit}&chain_id=${chainId}`;
}

/**
 * Generate payment request for participant
 */
export function generatePaymentRequest(
  params: GeneratePaymentRequestParams
): PaymentRequest {
  const { bill, participant, recipientAddress } = params;

  // Validate recipient address
  if (!ethers.utils.isAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  // Get checksummed address
  const checksummedRecipient = ethers.utils.getAddress(recipientAddress);

  // Generate URI based on asset type
  let uri: string;
  
  if (bill.asset.type === 'ETH') {
    uri = generateEthUri(
      checksummedRecipient,
      participant.amountSmallestUnit || '0',
      bill.chainId
    );
  } else {
    // ERC-20
    if (!bill.asset.tokenAddress) {
      throw new Error('Token address required for ERC-20');
    }
    
    uri = generateErc20Uri(
      bill.asset.tokenAddress,
      checksummedRecipient,
      participant.amountSmallestUnit || '0',
      bill.chainId
    );
  }

  // Generate human-readable share text
  const shareText = generateShareText(bill, participant, checksummedRecipient);

  return {
    participantId: participant.id,
    participantAddress: participant.address,
    recipientAddress: checksummedRecipient,
    amountSmallestUnit: participant.amountSmallestUnit || '0',
    amountHuman: ethers.utils.formatUnits(
      participant.amountSmallestUnit || '0',
      bill.asset.decimals || 18
    ),
    chainId: bill.chainId,
    asset: bill.asset,
    uri,
    qrData: uri,
    shareText,
  };
}

/**
 * Generate all payment requests for a bill
 */
export function generateAllPaymentRequests(
  bill: SplitBill,
  recipientAddress: string
): PaymentRequest[] {
  return bill.participants
    .filter((p) => p.payStatus === 'pending')
    .map((participant) =>
      generatePaymentRequest({
        bill,
        participant,
        recipientAddress,
      })
    );
}

// ============================================================================
// Share Text Generator
// ============================================================================

/**
 * Generate human-readable share text
 */
function generateShareText(
  bill: SplitBill,
  participant: SplitParticipant,
  recipientAddress: string
): string {
  const networkName = getNetworkName(bill.chainId);
  const symbol = bill.asset.symbol || 'ETH';
  const amount = ethers.utils.formatUnits(
    participant.amountSmallestUnit || '0',
    bill.asset.decimals || 18
  );

  let text = `💰 Payment Request\n\n`;
  
  if (bill.note) {
    text += `For: ${bill.note}\n`;
  }
  
  text += `Amount: ${amount} ${symbol}\n`;
  text += `Network: ${networkName}\n`;
  text += `To: ${recipientAddress}\n\n`;
  
  if (bill.asset.type === 'ERC20' && bill.asset.tokenAddress) {
    text += `Token: ${bill.asset.tokenAddress}\n\n`;
  }
  
  text += `Please send exactly ${amount} ${symbol} to complete your share.\n\n`;
  text += `Payment URI:\n${generatePaymentRequest({ bill, participant, recipientAddress }).uri}`;
  
  return text;
}

/**
 * Get network name from chain ID
 */
function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    17000: 'Holesky Testnet',
    137: 'Polygon',
    10: 'Optimism',
    42161: 'Arbitrum',
  };
  
  return networks[chainId] || `Chain ID ${chainId}`;
}

// ============================================================================
// URI Parser (for validation)
// ============================================================================

export interface ParsedPaymentUri {
  type: 'ETH' | 'ERC20';
  address: string;
  tokenAddress?: string;
  amountWei: string;
  chainId: number;
}

/**
 * Parse EIP-681 URI
 */
export function parsePaymentUri(uri: string): ParsedPaymentUri {
  // Remove ethereum: prefix
  if (!uri.startsWith('ethereum:')) {
    throw new Error('Invalid URI: must start with ethereum:');
  }
  
  const withoutPrefix = uri.substring('ethereum:'.length);
  
  // Check if ERC-20 (has /transfer)
  if (withoutPrefix.includes('/transfer')) {
    return parseErc20Uri(withoutPrefix);
  } else {
    return parseEthUri(withoutPrefix);
  }
}

/**
 * Parse ETH URI
 * Format: <address>?value=<wei>&chain_id=<id>
 */
function parseEthUri(uri: string): ParsedPaymentUri {
  const [address, queryString] = uri.split('?');
  
  if (!queryString) {
    throw new Error('Invalid ETH URI: missing query parameters');
  }
  
  const params = new URLSearchParams(queryString);
  const value = params.get('value');
  const chainId = params.get('chain_id');
  
  if (!value) {
    throw new Error('Invalid ETH URI: missing value');
  }
  
  if (!chainId) {
    throw new Error('Invalid ETH URI: missing chain_id');
  }
  
  return {
    type: 'ETH',
    address: `0x${address}`,
    amountWei: value,
    chainId: parseInt(chainId, 10),
  };
}

/**
 * Parse ERC-20 URI
 * Format: <token>/transfer?address=<recipient>&uint256=<amount>&chain_id=<id>
 */
function parseErc20Uri(uri: string): ParsedPaymentUri {
  const [tokenPart, queryString] = uri.split('?');
  
  if (!queryString) {
    throw new Error('Invalid ERC-20 URI: missing query parameters');
  }
  
  const tokenAddress = tokenPart.replace('/transfer', '');
  
  const params = new URLSearchParams(queryString);
  const address = params.get('address');
  const amount = params.get('uint256');
  const chainId = params.get('chain_id');
  
  if (!address) {
    throw new Error('Invalid ERC-20 URI: missing address');
  }
  
  if (!amount) {
    throw new Error('Invalid ERC-20 URI: missing uint256');
  }
  
  if (!chainId) {
    throw new Error('Invalid ERC-20 URI: missing chain_id');
  }
  
  return {
    type: 'ERC20',
    address: `0x${address}`,
    tokenAddress: `0x${tokenAddress}`,
    amountWei: amount,
    chainId: parseInt(chainId, 10),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate payment request matches participant
 */
export function validatePaymentRequest(
  request: PaymentRequest,
  participant: SplitParticipant
): boolean {
  // Check participant ID
  if (request.participantId !== participant.id) {
    return false;
  }
  
  // Check amount matches
  if (request.amountSmallestUnit !== participant.amountSmallestUnit) {
    return false;
  }
  
  return true;
}

/**
 * Check if amount matches with tolerance
 * 
 * Allows small rounding differences (e.g., ±1 wei)
 */
export function amountMatchesWithTolerance(
  amount1: string,
  amount2: string,
  toleranceWei: string = '1'
): boolean {
  const bn1 = ethers.BigNumber.from(amount1);
  const bn2 = ethers.BigNumber.from(amount2);
  const tolerance = ethers.BigNumber.from(toleranceWei);
  
  const diff = bn1.sub(bn2).abs();
  
  return diff.lte(tolerance);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get explorer URL for address
 */
export function getExplorerAddressUrl(
  address: string,
  chainId: number
): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/address/',
    11155111: 'https://sepolia.etherscan.io/address/',
    17000: 'https://holesky.etherscan.io/address/',
  };
  
  const baseUrl = explorers[chainId] || explorers[11155111];
  return `${baseUrl}${address}`;
}

/**
 * Get explorer URL for token
 */
export function getExplorerTokenUrl(
  tokenAddress: string,
  chainId: number
): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/token/',
    11155111: 'https://sepolia.etherscan.io/token/',
    17000: 'https://holesky.etherscan.io/token/',
  };
  
  const baseUrl = explorers[chainId] || explorers[11155111];
  return `${baseUrl}${tokenAddress}`;
}
