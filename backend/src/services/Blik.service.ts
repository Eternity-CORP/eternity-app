import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PaymentRequest } from '../entities/PaymentRequest.entity';
import { User } from '../../database/entities/user.entity';
import { UserWallet } from '../entities/UserWallet.entity';
import { IdentityResolverService } from './IdentityResolver.service';
import { CrosschainService } from './Crosschain.service';
import { TokenRegistryService } from './TokenRegistry.service';
import {
  CreatePaymentRequestParams,
  PaymentRequestInfo,
  GetQuoteForRequestParams,
  ExecutePaymentRequestParams,
  PaymentRequestQuote,
  PaymentRequestStatus,
} from '../types/blik.types';

/**
 * BLIK-подобный сервис для платежей по кодам
 * Позволяет создавать временные коды для получения платежей
 */
@Injectable()
export class BlikService {
  private readonly logger = new Logger(BlikService.name);
  private readonly DEFAULT_TTL_SECONDS = 300; // 5 минут
  private readonly MIN_TTL_SECONDS = 60; // 1 минута минимум
  private readonly MAX_TTL_SECONDS = 3600; // 1 час максимум
  private readonly CODE_LENGTH = 6;
  private readonly CODE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly MAX_ACTIVE_CODES_PER_USER = 10; // Максимум активных кодов на пользователя
  private readonly EXPIRY_GRACE_PERIOD_MS = 5000; // 5 секунд grace period для сетевых задержек

  constructor(
    @InjectRepository(PaymentRequest)
    private paymentRequestRepository: Repository<PaymentRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    private identityResolver: IdentityResolverService,
    private crosschainService: CrosschainService,
    private tokenRegistry: TokenRegistryService,
  ) {}

  /**
   * Создание платежного запроса с уникальным кодом
   */
  async createRequest(
    params: CreatePaymentRequestParams
  ): Promise<{ code: string; expiresAt: Date }> {
    // Валидация получателя
    const toUser = await this.userRepository.findOne({
      where: { id: params.toUserId },
    });

    if (!toUser) {
      throw new Error('RECIPIENT_NOT_FOUND: User not found');
    }

    // Проверка лимита активных кодов
    const activeCodesCount = await this.paymentRequestRepository.count({
      where: {
        toUserId: params.toUserId,
        status: PaymentRequestStatus.PENDING,
      },
    });

    if (activeCodesCount >= this.MAX_ACTIVE_CODES_PER_USER) {
      throw new Error(
        `MAX_ACTIVE_CODES_EXCEEDED: You have ${activeCodesCount} active payment codes. Maximum is ${this.MAX_ACTIVE_CODES_PER_USER}. Please cancel or wait for expiration of old codes.`
      );
    }

    // Валидация суммы
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT: Amount must be positive');
    }

    // Валидация TTL
    let ttl = params.ttlSeconds || this.DEFAULT_TTL_SECONDS;
    if (ttl < this.MIN_TTL_SECONDS) {
      this.logger.warn(`TTL ${ttl}s below minimum, using ${this.MIN_TTL_SECONDS}s`);
      ttl = this.MIN_TTL_SECONDS;
    }
    if (ttl > this.MAX_TTL_SECONDS) {
      this.logger.warn(`TTL ${ttl}s above maximum, using ${this.MAX_TTL_SECONDS}s`);
      ttl = this.MAX_TTL_SECONDS;
    }

    // Валидация preferredChainId: должен быть активным кошельком пользователя
    if (params.preferredChainId) {
      const userWallets = await this.walletRepository.find({
        where: { userId: params.toUserId, isActive: true },
      });

      if (userWallets.length === 0) {
        throw new Error('NO_ACTIVE_WALLETS: User has no active wallets configured');
      }

      const hasChain = userWallets.some(
        (w) => w.chainId.toLowerCase() === params.preferredChainId!.toLowerCase()
      );

      if (!hasChain) {
        throw new Error(
          `PREFERRED_CHAIN_NOT_ACTIVE: Chain ${params.preferredChainId} is not active for this user`
        );
      }
    }

    // Генерация уникального кода
    const code = await this.generateUniqueCode();

    // Расчёт времени истечения
    const expiresAt = new Date(Date.now() + ttl * 1000);

