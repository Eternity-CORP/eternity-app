/**
 * Gas Estimator Service
 *
 * Provides comprehensive gas estimation for Ethereum transactions
 * with support for EIP-1559, fallback to legacy gas pricing,
 * and multiple fee tiers (low, medium, high).
 *
 * Features:
 * - Accurate gas limit estimation
 * - Multiple gas price tiers
 * - EIP-1559 support (maxFeePerGas, maxPriorityFeePerGas)
 * - Legacy gas price fallback
 * - Gas validation and warnings
 * - ERC-20 token transfer support
 */

import { ethers, BigNumber } from 'ethers';
import { getProvider, getProviderWithFallback } from './ethereumProvider';
import { getSigner } from '../walletService';
import type { Network } from '../../constants/rpcUrls';

// Types
export type GasFeeLevel = 'low' | 'medium' | 'high' | 'custom';

export interface GasEstimate {
  gasLimit: BigNumber;

  // EIP-1559 (preferred for modern networks)
  maxFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;

  // Legacy gas price (fallback)
  gasPrice?: BigNumber;

  // Human-readable values
  totalFeeTH: string; // in ETH
  totalFeeUsd?: string; // in USD (if price available)

  // Metadata
  isEIP1559: boolean;
  level: GasFeeLevel;
}

export interface GasFeeOptions {
  low: GasEstimate;
  medium: GasEstimate;
  high: GasEstimate;
}

export interface GasValidation {
  isValid: boolean;
  hasEnoughBalance: boolean;
  error?: string;
  warning?: string;
}

// Constants
const GAS_LIMIT_BUFFER = 1.2; // 20% buffer for gas limit
const MIN_GAS_LIMIT = 21000; // Minimum for ETH transfer
const ERC20_TRANSFER_GAS_LIMIT = 65000; // Typical ERC-20 transfer

// Gas price multipliers for different levels
const GAS_PRICE_MULTIPLIERS = {
  low: 0.9,    // 90% of base fee
  medium: 1.0, // 100% of base fee
  high: 1.3,   // 130% of base fee
};

// Priority fee multipliers for EIP-1559
const PRIORITY_FEE_MULTIPLIERS = {
  low: 1.0,
  medium: 1.5,
  high: 2.5,
};

/**
 * Estimate gas limit for ETH transfer
 */
export async function estimateGasLimitForETH(
  to: string,
  amountEth: string,
  network?: Network
): Promise<BigNumber> {
  try {
    const signer = await getSigner(network);
    const value = ethers.utils.parseEther(amountEth || '0');

    const gasLimit = await signer.estimateGas({
      to,
      value,
    });

    // Add buffer for safety
    const buffered = gasLimit.mul(Math.floor(GAS_LIMIT_BUFFER * 100)).div(100);

    // Ensure minimum gas limit
    return buffered.lt(MIN_GAS_LIMIT) ? BigNumber.from(MIN_GAS_LIMIT) : buffered;
  } catch (error: any) {
    console.warn('Gas estimation failed, using default:', error.message);
    // Fallback to standard ETH transfer gas limit
    return BigNumber.from(MIN_GAS_LIMIT);
  }
}

/**
 * Estimate gas limit for ERC-20 token transfer
 */
export async function estimateGasLimitForERC20(
  tokenAddress: string,
  to: string,
  amount: BigNumber,
  network?: Network
): Promise<BigNumber> {
  try {
    const signer = await getSigner(network);

    // ERC-20 transfer function signature
    const transferData = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount)'
    ]).encodeFunctionData('transfer', [to, amount]);

    const gasLimit = await signer.estimateGas({
      to: tokenAddress,
      data: transferData,
    });

    // Add buffer
    const buffered = gasLimit.mul(Math.floor(GAS_LIMIT_BUFFER * 100)).div(100);

    // Ensure minimum for ERC-20
    return buffered.lt(ERC20_TRANSFER_GAS_LIMIT)
      ? BigNumber.from(ERC20_TRANSFER_GAS_LIMIT)
      : buffered;
  } catch (error: any) {
    console.warn('ERC-20 gas estimation failed, using default:', error.message);
    return BigNumber.from(ERC20_TRANSFER_GAS_LIMIT);
  }
}

/**
 * Get current gas prices from network
 * Returns both EIP-1559 and legacy formats
 */
