import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityResolverService } from './IdentityResolver.service';
import { TransactionLog, TransactionStatus } from '../entities/TransactionLog.entity';
import {
  SendByIdentifierRequestDto,
  SendByIdentifierResponseDto,
  RecipientInfoDto,
} from '../dto/payments.dto';
import { ResolvedIdentity } from '../types/resolver.types';
import { User } from '../../database/entities/user.entity';

/**
 * Интерфейс для абстракции работы с блокчейном
 */
export interface IWalletService {
  /**
   * Отправка токенов в рамках одной сети
   */
  sendToken(params: {
    fromUserId: string;
    chainId: string;
    toAddress: string;
    token: string;
    amount: string;
  }): Promise<{
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }>;

  /**
   * Проверка баланса пользователя
   */
  getBalance(params: {
    userId: string;
    chainId: string;
    token: string;
  }): Promise<string>;
}

/**
 * Кастомные ошибки для платежного сервиса
 */
export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Сервис для обработки платежей
 */
@Injectable()
export class PaymentService {
  constructor(
    private identityResolver: IdentityResolverService,
    @InjectRepository(TransactionLog)
    private transactionLogRepository: Repository<TransactionLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  /**
   * Отправка средств по идентификатору (same-chain)
   */
  async sendByIdentifier(
    fromUserId: string,
    request: SendByIdentifierRequestDto
  ): Promise<SendByIdentifierResponseDto> {
    // 1. Валидация входных данных
    this.validateRequest(request);

    // 2. Резолвинг получателя
    const recipient = await this.identityResolver.resolveIdentifier(request.identifier);

    if (!recipient) {
      throw new PaymentError(
        'RECIPIENT_NOT_FOUND',
        `Recipient with identifier "${request.identifier}" not found`,
        { identifier: request.identifier }
      );
    }

    // 3. Проверка, что отправитель != получатель
    if (recipient.userId === fromUserId) {
      throw new PaymentError(
        'CANNOT_SEND_TO_SELF',
        'Cannot send payment to yourself',
        { fromUserId, toUserId: recipient.userId }
      );
    }

    // 4. Получение адреса получателя (простая схема - один walletAddress на пользователя)
    const recipientUser = await this.userRepository.findOne({
      where: { id: recipient.userId },
    });

    if (!recipientUser || !recipientUser.walletAddress) {
      throw new PaymentError(
        'RECIPIENT_NO_ADDRESS',
        `Recipient does not have a wallet address`,
        {
          recipientId: recipient.userId,
        }
      );
    }

    const recipientAddress = recipientUser.walletAddress;

    // 5. Проверка баланса отправителя
    await this.checkSufficientBalance(fromUserId, request);

    // 6. Выполнение транзакции через WalletService (stub implementation)
    const txResult = {
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      status: 'pending' as const,
    };

    // TODO: Implement actual wallet integration

    // 7. Логирование транзакции
    await this.logTransaction({
      fromUserId,
      toUserId: recipient.userId,
      chainId: request.chainId,
      token: request.token,
      amount: request.amount,
      txHash: txResult.txHash,
      txStatus: txResult.status,
      metadata: {
        identifier: request.identifier,
        memo: request.memo,
      },
    });

    // 8. Формирование ответа
    return {
      txHash: txResult.txHash,
      chainId: request.chainId,
      recipient: this.buildRecipientInfo(recipient, recipientAddress),
      amount: request.amount,
      token: request.token,
      status: txResult.status,
      timestamp: new Date(),
    };
  }

  /**
   * Валидация запроса
   * @private
   */
  private validateRequest(request: SendByIdentifierRequestDto): void {
    if (!request.identifier || request.identifier.trim().length === 0) {
      throw new PaymentError(
        'INVALID_IDENTIFIER',
        'Identifier is required and cannot be empty'
      );
    }

    if (!request.chainId || request.chainId.trim().length === 0) {
      throw new PaymentError(
        'INVALID_CHAIN_ID',
        'Chain ID is required and cannot be empty'
      );
    }

    if (!request.token || request.token.trim().length === 0) {
      throw new PaymentError(
        'INVALID_TOKEN',
        'Token is required and cannot be empty'
      );
    }

    const amount = parseFloat(request.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new PaymentError(
        'INVALID_AMOUNT',
        'Amount must be a positive number',
        { amount: request.amount }
      );
    }
  }

  /**
   * Проверка достаточности баланса
   * @private
   */
  private async checkSufficientBalance(
    _fromUserId: string,
    _request: SendByIdentifierRequestDto
  ): Promise<void> {
    // Stub implementation - always passes
    // TODO: Implement actual balance checking with wallet service
    return;
  }

  /**
   * Логирование транзакции в БД
   * @private
   */
  private async logTransaction(params: {
    fromUserId: string;
    toUserId: string;
    chainId: string;
    token: string;
    amount: string;
    txHash: string;
    txStatus: 'pending' | 'confirmed' | 'failed';
    metadata?: Record<string, any>;
  }): Promise<void> {
    const log = this.transactionLogRepository.create({
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      chainId: params.chainId as any,
      tokenSymbol: params.token,
      amount: params.amount,
      txHash: params.txHash,
      txStatus: params.txStatus as TransactionStatus,
      metadata: params.metadata,
      createdAt: new Date(),
    });

    await this.transactionLogRepository.save(log);
  }

  /**
   * Построение информации о получателе
   * @private
   */
  private buildRecipientInfo(
    recipient: ResolvedIdentity,
    address: string
  ): RecipientInfoDto {
    return {
      userId: recipient.userId,
      nickname: recipient.nickname,
      globalId: recipient.globalId,
      address,
      maskedAddress: this.maskAddress(address),
    };
  }

  /**
   * Маскирование адреса для отображения
   * @private
   */
  private maskAddress(address: string): string {
    if (address.length <= 10) {
      return address;
    }

    // Для Ethereum: 0x742d...f0bEb
    if (address.startsWith('0x')) {
      return `${address.substring(0, 6)}...${address.substring(address.length - 5)}`;
    }

    // Для других адресов
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }
}