    this.logger.log(`Creating BLIK code for user ${params.toUserId}: ${amount} ${params.tokenSymbol}, TTL: ${ttl}s`);

    // Создание записи
    const paymentRequest = this.paymentRequestRepository.create({
      code,
      toUserId: params.toUserId,
      amount: params.amount,
      tokenSymbol: params.tokenSymbol.toUpperCase(),
      preferredChainId: params.preferredChainId as any, // Cast для совместимости с ChainId enum
      status: PaymentRequestStatus.PENDING,
      expiresAt,
    });

    await this.paymentRequestRepository.save(paymentRequest);

    return { code, expiresAt };
  }

  /**
   * Получение информации о платежном запросе по коду
   */
  async getRequestByCode(code: string): Promise<PaymentRequestInfo | null> {
    const request = await this.paymentRequestRepository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['toUser'],
    });

    if (!request) {
      return null;
    }

    // Проверка истечения срока
    await this.checkAndUpdateExpiredStatus(request);

    // Build nested toUser object with wallet info
    const preferredChainId = request.preferredChainId || 'sepolia';
    const wallets = request.toUser?.walletAddress ? [{
      chainId: preferredChainId,
      address: request.toUser.walletAddress,
      isPrimary: true,
    }] : [];

    return {
      code: request.code,
      toUser: {
        id: request.toUserId,
        globalId: request.toUser ? `EY-${request.toUser.id.slice(0, 8).toUpperCase()}` : '',
        nickname: request.toUser?.nickname || '',
        wallets,
      },
      amount: request.amount,
      tokenSymbol: request.tokenSymbol,
      preferredChainId: request.preferredChainId || undefined,
      status: request.status as PaymentRequestStatus,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
    };
  }

  /**
   * Получение котировки для выполнения платежного запроса
   */
  async getQuoteForRequest(
    params: GetQuoteForRequestParams
  ): Promise<PaymentRequestQuote> {
    // Получение запроса
    const request = await this.paymentRequestRepository.findOne({
      where: { code: params.code.toUpperCase() },
      relations: ['toUser'],
    });

    if (!request) {
      throw new Error('REQUEST_NOT_FOUND: Payment request not found');
    }

    // Проверка статуса
    await this.checkAndUpdateExpiredStatus(request);

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new Error(
        `REQUEST_NOT_AVAILABLE: Request status is ${request.status}`
      );
    }

    // Проверка, что отправитель != получатель
    if (params.fromUserId === request.toUserId) {
      throw new Error('CANNOT_PAY_YOURSELF: Cannot pay to yourself');
    }

    // Резолвинг получателя через IdentityResolver
    const recipientResolved = await this.identityResolver.resolveIdentifier(
      `EY-${request.toUser.id.slice(0, 8).toUpperCase()}`
    );

    if (!recipientResolved) {
      throw new Error('RECIPIENT_NOT_RESOLVED: Cannot resolve recipient');
    }

    // Определение целевой сети (toChainId) и адреса
    let toChainId: string | null = request.preferredChainId as string | null;
    let toAddress: string | null = null;

    if (!toChainId) {
      // Если не указана preferred_chain, берём из token_preferences
      toChainId = this.identityResolver.getPreferredChainForToken(
        recipientResolved,
        request.tokenSymbol
      );
    }

    if (toChainId) {
      // Если нашли целевую сеть, получаем адрес для этой сети
      toAddress = this.identityResolver.getAddressForChain(recipientResolved, toChainId);
    }

    if (!toChainId || !toAddress) {
      // Fallback: используем оптимальный адрес (primary wallet или первый доступный)
      const optimalAddress = this.identityResolver.getOptimalAddressForToken(
        recipientResolved,
        request.tokenSymbol
      );

      if (!optimalAddress) {
        throw new Error(
          'NO_TARGET_CHAIN: Recipient has no wallet addresses configured'
        );
      }

      toChainId = optimalAddress.chainId;
      toAddress = optimalAddress.address;
    }

    // Нормализация chainId для сравнения (приводим к lowercase)
    const normalizedFromChainId = params.fromChainId.toLowerCase();
    const normalizedToChainId = toChainId.toLowerCase();

    // Проверка: same-chain или crosschain
    const isSameChain = normalizedFromChainId === normalizedToChainId;

    let quote;

    if (isSameChain) {
      // Same-chain перевод через PaymentService
      // Для same-chain переводов не нужен crosschain роутер
      quote = {
        estimatedOutput: request.amount,
        fee: '0', // Same-chain переводы имеют минимальную комиссию (только gas)
        feeToken: request.tokenSymbol,
        durationSeconds: 30, // Same-chain переводы быстрые
        provider: 'same-chain' as const,
      };
    } else {
      // Crosschain перевод через CrosschainService
      try {
        const fromTokenAddress = await this.getTokenAddress(
          params.fromChainId,
          request.tokenSymbol
        );
        const toTokenAddress = await this.getTokenAddress(toChainId, request.tokenSymbol);

        const crosschainQuote = await this.crosschainService.getBestQuote({
          fromChainId: params.fromChainId,
          toChainId,
          fromTokenAddress,
          toTokenAddress,
          amount: request.amount,
          fromAddress: params.fromAddress,
          toAddress,
        });

        quote = {
          estimatedOutput: crosschainQuote.quote.estimatedOutput,
          fee: crosschainQuote.quote.fee,
          feeToken: crosschainQuote.quote.feeToken,
          durationSeconds: crosschainQuote.quote.durationSeconds,
          provider: crosschainQuote.router.toLowerCase() as 'lifi' | 'rango',
          routeId: crosschainQuote.quote.route.id,
        };
      } catch (error: any) {
        // Если crosschain роутеры не поддерживают маршрут (например, testnet-to-testnet)
        // Предоставляем понятную ошибку
        const errorMessage = error.message || 'Unknown error';
        
        if (errorMessage.includes('No quotes available') || 
            errorMessage.includes('No router available') ||
            errorMessage.includes('No routes found')) {
          throw new Error(
            `CROSSCHAIN_ROUTE_UNAVAILABLE: No crosschain bridge available for ${params.fromChainId} → ${toChainId}. ` +
            `This route may not be supported by available routers (LiFi, Socket). ` +
            `Try using same-chain transfer or different networks.`
          );
        }
        
        // Пробрасываем другие ошибки как есть
        throw error;
      }
    }

    // Build nested toUser object with wallet info
    const wallets = request.toUser?.walletAddress ? [{
      chainId: toChainId,
      address: request.toUser.walletAddress,
      isPrimary: true,
    }] : [];

    return {
      requestInfo: {
        code: request.code,
        toUser: {
          id: request.toUserId,
          globalId: request.toUser ? `EY-${request.toUser.id.slice(0, 8).toUpperCase()}` : '',
          nickname: request.toUser?.nickname || '',
          wallets,
        },
        amount: request.amount,
        tokenSymbol: request.tokenSymbol,
        preferredChainId: toChainId || undefined,
        status: request.status as PaymentRequestStatus,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
      },
      quote,
    };
  }

  /**
   * Выполнение платежного запроса
   * Использует пессимистичную блокировку для предотвращения race condition
   */
  async executeRequest(
    params: ExecutePaymentRequestParams
  ): Promise<{ txHash: string; status: string }> {
    // Используем транзакцию с блокировкой для предотвращения race condition
    return await this.paymentRequestRepository.manager.transaction(
      async (manager) => {
        // SELECT FOR UPDATE блокирует строку до конца транзакции
        // Не используем JOIN с toUser, так как FOR UPDATE не работает с LEFT JOIN
        const request = await manager
          .createQueryBuilder(PaymentRequest, 'pr')
          .setLock('pessimistic_write')
          .where('pr.code = :code', { code: params.code.toUpperCase() })
          .getOne();

        if (!request) {
          throw new Error('REQUEST_NOT_FOUND: Payment request not found');
        }

        // Загружаем toUser отдельно
        const toUser = await manager.findOne(User, {
          where: { id: request.toUserId },
        });

        if (!toUser) {
          throw new Error('RECIPIENT_NOT_FOUND: Recipient user not found');
        }

        request.toUser = toUser;

        // Проверка статуса
        if (request.status !== PaymentRequestStatus.PENDING) {
          throw new Error(
            `REQUEST_NOT_AVAILABLE: Request status is ${request.status}`
          );
        }

        // Проверка TTL
        if (new Date() > request.expiresAt) {
          request.status = PaymentRequestStatus.EXPIRED;
          await manager.save(request);
          throw new Error('REQUEST_EXPIRED: Payment request has expired');
        }

        // Проверка idempotency: если fromUserId уже установлен
        if (request.fromUserId) {
          if (request.fromUserId !== params.fromUserId) {
            throw new Error(
              'REQUEST_ALREADY_CLAIMED: Another user is processing this request'
            );
          }
          // Если тот же пользователь - idempotent retry
          if (request.txHash) {
            return {
              txHash: request.txHash,
              status: request.status,
            };
          }
        }

        // Проверка, что отправитель != получатель
        if (params.fromUserId === request.toUserId) {
          throw new Error('CANNOT_PAY_YOURSELF: Cannot pay to yourself');
        }

        // Установка fromUserId (атомарно в транзакции)
        request.fromUserId = params.fromUserId;
        await manager.save(request);

    try {
      // Резолвинг получателя
      const recipientResolved = await this.identityResolver.resolveIdentifier(
        `EY-${request.toUser.id.slice(0, 8).toUpperCase()}`
      );

      if (!recipientResolved) {
        throw new Error('RECIPIENT_NOT_RESOLVED');
      }

      // Определение целевой сети и адреса
      let toChainId: string | null = request.preferredChainId;
      let toAddress: string | null = null;

      if (!toChainId) {
        toChainId = this.identityResolver.getPreferredChainForToken(
          recipientResolved,
          request.tokenSymbol
        );
      }

      if (toChainId) {
        // Если нашли целевую сеть, получаем адрес для этой сети
        toAddress = this.identityResolver.getAddressForChain(recipientResolved, toChainId);
      }

      if (!toChainId || !toAddress) {
        // Fallback: используем оптимальный адрес (primary wallet или первый доступный)
        const optimalAddress = this.identityResolver.getOptimalAddressForToken(
          recipientResolved,
          request.tokenSymbol
        );

        if (!optimalAddress) {
          throw new Error('NO_TARGET_CHAIN');
        }

        toChainId = optimalAddress.chainId;
        toAddress = optimalAddress.address;
      }

      let txHash: string;

      // Нормализация chainId для сравнения
      const normalizedFromChainId = params.fromChainId.toLowerCase();
      const normalizedToChainId = toChainId.toLowerCase();

      // Выполнение перевода
      // ВАЖНО: Backend НЕ имеет приватных ключей и НЕ может отправлять транзакции!
      // Mobile отправляет транзакцию и передаёт txHash в backend для записи.
      
      if (params.txHash) {
        // Mobile уже отправил транзакцию и передал txHash
        txHash = params.txHash;
        
        const transferType = normalizedFromChainId === normalizedToChainId ? 'same-chain' : 'cross-chain';
        this.logger.log(`BLIK ${transferType} payment received txHash from mobile: ${txHash}`);
        
        // Логируем транзакцию в PaymentService для истории
        if (normalizedFromChainId === normalizedToChainId) {
          // Опционально: можно добавить запись в transaction log
          // Пока просто логируем
          this.logger.log(`BLIK same-chain payment: ${request.amount} ${request.tokenSymbol} to ${toAddress}`);
        }
      } else {
        // txHash не передан - это ошибка
        // Mobile должен сначала отправить транзакцию
        const transferType = normalizedFromChainId === normalizedToChainId ? 'same-chain' : 'cross-chain';
        throw new Error(
          `TX_HASH_REQUIRED: For ${transferType} BLIK payments, mobile must send the transaction ` +
          'and provide txHash. The backend does not have access to private keys.'
        );
      }

        // Обновление статуса (атомарно в транзакции)
        request.status = PaymentRequestStatus.COMPLETED;
        request.txHash = txHash;
        request.executedAt = new Date();
        request.actualChainId = params.fromChainId as any;
        await manager.save(request);

        return {
          txHash,
          status: 'completed',
        };
      } catch (error) {
        // В случае ошибки fromUserId остаётся, но статус pending
        // Пользователь может повторить попытку
        throw error;
      }
    }
  );
}

  /**
   * Отмена платежного запроса
   */
  async cancelRequest(code: string, userId: string): Promise<void> {
    const request = await this.paymentRequestRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!request) {
      throw new Error('REQUEST_NOT_FOUND: Payment request not found');
    }

    // Только создатель может отменить
    if (request.toUserId !== userId) {
      throw new Error('FORBIDDEN: Only creator can cancel request');
    }

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new Error('REQUEST_NOT_CANCELLABLE: Request is not pending');
    }

    request.status = PaymentRequestStatus.CANCELLED;
    await this.paymentRequestRepository.save(request);
  }

  /**
   * Генерация уникального кода
   * @private
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateRandomCode();
      const existing = await this.paymentRequestRepository.findOne({
        where: { code },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('CODE_GENERATION_FAILED: Cannot generate unique code');
  }

  /**
   * Генерация криптографически безопасного случайного кода
   * Использует crypto.randomBytes для истинной случайности
   * @private
   */
  private generateRandomCode(): string {
    // Генерируем больше байт, чем нужно, для равномерного распределения
    const bytes = randomBytes(this.CODE_LENGTH * 2);
    let code = '';
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      // Используем 2 байта для лучшего распределения по charset
      const value = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
      const index = value % this.CODE_CHARSET.length;
      code += this.CODE_CHARSET[index];
    }
    
    return code;
  }

  /**
   * Проверка и обновление статуса истёкших запросов
   * Включает grace period для обработки сетевых задержек
   * @private
   */
  private async checkAndUpdateExpiredStatus(
    request: PaymentRequest
  ): Promise<void> {
    if (request.status !== PaymentRequestStatus.PENDING) {
      return;
    }

    const now = Date.now();
    const expiryTime = request.expiresAt.getTime();
    
    // Добавляем grace period для сетевых задержек
    if (now > expiryTime + this.EXPIRY_GRACE_PERIOD_MS) {
      this.logger.log(`BLIK code ${request.code} expired, marking as EXPIRED`);
      request.status = PaymentRequestStatus.EXPIRED;
      await this.paymentRequestRepository.save(request);
    }
  }

  /**
   * Проверяет, валиден ли код (не истёк и в статусе pending)
   * @param code - BLIK код
   * @returns true если код валиден
   */
  async isCodeValid(code: string): Promise<boolean> {
    const request = await this.paymentRequestRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!request) {
      return false;
    }

    await this.checkAndUpdateExpiredStatus(request);

    return request.status === PaymentRequestStatus.PENDING;
  }

  /**
   * Получение всех активных кодов пользователя
   */
  async getActiveCodesByUser(userId: string): Promise<PaymentRequestInfo[]> {
    const requests = await this.paymentRequestRepository.find({
      where: {
        toUserId: userId,
        status: PaymentRequestStatus.PENDING,
      },
      relations: ['toUser'],
      order: { createdAt: 'DESC' },
    });

    // Проверяем expiry для каждого запроса
    const activeRequests: PaymentRequestInfo[] = [];
    
    for (const request of requests) {
      await this.checkAndUpdateExpiredStatus(request);
      
      if (request.status === PaymentRequestStatus.PENDING) {
        const preferredChainId = request.preferredChainId || 'sepolia';
        const wallets = request.toUser?.walletAddress ? [{
          chainId: preferredChainId,
          address: request.toUser.walletAddress,
          isPrimary: true,
        }] : [];

        activeRequests.push({
          code: request.code,
          toUser: {
            id: request.toUserId,
            globalId: request.toUser ? `EY-${request.toUser.id.slice(0, 8).toUpperCase()}` : '',
            nickname: request.toUser?.nickname || '',
            wallets,
          },
          amount: request.amount,
          tokenSymbol: request.tokenSymbol,
          preferredChainId: request.preferredChainId || undefined,
          status: request.status as PaymentRequestStatus,
          expiresAt: request.expiresAt,
          createdAt: request.createdAt,
        });
      }
    }

    return activeRequests;
  }

  /**
   * Получение адреса токена для сети через TokenRegistry
   * @private
   */
  private async getTokenAddress(
    chainId: string,
    tokenSymbol: string
  ): Promise<string> {
    return this.tokenRegistry.getTokenAddress(chainId, tokenSymbol);
  }

  /**
   * Крон-задача для очистки истёкших запросов
   * Должна вызываться периодически (например, каждую минуту)
   */
  async expireOldRequests(): Promise<number> {
    const result = await this.paymentRequestRepository
      .createQueryBuilder()
      .update(PaymentRequest)
      .set({ status: PaymentRequestStatus.EXPIRED })
      .where('status = :status', { status: PaymentRequestStatus.PENDING })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
