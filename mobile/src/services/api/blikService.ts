import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

export interface CreateBlikCodeParams {
  amount: string;
  tokenSymbol: string;
  preferredChainId?: string;
  ttlSeconds?: number;
}

export interface BlikCode {
  code: string;
  expiresAt: string;
}

export interface BlikRequestInfo {
  code: string;
  toUser: {
    id: string;
    globalId: string;
    nickname: string;
    wallets?: Array<{
      chainId: string;
      address: string;
      isPrimary: boolean;
    }>;
  };
  amount: string;
  tokenSymbol: string;
  preferredChainId?: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface BlikQuote {
  requestInfo: BlikRequestInfo;
  quote?: {
    provider: string;
    estimatedOutput: string;
    fee: string;
    duration: number;
  };
}

export interface ExecuteBlikParams {
  code: string;
  fromChainId: string;
  fromAddress: string;
  routeId?: string;
  txHash?: string; // For real transactions sent from frontend
}

/**
 * Создание BLIK-кода
 */
export const createBlikCode = async (
  token: string,
  params: CreateBlikCodeParams
): Promise<BlikCode> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/blik/create`, params, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.code === 'MAX_ACTIVE_CODES_EXCEEDED') {
      throw new Error('MAX_ACTIVE_CODES');
    }
    throw error;
  }
};

/**
 * Получение информации о BLIK-коде
 */
export const getBlikCodeInfo = async (code: string): Promise<BlikRequestInfo> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blik/${code}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('CODE_NOT_FOUND');
    }
    if (error.response?.data?.code === 'REQUEST_EXPIRED') {
      throw new Error('CODE_EXPIRED');
    }
    throw error;
  }
};

/**
 * Получение котировки для оплаты BLIK-кода
 */
export const getBlikQuote = async (
  token: string,
  code: string,
  fromChainId: string,
  fromAddress: string
): Promise<BlikQuote> => {
  const response = await axios.post(
    `${API_BASE_URL}/blik/${code}/quote`,
    { fromChainId, fromAddress },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/**
 * Выполнение оплаты по BLIK-коду
 */
export const executeBlikPayment = async (
  token: string,
  params: ExecuteBlikParams
): Promise<{ txHash: string; status: string }> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/blik/${params.code}/execute`,
      {
        fromChainId: params.fromChainId,
        fromAddress: params.fromAddress,
        routeId: params.routeId,
        txHash: params.txHash, // Mobile передаёт txHash после отправки транзакции
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.code === 'REQUEST_ALREADY_CLAIMED') {
      throw new Error('CODE_ALREADY_USED');
    }
    if (error.response?.data?.code === 'CANNOT_PAY_YOURSELF') {
      throw new Error('CANNOT_PAY_YOURSELF');
    }
    if (error.response?.data?.code === 'TX_HASH_REQUIRED') {
      throw new Error('TX_HASH_REQUIRED');
    }
    throw error;
  }
};

/**
 * Отмена BLIK-кода
 */
export const cancelBlikCode = async (token: string, code: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/blik/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Получение активных кодов пользователя
 */
export const getMyActiveCodes = async (token: string) => {
  const response = await axios.get(`${API_BASE_URL}/blik/my-codes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
