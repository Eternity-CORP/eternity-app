/**
 * EIP-681 Service
 *
 * Implements EIP-681: URL Format for Transaction Requests
 * https://eips.ethereum.org/EIPS/eip-681
 *
 * Generates standardized URIs for Ethereum payment requests
 * that can be encoded in QR codes and shared across wallets.
 *
 * Format: ethereum:<address>[@<chain_id>][/<function_name>][?<parameters>]
 *
 * Features:
 * - Generate payment request URIs
 * - Support for ETH and ERC-20 tokens
 * - Chain ID specification
 * - Amount and gas parameters
 * - Parse incoming URIs
 * - Validate URI format
 */

import { ethers } from 'ethers';

// Types
export interface EIP681PaymentRequest {
  address: string; // Recipient address
  chainId?: number; // Chain ID (1 = mainnet, 11155111 = sepolia)
  value?: string; // Amount in wei (for ETH) or token units
  token?: string; // ERC-20 token contract address
  gas?: string; // Gas limit
  gasPrice?: string; // Gas price in wei
  data?: string; // Transaction data (for contract calls)
  functionName?: string; // Function to call (for contract interactions)
  parameters?: Record<string, string>; // Additional parameters
}

export interface ParsedEIP681 {
  scheme: string; // Should be 'ethereum'
  address: string;
  chainId?: number;
  functionName?: string;
  parameters: Record<string, string>;
  isValid: boolean;
  error?: string;
}

// Chain IDs
const CHAIN_IDS = {
  mainnet: 1,
  sepolia: 11155111,
  goerli: 5,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
} as const;

/**
 * Generate EIP-681 URI for ETH payment
 */
export function generateEthPaymentURI(
  address: string,
  chainId?: number,
  amountEth?: string
): string {
  if (!ethers.utils.isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }

  // Start with base URI
  let uri = `ethereum:${address}`;

  // Add chain ID if specified
  if (chainId) {
    uri += `@${chainId}`;
  }

  // Add parameters
  const params: string[] = [];

  if (amountEth) {
    // Convert ETH to wei
    const valueWei = ethers.utils.parseEther(amountEth).toString();
    params.push(`value=${valueWei}`);
  }

  // Append parameters if any
  if (params.length > 0) {
    uri += `?${params.join('&')}`;
  }

  return uri;
}

/**
 * Generate EIP-681 URI for ERC-20 token payment
 */
export function generateTokenPaymentURI(
  recipientAddress: string,
  tokenAddress: string,
  amount: string,
  chainId?: number
): string {
  if (!ethers.utils.isAddress(recipientAddress)) {
    throw new Error('Invalid recipient address');
  }

  if (!ethers.utils.isAddress(tokenAddress)) {
    throw new Error('Invalid token contract address');
  }

  // Start with token contract address
  let uri = `ethereum:${tokenAddress}`;

  // Add chain ID if specified
  if (chainId) {
    uri += `@${chainId}`;
  }

  // ERC-20 transfer function
  uri += `/transfer`;

  // Parameters for transfer function
  const params = [
    `address=${recipientAddress}`,
    `uint256=${amount}`,
  ];

  uri += `?${params.join('&')}`;

  return uri;
}

/**
 * Generate simple receive URI (just address)
 */
export function generateReceiveURI(
  address: string,
  chainId?: number
): string {
  return generateEthPaymentURI(address, chainId);
}

/**
 * Generate URI with all optional parameters
 */
export function generateAdvancedURI(request: EIP681PaymentRequest): string {
  if (!ethers.utils.isAddress(request.address)) {
    throw new Error('Invalid Ethereum address');
  }

  // Start with address
  let uri = `ethereum:${request.address}`;

  // Add chain ID if specified
  if (request.chainId) {
    uri += `@${request.chainId}`;
  }

  // Add function name if specified
  if (request.functionName) {
    uri += `/${request.functionName}`;
  }

  // Collect parameters
  const params: string[] = [];

  if (request.value) {
    params.push(`value=${request.value}`);
  }

  if (request.gas) {
    params.push(`gas=${request.gas}`);
  }

  if (request.gasPrice) {
    params.push(`gasPrice=${request.gasPrice}`);
  }

  if (request.data) {
    params.push(`data=${request.data}`);
  }

  // Add custom parameters
  if (request.parameters) {
    Object.entries(request.parameters).forEach(([key, value]) => {
      params.push(`${key}=${value}`);
    });
  }

  // Append parameters if any
  if (params.length > 0) {
    uri += `?${params.join('&')}`;
  }

  return uri;
}

/**
 * Parse EIP-681 URI
 */