async function getCurrentGasPrices(network?: Network): Promise<{
  isEIP1559: boolean;
  baseFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;
  gasPrice?: BigNumber;
}> {
  try {
    const provider = getProvider(network);

    // Try to get EIP-1559 fee data
    try {
      const feeData = await provider.getFeeData();

      // Check if network supports EIP-1559
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // Calculate base fee from maxFeePerGas - maxPriorityFeePerGas
        const baseFee = feeData.maxFeePerGas.sub(feeData.maxPriorityFeePerGas);

        return {
          isEIP1559: true,
          baseFeePerGas: baseFee.gt(0) ? baseFee : feeData.maxFeePerGas.div(2),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        };
      }
    } catch (e) {
      console.log('EIP-1559 not supported, falling back to legacy gas price');
    }

    // Fallback to legacy gas price
    const gasPrice = await provider.getGasPrice();

    return {
      isEIP1559: false,
      gasPrice,
    };
  } catch (error) {
    // Try fallback provider
    console.warn('Failed with cached provider, trying fallback...');
    const provider = await getProviderWithFallback(network);
    const gasPrice = await provider.getGasPrice();

    return {
      isEIP1559: false,
      gasPrice,
    };
  }
}

/**
 * Calculate gas estimate for a specific fee level
 */
function calculateGasEstimate(
  gasLimit: BigNumber,
  level: GasFeeLevel,
  gasPrices: {
    isEIP1559: boolean;
    baseFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
    gasPrice?: BigNumber;
  },
  ethPriceUsd?: number
): GasEstimate {
  const multiplier = GAS_PRICE_MULTIPLIERS[level] || 1.0;
  const priorityMultiplier = PRIORITY_FEE_MULTIPLIERS[level] || 1.0;

  let totalFeeWei: BigNumber;
  let maxFeePerGas: BigNumber | undefined;
  let maxPriorityFeePerGas: BigNumber | undefined;
  let gasPrice: BigNumber | undefined;

  if (gasPrices.isEIP1559 && gasPrices.baseFeePerGas && gasPrices.maxPriorityFeePerGas) {
    // EIP-1559 calculation
    const baseFee = gasPrices.baseFeePerGas.mul(Math.floor(multiplier * 100)).div(100);
    const priorityFee = gasPrices.maxPriorityFeePerGas
      .mul(Math.floor(priorityMultiplier * 100))
      .div(100);

    maxFeePerGas = baseFee.add(priorityFee);
    maxPriorityFeePerGas = priorityFee;
    totalFeeWei = gasLimit.mul(maxFeePerGas);
  } else if (gasPrices.gasPrice) {
    // Legacy gas price calculation
    gasPrice = gasPrices.gasPrice.mul(Math.floor(multiplier * 100)).div(100);
    totalFeeWei = gasLimit.mul(gasPrice);
  } else {
    throw new Error('No gas price data available');
  }

  const totalFeeETH = ethers.utils.formatEther(totalFeeWei);
  const totalFeeUsd = ethPriceUsd
    ? (parseFloat(totalFeeETH) * ethPriceUsd).toFixed(2)
    : undefined;

  return {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice,
    totalFeeTH: totalFeeETH,
    totalFeeUsd,
    isEIP1559: gasPrices.isEIP1559,
    level,
  };
}

/**
 * Get gas fee options (low, medium, high) for a transaction
 */
export async function getGasFeeOptions(
  gasLimit: BigNumber,
  network?: Network,
  ethPriceUsd?: number
): Promise<GasFeeOptions> {
  const gasPrices = await getCurrentGasPrices(network);

  return {
    low: calculateGasEstimate(gasLimit, 'low', gasPrices, ethPriceUsd),
    medium: calculateGasEstimate(gasLimit, 'medium', gasPrices, ethPriceUsd),
    high: calculateGasEstimate(gasLimit, 'high', gasPrices, ethPriceUsd),
  };
}

/**
 * Estimate gas for ETH transfer with fee options
 */
export async function estimateGasForETH(
  to: string,
  amountEth: string,
  network?: Network,
  ethPriceUsd?: number
): Promise<GasFeeOptions> {
  const gasLimit = await estimateGasLimitForETH(to, amountEth, network);
  return getGasFeeOptions(gasLimit, network, ethPriceUsd);
}

/**
 * Estimate gas for ERC-20 token transfer with fee options
 */
