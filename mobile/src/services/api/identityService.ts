import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

export interface UserWallet {
  id: number;
  chainId: string;
  address: string;
  isPrimary: boolean;
  isActive: boolean;
  label: string | null;
  addedAt: string;
}

export interface TokenPreference {
  id: number;
  tokenSymbol: string;
  preferredChainId: string;
  updatedAt: string;
}

export interface ResolvedIdentity {
  userId: string;
  globalId: string;
  nickname: string;
  wallets: Array<{
    chainId: string;
    address: string;
    isPrimary: boolean;
  }>;
  tokenPreferences: Array<{
    tokenSymbol: string;
    preferredChainId: string;
  }>;
}

export interface UserProfile {
  id: string;
  globalId: string;
  nickname: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
}

/**
 * Резолвинг идентификатора (@nickname, global ID или адрес)
 */
export const resolveIdentifier = async (identifier: string): Promise<ResolvedIdentity> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/identity/resolve/${encodeURIComponent(identifier)}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('RECIPIENT_NOT_FOUND');
    }
    throw error;
  }
};

/**
 * Получение профиля текущего пользователя
 */
export const getMyProfile = async (token: string): Promise<UserProfile> => {
  const response = await axios.get(`${API_BASE_URL}/identity/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Обновление nickname
 */
export const updateNickname = async (token: string, nickname: string): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/identity/nickname`,
    { nickname },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

/**
 * Добавление адреса кошелька
 */
export const addWallet = async (
  token: string,
  chainId: string,
  address: string,
  isPrimary: boolean = false
): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/identity/wallets`,
    { chainId, address, isPrimary },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

/**
 * Обновление адреса кошелька
 */
export const updateWallet = async (
  token: string,
  walletId: number,
  updates: {
    chainId?: string;
    address?: string;
    isPrimary?: boolean;
    label?: string;
    isActive?: boolean;
  }
): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/identity/wallets/${walletId}`,
    updates,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

/**
 * Удаление адреса кошелька
 */
export const deleteWallet = async (token: string, walletId: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/identity/wallets/${walletId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Установка предпочтительной сети для токена
 */
export const setTokenPreference = async (
  token: string,
  tokenSymbol: string,
  preferredChainId: string
): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/identity/token-preferences`,
    { tokenSymbol, preferredChainId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

/**
 * Обновление token preference
 */
export const updateTokenPreference = async (
  token: string,
  preferenceId: number,
  updates: {
    tokenSymbol?: string;
    preferredChainId?: string;
  }
): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/identity/token-preferences/${preferenceId}`,
    updates,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

/**
 * Удаление token preference
 */
export const deleteTokenPreference = async (token: string, preferenceId: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/identity/token-preferences/${preferenceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Получение списка кошельков
 */
export const getWallets = async (token: string): Promise<UserWallet[]> => {
  const response = await axios.get(`${API_BASE_URL}/identity/wallets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Получение только активных кошельков
 */
export const getActiveWallets = async (token: string): Promise<UserWallet[]> => {
  const response = await axios.get(`${API_BASE_URL}/identity/wallets/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Получение primary chain ID
 */
export const getPrimaryChain = async (token: string): Promise<string | null> => {
  const response = await axios.get(`${API_BASE_URL}/identity/primary-chain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.primaryChainId;
};

/**
 * Получение token preferences
 */
export const getTokenPreferences = async (token: string): Promise<TokenPreference[]> => {
  const response = await axios.get(`${API_BASE_URL}/identity/token-preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