export function parseEIP681URI(uri: string): ParsedEIP681 {
  const result: ParsedEIP681 = {
    scheme: '',
    address: '',
    parameters: {},
    isValid: false,
  };

  try {
    // Check if starts with ethereum:
    if (!uri.startsWith('ethereum:')) {
      result.error = 'Invalid scheme: must start with "ethereum:"';
      return result;
    }

    result.scheme = 'ethereum';

    // Remove scheme
    let remaining = uri.substring(9); // Remove 'ethereum:'

    // Parse chain ID and function
    let address = '';
    let chainId: number | undefined;
    let functionName: string | undefined;

    // Split by ? to separate address part from parameters
    const [addressPart, paramsPart] = remaining.split('?');

    // Parse address part
    const addressMatch = addressPart.match(/^([^@\/]+)(@(\d+))?(\/(.+))?$/);

    if (addressMatch) {
      address = addressMatch[1];
      chainId = addressMatch[3] ? parseInt(addressMatch[3], 10) : undefined;
      functionName = addressMatch[5];
    } else {
      result.error = 'Invalid address format';
      return result;
    }

    // Validate address
    if (!ethers.utils.isAddress(address)) {
      result.error = `Invalid Ethereum address: ${address}`;
      return result;
    }

    result.address = address;
    result.chainId = chainId;
    result.functionName = functionName;

    // Parse parameters
    if (paramsPart) {
      const params = paramsPart.split('&');
      params.forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          result.parameters[key] = decodeURIComponent(value);
        }
      });
    }

    result.isValid = true;
    return result;
  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}

/**
 * Validate EIP-681 URI
 */
export function validateEIP681URI(uri: string): {
  isValid: boolean;
  error?: string;
} {
  const parsed = parseEIP681URI(uri);
  return {
    isValid: parsed.isValid,
    error: parsed.error,
  };
}

/**
 * Extract amount from parsed URI (if present)
 * Returns amount in ETH if value parameter exists
 */
export function extractAmountFromURI(parsed: ParsedEIP681): string | null {
  if (!parsed.parameters.value) {
    return null;
  }

  try {
    // Value is in wei, convert to ETH
    const amountEth = ethers.utils.formatEther(parsed.parameters.value);
    return amountEth;
  } catch {
    return null;
  }
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    5: 'Goerli Testnet',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
  };

  return chains[chainId] || `Chain ${chainId}`;
}

/**
 * Format URI for display (shortened address)
 */
export function formatURIForDisplay(uri: string): string {
  const parsed = parseEIP681URI(uri);

  if (!parsed.isValid) {
    return uri;
  }

  // Shorten address
  const shortAddress =
    parsed.address.substring(0, 6) + '...' + parsed.address.substring(38);

  let display = `ethereum:${shortAddress}`;

  if (parsed.chainId) {
    display += `@${getChainName(parsed.chainId)}`;
  }

  if (parsed.parameters.value) {
    const amount = extractAmountFromURI(parsed);
    if (amount) {
      display += ` (${amount} ETH)`;
    }
  }

  return display;
}

/**
 * Generate QR-friendly URI (shorter, optimized for QR codes)
 */
export function generateQROptimizedURI(
  address: string,
  chainId?: number,
  amountEth?: string
): string {
  // For QR codes, we want minimal data
  // Only include chain ID if not mainnet (1)
  const includeChainId = chainId && chainId !== 1;

  return generateEthPaymentURI(
    address,
    includeChainId ? chainId : undefined,
    amountEth
  );
}

/**
 * Check if URI is compatible with popular wallets
 */
export function checkWalletCompatibility(uri: string): {
  isCompatible: boolean;
  compatibleWallets: string[];
  warnings: string[];
} {
  const parsed = parseEIP681URI(uri);

  if (!parsed.isValid) {
    return {
      isCompatible: false,
      compatibleWallets: [],
      warnings: [parsed.error || 'Invalid URI'],
    };
  }

  const compatibleWallets: string[] = [];
  const warnings: string[] = [];

  // Basic format (address only or with value) - widely supported
  if (
    Object.keys(parsed.parameters).length === 0 ||
    (Object.keys(parsed.parameters).length === 1 && parsed.parameters.value)
  ) {
    compatibleWallets.push(
      'MetaMask',
      'Trust Wallet',
      'Coinbase Wallet',
      'Rainbow',
      'Argent',
      'Gnosis Safe'
    );
  }

  // With function calls - limited support
  if (parsed.functionName) {
    warnings.push(
      'Function calls may not be supported by all wallets. Test before sharing.'
    );
  }

  // Unusual parameters
  const standardParams = ['value', 'gas', 'gasPrice', 'data'];
  const hasUnusualParams = Object.keys(parsed.parameters).some(
    (key) => !standardParams.includes(key)
  );

  if (hasUnusualParams) {
    warnings.push('Contains non-standard parameters. May not work with all wallets.');
  }

  // Chain ID warnings
  if (parsed.chainId) {
    const supportedChains = [1, 11155111, 137, 42161, 10];
    if (!supportedChains.includes(parsed.chainId)) {
      warnings.push(`Chain ID ${parsed.chainId} may not be supported by all wallets.`);
    }
  }

  return {
    isCompatible: compatibleWallets.length > 0,
    compatibleWallets,
    warnings,
  };
}

/**
 * Generate multiple URI formats for different wallet types
 */
export function generateMultiFormatURIs(
  address: string,
  chainId?: number,
  amountEth?: string
): {
  standard: string; // Full EIP-681
  qrOptimized: string; // Minimal for QR
  plain: string; // Just address (fallback)
} {
  return {
    standard: generateEthPaymentURI(address, chainId, amountEth),
    qrOptimized: generateQROptimizedURI(address, chainId, amountEth),
    plain: address,
  };
}
