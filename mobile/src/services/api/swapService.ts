import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

export interface SwapQuoteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  slippageBps?: number;
}

export interface SwapQuote {
  routeId: string;
  router: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  estimatedTimeSeconds: number;
  txData?: string;
  to?: string;
  value?: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromChainId: number;
  toChainId: number;
}

export interface SwapExecuteParams {
  routeId: string;
  router: string;
  signedTx: string;
}

export interface SwapExecutionResult {
  executionId: string;
  transactionHash: string;
  status: string;
}

export interface SwapStatusResponse {
  executionId: string;
  transactionHash: string;
  status: string;
  fromAmount: string;
  toAmount: string;
}

export const getSwapQuote = async (params: SwapQuoteParams): Promise<SwapQuote> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/swap/quote`, params);
    return response.data;
  } catch (error: any) {
    console.error('[Swap] Failed to get quote:', error.response?.data || error.message);
    throw error;
  }
};

export const executeSwap = async (params: SwapExecuteParams): Promise<SwapExecutionResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/swap/execute`, params);
    return response.data;
  } catch (error: any) {
    console.error('[Swap] Failed to execute swap:', error.response?.data || error.message);
    throw error;
  }
};

export const getSwapStatus = async (executionId: string): Promise<SwapStatusResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/swap/status/${executionId}`);
    return response.data;
  } catch (error: any) {
    console.error('[Swap] Failed to get status:', error.response?.data || error.message);
    throw error;
  }
};
