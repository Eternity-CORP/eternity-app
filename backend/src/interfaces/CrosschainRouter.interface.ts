import {
  CrosschainQuoteParams,
  CrosschainQuote,
  CrosschainExecuteParams,
  CrosschainTransactionData,
  CrosschainTransactionStatus,
} from '../types/crosschain.types';

/**
 * Интерфейс для crosschain роутеров (LI.FI, Socket, Squid, etc.)
 */
export interface ICrosschainRouter {
  /**
   * Название роутера
   */
  readonly name: string;

  /**
   * Поддерживаемые типы сетей
   */
  readonly supportedChainTypes: string[];

  /**
   * Получение котировки для crosschain swap
   * @param params - Параметры свапа
   * @returns Котировка с маршрутом
   */
  getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote>;

  /**
   * Подготовка данных транзакции для подписи
   * @param params - Параметры выполнения
   * @returns Данные для подписи пользователем
   */
  prepareTransaction(
    params: CrosschainExecuteParams
  ): Promise<CrosschainTransactionData>;

  /**
   * Получение статуса crosschain транзакции
   * @param txHash - Hash исходной транзакции
   * @returns Статус выполнения
   */
  getTransactionStatus(txHash: string): Promise<CrosschainTransactionStatus>;

  /**
   * Проверка поддержки пары сетей
   * @param fromChainId - Исходная сеть
   * @param toChainId - Целевая сеть
   * @returns true если поддерживается
   */
  supportsRoute(fromChainId: string, toChainId: string): Promise<boolean>;
}