export async function estimateGasForERC20(
  tokenAddress: string,
  to: string,
  amount: BigNumber,
  network?: Network,
  ethPriceUsd?: number
): Promise<GasFeeOptions> {
  const gasLimit = await estimateGasLimitForERC20(tokenAddress, to, amount, network);
  return getGasFeeOptions(gasLimit, network, ethPriceUsd);
}

/**
 * Validate gas estimate against user's balance
 */
export async function validateGasEstimate(
  gasEstimate: GasEstimate,
  userBalanceETH: string,
  transactionAmountETH: string = '0',
  network?: Network
): Promise<GasValidation> {
  try {
    const balance = ethers.utils.parseEther(userBalanceETH);
    const amount = ethers.utils.parseEther(transactionAmountETH);
    const fee = ethers.utils.parseEther(gasEstimate.totalFeeTH);

    const totalRequired = amount.add(fee);

    // Check if user has enough balance
    if (balance.lt(totalRequired)) {
      return {
        isValid: false,
        hasEnoughBalance: false,
        error: `Insufficient balance. Required: ${ethers.utils.formatEther(totalRequired)} ETH, Available: ${userBalanceETH} ETH`,
      };
    }

    // Warning if gas limit is very low
    if (gasEstimate.gasLimit.lt(MIN_GAS_LIMIT)) {
      return {
        isValid: true,
        hasEnoughBalance: true,
        warning: 'Gas limit seems unusually low. Transaction may fail.',
      };
    }

    // Warning if gas price is very high (>100 Gwei)
    const highGasThreshold = ethers.utils.parseUnits('100', 'gwei');
    const currentGasPrice = gasEstimate.gasPrice || gasEstimate.maxFeePerGas;

    if (currentGasPrice && currentGasPrice.gt(highGasThreshold)) {
      const gwei = ethers.utils.formatUnits(currentGasPrice, 'gwei');
      return {
        isValid: true,
        hasEnoughBalance: true,
        warning: `Gas price is unusually high (${parseFloat(gwei).toFixed(2)} Gwei). Consider waiting for lower fees.`,
      };
    }

    return {
      isValid: true,
      hasEnoughBalance: true,
    };
  } catch (error: any) {
    return {
      isValid: false,
      hasEnoughBalance: false,
      error: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Create custom gas estimate with user-provided values
 */
export function createCustomGasEstimate(
  gasLimit: BigNumber,
  maxFeePerGas?: BigNumber,
  maxPriorityFeePerGas?: BigNumber,
  gasPrice?: BigNumber,
  ethPriceUsd?: number
): GasEstimate {
  const isEIP1559 = !!(maxFeePerGas && maxPriorityFeePerGas);

  let totalFeeWei: BigNumber;

  if (isEIP1559 && maxFeePerGas) {
    totalFeeWei = gasLimit.mul(maxFeePerGas);
  } else if (gasPrice) {
    totalFeeWei = gasLimit.mul(gasPrice);
  } else {
    throw new Error('Must provide either EIP-1559 fees or legacy gas price');
  }

  const totalFeeETH = ethers.utils.formatEther(totalFeeWei);
  const totalFeeUsd = ethPriceUsd
    ? (parseFloat(totalFeeETH) * ethPriceUsd).toFixed(2)
    : undefined;

  return {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice,
    totalFeeTH: totalFeeETH,
    totalFeeUsd,
    isEIP1559,
    level: 'custom',
  };
}

/**
 * Format gas estimate for display
 */
export function formatGasEstimate(estimate: GasEstimate): {
  gasLimit: string;
  gasPrice: string;
  totalFee: string;
  totalFeeUsd?: string;
} {
  const gasLimit = estimate.gasLimit.toString();

  let gasPrice: string;
  if (estimate.isEIP1559 && estimate.maxFeePerGas) {
    const gwei = ethers.utils.formatUnits(estimate.maxFeePerGas, 'gwei');
    gasPrice = `${parseFloat(gwei).toFixed(2)} Gwei`;
  } else if (estimate.gasPrice) {
    const gwei = ethers.utils.formatUnits(estimate.gasPrice, 'gwei');
    gasPrice = `${parseFloat(gwei).toFixed(2)} Gwei`;
  } else {
    gasPrice = 'Unknown';
  }

  const totalFee = `${parseFloat(estimate.totalFeeTH).toFixed(6)} ETH`;
  const totalFeeUsd = estimate.totalFeeUsd ? `$${estimate.totalFeeUsd}` : undefined;

  return {
    gasLimit,
    gasPrice,
    totalFee,
    totalFeeUsd,
  };
}
