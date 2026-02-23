/**
 * Shared Bridge Service
 * Pure fetch() functions for LI.FI bridge API.
 * No ethers dependency — apps handle signing and execution locally.
 */

import { LIFI_API_URL } from '../constants/swap';
import { DEFAULT_SLIPPAGE } from '../constants/swap-settings';

const REQUEST_TIMEOUT = 20000;

// ============================================
// Types
// ============================================

export interface BridgeStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
}

export interface BridgeRoute {
  steps: BridgeStep[];
  totalTime: number;
}

export interface BridgeQuoteResult {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  estimatedTime: number;
  priceImpact: string;
  route: BridgeRoute;
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
}

export interface BridgeQuoteParams {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
}

export interface BridgeStatusResult {
  status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND';
  receivingTxHash?: string;
  message?: string;
}

export type BridgeCostLevel = 'none' | 'warning' | 'expensive';

// ============================================
// Internal Helpers
// ============================================

function parseStep(step: Record<string, unknown>): BridgeStep {
  const action = step.action as Record<string, unknown>;
  const estimate = step.estimate as Record<string, unknown>;

  return {
    type: step.type as 'swap' | 'bridge' | 'cross',
    tool: step.tool as string,
    fromChainId: action.fromChainId as number,
    toChainId: action.toChainId as number,
    fromToken: ((action.fromToken as Record<string, unknown>)?.symbol as string) || '',
    toToken: ((action.toToken as Record<string, unknown>)?.symbol as string) || '',
    fromAmount: estimate.fromAmount as string,
    toAmount: estimate.toAmount as string,
    estimatedTime: (estimate.executionDuration as number) || 0,
  };
}

function calculateFees(estimate: Record<string, unknown>): {
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
} {
  const gasCosts = estimate.gasCosts as Array<Record<string, unknown>> | undefined;
  const feeCosts = estimate.feeCosts as Array<Record<string, unknown>> | undefined;

  let totalGas = BigInt(0);
  let totalGasUsd = 0;
  if (gasCosts && Array.isArray(gasCosts)) {
    for (const cost of gasCosts) {
      totalGas += BigInt((cost.amount as string) || '0');
      totalGasUsd += parseFloat((cost.amountUSD as string) || '0');
    }
  }

  let totalBridgeFee = BigInt(0);
  let totalBridgeFeeUsd = 0;
  if (feeCosts && Array.isArray(feeCosts)) {
    for (const cost of feeCosts) {
      totalBridgeFee += BigInt((cost.amount as string) || '0');
      totalBridgeFeeUsd += parseFloat((cost.amountUSD as string) || '0');
    }
  }

  return {
    estimatedGas: totalGas.toString(),
    estimatedGasUsd: totalGasUsd,
    bridgeFee: totalBridgeFee.toString(),
    bridgeFeeUsd: totalBridgeFeeUsd,
    totalFeeUsd: totalGasUsd + totalBridgeFeeUsd,
  };
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch bridge quote from LI.FI
 */
export async function fetchBridgeQuote(
  params: BridgeQuoteParams,
): Promise<BridgeQuoteResult | null> {
  try {
    const queryParams = new URLSearchParams({
      fromChain: params.fromChainId.toString(),
      toChain: params.toChainId.toString(),
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress || params.fromAddress,
      slippage: (params.slippage ?? DEFAULT_SLIPPAGE).toString(),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    const estimate = data.estimate as Record<string, unknown>;
    const action = data.action as Record<string, unknown>;
    const includedSteps = data.includedSteps as Array<Record<string, unknown>> | undefined;

    const fees = calculateFees(estimate);

    const steps: BridgeStep[] = [];
    if (includedSteps && Array.isArray(includedSteps)) {
      for (const step of includedSteps) {
        try {
          steps.push(parseStep(step));
        } catch {
          // skip unparseable step
        }
      }
    }

    const totalTime =
      steps.reduce((sum, step) => sum + step.estimatedTime, 0) ||
      (estimate.executionDuration as number) || 0;

    const result: BridgeQuoteResult = {
      id: (data.id as string) || `bridge-${Date.now()}`,
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromToken: ((action.fromToken as Record<string, unknown>)?.symbol as string) || params.fromToken,
      toToken: ((action.toToken as Record<string, unknown>)?.symbol as string) || params.toToken,
      fromAmount: params.fromAmount,
      toAmount: estimate.toAmount as string,
      toAmountMin: estimate.toAmountMin as string,
      ...fees,
      estimatedTime: totalTime,
      priceImpact: (estimate.priceImpact as string) || '0',
      route: { steps, totalTime },
    };

    // Include transaction request if present
    const txReq = data.transactionRequest as Record<string, unknown> | undefined;
    if (txReq) {
      result.transactionRequest = {
        to: txReq.to as string,
        data: txReq.data as string,
        value: (txReq.value as string) || '0',
        gasLimit: (txReq.gasLimit as string) || '500000',
        chainId: (txReq.chainId as number) || params.fromChainId,
      };
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Poll LI.FI bridge status
 */
export async function fetchBridgeStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number,
): Promise<BridgeStatusResult> {
  try {
    const response = await fetch(
      `${LIFI_API_URL}/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`,
    );

    if (!response.ok) {
      return { status: 'NOT_FOUND' };
    }

    const data = await response.json() as Record<string, unknown>;
    const status = data.status as string;

    if (status === 'DONE') {
      const receiving = data.receiving as Record<string, unknown> | undefined;
      return { status: 'DONE', receivingTxHash: receiving?.txHash as string | undefined };
    }

    if (status === 'FAILED') {
      return { status: 'FAILED', message: (data.substatusMessage as string) || 'Bridge transaction failed' };
    }

    return { status: 'PENDING' };
  } catch {
    return { status: 'NOT_FOUND' };
  }
}

/**
 * Check cost level of a bridge operation
 */
export function checkBridgeCostLevel(
  amountUsd: number,
  bridgeFeeUsd: number,
): BridgeCostLevel {
  if (amountUsd <= 0) return 'none';

  const feePercentage = (bridgeFeeUsd / amountUsd) * 100;

  if (feePercentage > 10) return 'expensive';
  if (feePercentage >= 5) return 'warning';
  return 'none';
}

/**
 * Format bridge time for display
 */
export function formatBridgeTime(seconds: number): string {
  if (seconds <= 0) return '~instant';
  if (seconds < 60) return `~${seconds} sec`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min`;
  const hours = Math.round(seconds / 3600);
  return hours === 1 ? '~1 hr' : `~${hours} hrs`;
}
