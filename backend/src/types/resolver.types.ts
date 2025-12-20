/**
 * Типы для сервиса резолвинга идентификаторов
 */

export interface WalletInfo {
  chainId: string;
  address: string;
  isPrimary: boolean;
  label?: string;
}

export interface TokenPreferenceInfo {
  tokenSymbol: string;
  preferredChainId: string;
}

export interface ResolvedIdentity {
  userId: string;
  nickname: string | null;
  globalId: string;
  wallets: WalletInfo[];
  tokenPreferences: TokenPreferenceInfo[];
}

export enum IdentifierType {
  NICKNAME = 'nickname',
  GLOBAL_ID = 'global_id',
  RAW_ADDRESS = 'raw_address',
  UNKNOWN = 'unknown',
}

export interface IdentifierParseResult {
  type: IdentifierType;
  value: string;
}
