import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { UserWallet } from '../../entities/UserWallet.entity';
import { TokenPreference } from '../../entities/TokenPreference.entity';

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserWallet)
    private walletRepository: Repository<UserWallet>,
    @InjectRepository(TokenPreference)
    private tokenPreferenceRepository: Repository<TokenPreference>,
  ) {}

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      globalId: `EY-${user.id.slice(0, 8).toUpperCase()}`,
      nickname: user.nickname || null,
      email: null,
      avatarUrl: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Update user nickname
   */
  async updateNickname(walletAddress: string, nickname: string) {
    // Validate nickname format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
      throw new ConflictException(
        'Nickname must be 3-20 characters (letters, numbers, underscore only)'
      );
    }

    // Check if nickname is already taken
    const existing = await this.userRepository.findOne({
      where: { nickname: nickname.toLowerCase() },
    });

    if (existing && existing.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      const error: any = new ConflictException('Nickname already taken');
      error.response = { ...error.response, code: 'NICKNAME_TAKEN' };
      throw error;
    }

    // Update user
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.nickname = nickname.toLowerCase();
    await this.userRepository.save(user);

    return { success: true };
  }

  /**
   * Get user wallets
   */
  async getWallets(walletAddress: string) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallets = await this.walletRepository.find({
      where: { userId: user.id },
      order: { isPrimary: 'DESC', addedAt: 'DESC' },
    });

    return wallets.map((w) => ({
      id: w.id,
      chainId: w.chainId,
      address: w.address,
      isPrimary: w.isPrimary,
      label: w.label,
      addedAt: w.addedAt.toISOString(),
    }));
  }

  /**
   * Add a new wallet
   */
  async addWallet(
    walletAddress: string,
    chainId: string,
    address: string,
    isPrimary: boolean = false,
    label?: string
  ) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if this address is already assigned to any network
    const existingAddress = await this.walletRepository.findOne({
      where: { userId: user.id, address: address.toLowerCase() },
    });

    if (existingAddress) {
      throw new ConflictException(
        `Address ${address} is already assigned to network ${existingAddress.chainId}`
      );
    }

    // Check if wallet already exists for this specific chain (redundant but explicit)
    const existing = await this.walletRepository.findOne({
      where: { userId: user.id, chainId: chainId as any, address: address.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Wallet already exists for this chain');
    }

    // If setting as primary, unset other primary wallets for this chain
    if (isPrimary) {
      await this.walletRepository.update(
        { userId: user.id, chainId: chainId as any, isPrimary: true },
        { isPrimary: false }
      );
    }

    const wallet = this.walletRepository.create({
      userId: user.id,
      chainId: chainId as any,
      address: address.toLowerCase(),
      isPrimary,
      label: label || null,
    });

    await this.walletRepository.save(wallet);

    return {
      id: wallet.id,
      chainId: wallet.chainId,
      address: wallet.address,
      isPrimary: wallet.isPrimary,
      label: wallet.label,
      addedAt: wallet.addedAt.toISOString(),
    };
  }

  /**
   * Update a wallet
   */
  async updateWallet(
    walletAddress: string,
    walletId: number,
    updates: { chainId?: string; address?: string; isPrimary?: boolean; label?: string }
  ) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // If updating address, check it's not already assigned to another network
    if (updates.address && updates.address.toLowerCase() !== wallet.address) {
      const existingAddress = await this.walletRepository.findOne({
        where: { userId: user.id, address: updates.address.toLowerCase() },
      });

      if (existingAddress) {
        throw new ConflictException(
          `Address ${updates.address} is already assigned to network ${existingAddress.chainId}`
        );
      }
    }

    // If updating chainId, check the new combination doesn't exist
    if (updates.chainId && updates.chainId !== wallet.chainId) {
      const targetAddress = updates.address?.toLowerCase() || wallet.address;
      const existing = await this.walletRepository.findOne({
        where: { userId: user.id, chainId: updates.chainId as any, address: targetAddress },
      });

      if (existing) {
        throw new ConflictException('Wallet already exists for this chain');
      }
    }

    // Apply updates
    if (updates.chainId) wallet.chainId = updates.chainId as any;
    if (updates.address) wallet.address = updates.address.toLowerCase();
    if (updates.label !== undefined) wallet.label = updates.label || null;

    // Handle isPrimary update
    if (updates.isPrimary !== undefined) {
      if (updates.isPrimary) {
        // Unset other primary wallets for this chain
        await this.walletRepository.update(
          { userId: user.id, chainId: wallet.chainId, isPrimary: true },
          { isPrimary: false }
        );
      }
      wallet.isPrimary = updates.isPrimary;
    }

    await this.walletRepository.save(wallet);

    return {
      id: wallet.id,
      chainId: wallet.chainId,
      address: wallet.address,
      isPrimary: wallet.isPrimary,
      label: wallet.label,
      addedAt: wallet.addedAt.toISOString(),
    };
  }

  /**
   * Delete a wallet
   */
  async deleteWallet(walletAddress: string, walletId: number) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId: user.id },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.walletRepository.remove(wallet);

    return { success: true };
  }

  /**
   * Get token preferences
   */
  async getTokenPreferences(walletAddress: string) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = await this.tokenPreferenceRepository.find({
      where: { userId: user.id },
      order: { tokenSymbol: 'ASC' },
    });

    return preferences.map((p) => ({
      id: p.id,
      tokenSymbol: p.tokenSymbol,
      preferredChainId: p.preferredChainId,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Set or update a token preference
   */
  async setTokenPreference(
    walletAddress: string,
    tokenSymbol: string,
    preferredChainId: string
  ) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if preference already exists
    const existing = await this.tokenPreferenceRepository.findOne({
      where: { userId: user.id, tokenSymbol: tokenSymbol.toUpperCase() },
    });

    if (existing) {
      // Token preference already exists, this is an upsert operation
      // One token can only be assigned to one network
      existing.preferredChainId = preferredChainId as any;
      await this.tokenPreferenceRepository.save(existing);

      return {
        id: existing.id,
        tokenSymbol: existing.tokenSymbol,
        preferredChainId: existing.preferredChainId,
        updatedAt: existing.updatedAt.toISOString(),
      };
    } else {
      // Create new preference
      const preference = this.tokenPreferenceRepository.create({
        userId: user.id,
        tokenSymbol: tokenSymbol.toUpperCase(),
        preferredChainId: preferredChainId as any,
      });

      await this.tokenPreferenceRepository.save(preference);

      return {
        id: preference.id,
        tokenSymbol: preference.tokenSymbol,
        preferredChainId: preference.preferredChainId,
        updatedAt: preference.updatedAt.toISOString(),
      };
    }
  }

  /**
   * Update a token preference
   */
  async updateTokenPreference(
    walletAddress: string,
    preferenceId: number,
    updates: { tokenSymbol?: string; preferredChainId?: string }
  ) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preference = await this.tokenPreferenceRepository.findOne({
      where: { id: preferenceId, userId: user.id },
    });

    if (!preference) {
      throw new NotFoundException('Token preference not found');
    }

    // If updating tokenSymbol, check if the new symbol is already assigned
    if (updates.tokenSymbol && updates.tokenSymbol.toUpperCase() !== preference.tokenSymbol) {
      const existing = await this.tokenPreferenceRepository.findOne({
        where: { userId: user.id, tokenSymbol: updates.tokenSymbol.toUpperCase() },
      });

      if (existing) {
        throw new ConflictException(
          `Token ${updates.tokenSymbol} is already assigned to network ${existing.preferredChainId}`
        );
      }
    }

    // Apply updates
    if (updates.tokenSymbol) preference.tokenSymbol = updates.tokenSymbol.toUpperCase();
    if (updates.preferredChainId) preference.preferredChainId = updates.preferredChainId as any;

    await this.tokenPreferenceRepository.save(preference);

    return {
      id: preference.id,
      tokenSymbol: preference.tokenSymbol,
      preferredChainId: preference.preferredChainId,
      updatedAt: preference.updatedAt.toISOString(),
    };
  }

  /**
   * Delete a token preference
   */
  async deleteTokenPreference(walletAddress: string, preferenceId: number) {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preference = await this.tokenPreferenceRepository.findOne({
      where: { id: preferenceId, userId: user.id },
    });

    if (!preference) {
      throw new NotFoundException('Token preference not found');
    }

    await this.tokenPreferenceRepository.remove(preference);

    return { success: true };
  }

  /**
   * Resolve identifier (@nickname, EY-XXX, or address)
   */
  async resolveIdentifier(identifier: string) {
    let user: User | null = null;

    // Remove @ prefix if present
    const cleanIdentifier = identifier.startsWith('@')
      ? identifier.substring(1)
      : identifier;

    // Try to find by nickname
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanIdentifier)) {
      user = await this.userRepository.findOne({
        where: { nickname: cleanIdentifier.toLowerCase() },
      });
    }

    // Try to find by wallet address
    if (!user && /^0x[a-fA-F0-9]{40}$/.test(cleanIdentifier)) {
      user = await this.userRepository.findOne({
        where: { walletAddress: cleanIdentifier.toLowerCase() },
      });
    }

    // Try to find by global ID (EY-XXXXXXXX format)
    if (!user && /^EY-[A-F0-9]{8}$/i.test(cleanIdentifier.toUpperCase())) {
      const id = cleanIdentifier.substring(3).toLowerCase();
      // Search by partial UUID match (cast UUID to text for LOWER function)
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(CAST(user.id AS TEXT)) LIKE :id', { id: `${id}%` })
        .getMany();
      if (users.length > 0) {
        user = users[0];
      }
    }

    if (!user) {
      throw new NotFoundException('RECIPIENT_NOT_FOUND');
    }

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
      globalId: `EY-${user.id.slice(0, 8).toUpperCase()}`,
      nickname: user.nickname || user.walletAddress.slice(0, 8),
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
}
