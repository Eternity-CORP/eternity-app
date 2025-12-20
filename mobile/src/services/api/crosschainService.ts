import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

export interface CrosschainQuoteParams {
  fromChainId: string;
  toChainId: string;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

export interface CrosschainQuote {
  router: string; // 'LI.FI' or 'Rango'
  provider: 'lifi' | 'rango';
  estimatedOutput: string;
  fee: string;
  feeToken: string;
  durationSeconds: number;
  priceImpact?: string;
  route: {
    id: string;
    fromChain: {
      id: string;
      name: string;
      chainType: 'EVM' | 'SVM' | 'OTHER';
    };
    toChain: {
      id: string;
      name: string;
      chainType: 'EVM' | 'SVM' | 'OTHER';
    };
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: string;
      name: string;
      logoURI?: string;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: string;
      name: string;
      logoURI?: string;
    };
    steps: Array<{
      type: 'swap' | 'bridge';
      tool: string;
      fromToken: any;
      toToken: any;
      estimatedGas?: string;
    }>;
    tags?: string[];
  };
  routeId: string;
}

export interface CompareQuotesResponse {
  quotes: Array<{
    router: string;
    estimatedOutput: string;
    fee: string;
    feeToken: string;
    durationSeconds: number;
    priceImpact?: string;
    routeId: string;
  }>;
  bestRouter: string;
  recommended: CrosschainQuote;
}

/**
 * Получение списка доступных роутеров (LI.FI, Rango)
 */
export const getAvailableRouters = async (): Promise<{ routers: string[] }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/crosschain/routers`);
    return response.data;
  } catch (error) {
    console.error('[Crosschain] Failed to get routers:', error);
    throw error;
  }
};

/**
 * Получение лучшей crosschain котировки
 */
export const getCrosschainQuote = async (
  params: CrosschainQuoteParams
): Promise<CrosschainQuote> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/crosschain/quote`, {
      params: {
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        slippage: params.slippage,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message?.includes('No routes found')) {
      throw new Error('NO_CROSSCHAIN_ROUTE');
    }
    if (error.response?.data?.message?.includes('Unsupported chain')) {
      throw new Error('UNSUPPORTED_CHAIN');
    }
    throw error;
  }
};

/**
 * Сравнение котировок от всех роутеров
 */
export const compareQuotes = async (
  params: CrosschainQuoteParams
): Promise<CompareQuotesResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/crosschain/quotes/compare`, {
      params: {
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
      },
    });
    return response.data;
  } catch (error) {
    console.error('[Crosschain] Failed to compare quotes:', error);
    throw error;
  }
};

/**
 * Подготовка crosschain транзакции
 */
export const prepareCrosschainTransaction = async (
  router: string,
  routeId: string,
  fromAddress: string,
  toAddress: string
) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/crosschain/prepare`, {
      router,
      routeId,
      fromAddress,
      toAddress,
    });
    return response.data;
  } catch (error) {
    console.error('[Crosschain] Failed to prepare transaction:', error);
    throw error;
  }
};

/**
 * Получение статуса crosschain транзакции
 */
export const getCrosschainTransactionStatus = async (
  router: string,
  txHash: string
) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/crosschain/status/${txHash}?router=${router}`
    );
    return response.data;
  } catch (error) {
    console.error('[Crosschain] Failed to get transaction status:', error);
    throw error;
  }
};
