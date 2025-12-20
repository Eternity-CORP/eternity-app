/**
 * DTO для платежных операций
 */

export class SendByIdentifierRequestDto {
  /**
   * Идентификатор получателя (@nickname, global_id, или raw address)
   * @example "@john_doe"
   * @example "EY-ABC123XYZ"
   * @example "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
   */
  identifier: string;

  /**
   * ID сети для отправки
   * @example "ethereum"
   * @example "polygon"
   */
  chainId: string;

  /**
   * Символ токена или адрес контракта
   * @example "USDT"
   * @example "0xdac17f958d2ee523a2206206994597c13d831ec7"
   */
  token: string;

  /**
   * Сумма для отправки (в единицах токена)
   * @example "100.50"
   */
  amount: string;

  /**
   * Опциональное описание платежа
   */
  memo?: string;
}

export class RecipientInfoDto {
  /**
   * User ID получателя
   */
  userId: string;

  /**
   * Никнейм получателя (если есть)
   */
  nickname: string | null;

  /**
   * Глобальный ID получателя
   */
  globalId: string;

  /**
   * Замаскированный адрес получателя
   * @example "0x742d...f0bEb"
   */
  maskedAddress: string;

  /**
   * Полный адрес получателя
   */
  address: string;
}

export class SendByIdentifierResponseDto {
  /**
   * Hash транзакции
   */
  txHash: string;

  /**
   * ID сети, в которой выполнена транзакция
   */
  chainId: string;

  /**
   * Информация о получателе
   */
  recipient: RecipientInfoDto;

  /**
   * Сумма отправленных средств
   */
  amount: string;

  /**
   * Токен
   */
  token: string;

  /**
   * Статус транзакции
   */
  status: 'pending' | 'confirmed' | 'failed';

  /**
   * Timestamp создания транзакции
   */
  timestamp: Date;
}

export class PaymentErrorDto {
  /**
   * Код ошибки
   */
  code: string;

  /**
   * Человекочитаемое сообщение
   */
  message: string;

  /**
   * Дополнительные детали
   */
  details?: Record<string, any>;
}
