/**
 * Типы для crosschain операций
 */

/**
 * Параметры для получения котировки crosschain swap
 */
export interface CrosschainQuoteParams {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number; // В процентах, например 0.5 для 0.5%
}

/**
 * Результат котировки crosschain swap
 */
export interface CrosschainQuote {
  estimatedOutput: string;
  fee: string;
  feeToken: string;
  route: RouteInfo;
  durationSeconds: number;
  priceImpact?: string;
}

/**
 * Информация о маршруте
 */
export interface RouteInfo {
  id: string;
  fromChain: ChainInfo;
  toChain: ChainInfo;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  steps: RouteStep[];
  tags?: string[];
}

/**
 * Информация о сети
 */
export interface ChainInfo {
  id: string;
  name: string;
  chainType: 'EVM' | 'SVM' | 'OTHER';
}

/**
 * Информация о токене
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  chainId: string;
  name?: string;
  logoURI?: string;
}

/**
 * Шаг маршрута (bridge, swap, etc.)
 */
export interface RouteStep {
  type: 'swap' | 'bridge' | 'custom';
  tool: string; // Название протокола (Stargate, Hop, Uniswap, etc.)
  fromToken: TokenInfo;
  toToken: TokenInfo;
  estimatedGas?: string;
}

/**
 * Параметры для выполнения crosschain транзакции
 */
export interface CrosschainExecuteParams {
  routeId: string;
  fromAddress: string;
  toAddress: string;
}

/**
 * Данные для подписи транзакции
 */
export interface CrosschainTransactionData {
  to: string;
  data: string;
  value: string;
  chainId: string;
  gasLimit?: string;
  gasPrice?: string;
}

/**
 * Статус crosschain транзакции
 */
export interface CrosschainTransactionStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromTxHash?: string;
  toTxHash?: string;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}
