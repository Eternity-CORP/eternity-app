import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserWallet } from '../entities/UserWallet.entity';
import { TokenPreference } from '../entities/TokenPreference.entity';
import {
  ResolvedIdentity,
  IdentifierType,
  IdentifierParseResult,
} from '../types/resolver.types';

/**
 * Сервис для резолвинга идентификаторов пользователей (упрощенная версия)
 * Поддерживает: nickname (@username), blockchain addresses
 */
@Injectable()
export class IdentityResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(TokenPreference)
    private tokenPreferenceRepository: Repository<TokenPreference>
  ) {}

  /**
   * Основной метод резолвинга идентификатора
   * @param input - Идентификатор (nickname, global_id, или адрес)
   * @returns ResolvedIdentity или null если не найден
   */
  async resolveIdentifier(input: string): Promise<ResolvedIdentity | null> {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return null;
    }

    // Парсинг типа идентификатора
    const parsed = this.parseIdentifier(trimmedInput);

    let user: User | null = null;

    switch (parsed.type) {
      case IdentifierType.NICKNAME:
        user = await this.findByNickname(parsed.value);
        break;

      case IdentifierType.GLOBAL_ID:
        user = await this.findByGlobalId(parsed.value);
        break;

      case IdentifierType.RAW_ADDRESS:
        user = await this.findByAddress(parsed.value);
        break;

      default:
        // Попытка поиска как nickname (fallback)
        user = await this.findByNickname(trimmedInput);
        break;
    }

    if (!user) {
      return null;
    }

    // Загрузка связанных данных
    return this.buildResolvedIdentity(user);
  }

  /**
   * Получить адрес для конкретной сети
   * @param resolved - Резолвленный идентификатор
   * @param chainId - ID сети
   * @returns Адрес или null
   */
  getAddressForChain(resolved: ResolvedIdentity, chainId: string): string | null {
    const wallet = resolved.wallets.find((w) => w.chainId === chainId);
    return wallet ? wallet.address : null;
  }

  /**
   * Получить предпочтительную сеть для токена
   * @param resolved - Резолвленный идентификатор
   * @param tokenSymbol - Символ токена (USDT, USDC, etc.)
   * @returns Chain ID или null
   */
  getPreferredChainForToken(
    resolved: ResolvedIdentity,
    tokenSymbol: string
  ): string | null {
    const preference = resolved.tokenPreferences.find(
      (p) => p.tokenSymbol.toUpperCase() === tokenSymbol.toUpperCase()
    );
    return preference ? preference.preferredChainId : null;
  }

  /**
   * Парсинг типа идентификатора
   * @private
   */
  private parseIdentifier(input: string): IdentifierParseResult {
    // Nickname: начинается с @
    if (input.startsWith('@')) {
      return {
        type: IdentifierType.NICKNAME,
        value: input.substring(1).toLowerCase(),
      };
    }

    // Global ID: формат EY-XXXXX
    if (/^EY-[A-Z0-9]{6,12}$/i.test(input)) {
      return {
        type: IdentifierType.GLOBAL_ID,
        value: input.toUpperCase(),
      };
    }

    // Ethereum/EVM address: 0x + 40 hex символов
    if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
      return {
        type: IdentifierType.RAW_ADDRESS,
        value: input.toLowerCase(),
      };
    }

    // Solana address: base58, 32-44 символа
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
      return {
        type: IdentifierType.RAW_ADDRESS,
        value: input,
      };
    }

    // Bitcoin address
    if (/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(input)) {
      return {
        type: IdentifierType.RAW_ADDRESS,
        value: input,
      };
    }

    return {
      type: IdentifierType.UNKNOWN,
      value: input,
    };
  }

  /**
   * Поиск пользователя по nickname
   * @private
   */
  private async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { nickname: nickname.toLowerCase() },
    });
  }

  /**
   * Поиск пользователя по global_id (EY-XXXXXXXX format)
   * Simple schema doesn't have globalId field, so we extract from ID
   * @private
   */
  private async findByGlobalId(globalId: string): Promise<User | null> {
    // Extract the hex part from "EY-XXXXXXXX" format
    const idPrefix = globalId.substring(3).toLowerCase(); // Remove "EY-"

    // Search for user whose ID starts with this prefix
    // Note: user.id is UUID type, need to cast to text for LOWER function
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER("user"."id"::text) LIKE :id', { id: `${idPrefix}%` })
      .getMany();

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Поиск пользователя по адресу кошелька
   * @private
   */
  private async findByAddress(address: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { walletAddress: address.toLowerCase() },
    });
  }

  /**
   * Построение полного объекта ResolvedIdentity
   * @private
   */
  private async buildResolvedIdentity(user: User): Promise<ResolvedIdentity> {
    // Generate globalId from user id (first 8 characters)
    const globalId = `EY-${user.id.slice(0, 8).toUpperCase()}`;

    // Load wallets
    const wallets = await this.walletRepository.find({
      where: { userId: user.id },
      order: { isPrimary: 'DESC', addedAt: 'DESC' },
    });

    // Load token preferences
    const tokenPreferences = await this.tokenPreferenceRepository.find({
      where: { userId: user.id },
    });

    return {
      userId: user.id,
      nickname: user.nickname,
      globalId: globalId,
      wallets: wallets.map((w) => ({
        chainId: w.chainId,
        address: w.address,
        isPrimary: w.isPrimary,
      })),
      tokenPreferences: tokenPreferences.map((p) => ({
        tokenSymbol: p.tokenSymbol,
        preferredChainId: p.preferredChainId,
      })),
    };
  }

  /**
   * Получить оптимальный адрес для отправки токена
   * Учитывает token preferences и primary wallets
   * @param resolved - Резолвленный идентификатор
   * @param tokenSymbol - Символ токена
   * @returns { chainId, address } или null
   */
  getOptimalAddressForToken(
    resolved: ResolvedIdentity,
    tokenSymbol: string
  ): { chainId: string; address: string } | null {
    // 1. Проверяем token preference
    const preferredChain = this.getPreferredChainForToken(resolved, tokenSymbol);

    if (preferredChain) {
      const address = this.getAddressForChain(resolved, preferredChain);
      if (address) {
        return { chainId: preferredChain, address };
      }
    }

    // 2. Ищем любой primary wallet
    const primaryWallet = resolved.wallets.find((w) => w.isPrimary);
    if (primaryWallet) {
      return {
        chainId: primaryWallet.chainId,
        address: primaryWallet.address,
      };
    }

    // 3. Возвращаем первый доступный wallet
    const firstWallet = resolved.wallets[0];
    if (firstWallet) {
      return {
        chainId: firstWallet.chainId,
        address: firstWallet.address,
      };
    }

    return null;
  }

  /**
   * Валидация, что пользователь может получать платежи
   * @param resolved - Резолвленный идентификатор
   * @returns true если у пользователя есть хотя бы один кошелёк
   */
  canReceivePayments(resolved: ResolvedIdentity): boolean {
    return resolved.wallets.length > 0;
  }

  /**
   * Получить список доступных сетей для пользователя
   * @param resolved - Резолвленный идентификатор
   * @returns Массив chain IDs
   */
  getAvailableChains(resolved: ResolvedIdentity): string[] {
    return [...new Set(resolved.wallets.map((w) => w.chainId))];
  }
}
