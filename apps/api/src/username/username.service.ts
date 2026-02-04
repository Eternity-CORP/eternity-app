import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { verifyMessage } from 'ethers';
import { RegisterUsernameDto, UpdateUsernameDto, DeleteUsernameDto } from './dto';
import { PreferencesService } from '../preferences/preferences.service';
import { SupabaseService } from '../supabase/supabase.service';

// Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'support', 'help',
  'eternity', 'blik', 'system',
  'root', 'api', 'www', 'app', 'wallet',
  'send', 'receive', 'settings', 'profile',
];

// Signature message timestamp validity (5 minutes)
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

@Injectable()
export class UsernameService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly preferencesService: PreferencesService,
  ) {}

  /**
   * Lookup username -> address with preferences
   */
  async lookup(username: string): Promise<{
    username: string;
    address: string;
    preferences: { defaultNetwork: string | null; tokenOverrides: Record<string, string> } | null;
    createdAt: Date;
  } | null> {
    const normalizedUsername = username.toLowerCase();
    const { data: record, error } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('username', normalizedUsername)
      .single();

    if (error || !record) {
      return null;
    }

    // Fetch preferences for this address
    const preferences = await this.preferencesService.findByAddress(record.address);

    return {
      username: record.username,
      address: record.address,
      preferences: preferences
        ? {
            defaultNetwork: preferences.defaultNetwork,
            tokenOverrides: preferences.tokenOverrides,
          }
        : null,
      createdAt: new Date(record.created_at),
    };
  }

  /**
   * Reverse lookup: address -> username
   */
  async lookupByAddress(address: string): Promise<{ username: string; address: string } | null> {
    const normalizedAddress = address.toLowerCase();
    const { data: record, error } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('address', normalizedAddress)
      .single();

    if (error || !record) {
      return null;
    }

    return {
      username: record.username,
      address: record.address,
    };
  }

  /**
   * Check if username is available
   */
  async isAvailable(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    // Check reserved list
    if (RESERVED_USERNAMES.includes(normalizedUsername)) {
      return false;
    }

    // Check if already taken
    const { data: existing } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('username', normalizedUsername)
      .single();

    return !existing;
  }

  /**
   * Register a new username
   */
  async register(dto: RegisterUsernameDto): Promise<{ username: string; address: string }> {
    const normalizedUsername = dto.username.toLowerCase();
    const normalizedAddress = dto.address.toLowerCase();

    // Validate username format
    if (!this.isValidUsernameFormat(normalizedUsername)) {
      throw new BadRequestException({
        code: 'USERNAME_INVALID_FORMAT',
        message: 'Username must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, and underscores',
      });
    }

    // Check reserved words
    if (RESERVED_USERNAMES.includes(normalizedUsername)) {
      throw new BadRequestException({
        code: 'USERNAME_RESERVED',
        message: 'This username is reserved and cannot be claimed',
      });
    }

    // Check if username is taken
    const { data: existingUsername } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('username', normalizedUsername)
      .single();
    if (existingUsername) {
      throw new ConflictException({
        code: 'USERNAME_TAKEN',
        message: 'This username is already taken',
      });
    }

    // Check if address already has a username
    const { data: existingAddress } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('address', normalizedAddress)
      .single();
    if (existingAddress) {
      throw new ConflictException({
        code: 'ADDRESS_HAS_USERNAME',
        message: 'This address already has a registered username',
      });
    }

    // Verify signature
    this.verifySignature(normalizedUsername, normalizedAddress, dto.signature, dto.timestamp, 'claim');

    // Create record
    const { data: record, error } = await this.supabase
      .from('usernames')
      .insert({
        username: normalizedUsername,
        address: normalizedAddress,
        signature: dto.signature,
      })
      .select()
      .single();

    if (error || !record) {
      throw new BadRequestException({
        code: 'USERNAME_CREATE_FAILED',
        message: 'Failed to create username',
      });
    }

    return {
      username: record.username,
      address: record.address,
    };
  }

  /**
   * Update username (change to a new one)
   */
  async update(dto: UpdateUsernameDto): Promise<{ username: string; address: string }> {
    const normalizedNewUsername = dto.newUsername.toLowerCase();
    const normalizedAddress = dto.address.toLowerCase();

    // Find existing record for this address
    const { data: existingRecord, error: findError } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('address', normalizedAddress)
      .single();
    if (findError || !existingRecord) {
      throw new NotFoundException({
        code: 'USERNAME_NOT_FOUND',
        message: 'No username found for this address',
      });
    }

    // Validate new username format
    if (!this.isValidUsernameFormat(normalizedNewUsername)) {
      throw new BadRequestException({
        code: 'USERNAME_INVALID_FORMAT',
        message: 'Username must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, and underscores',
      });
    }

    // Check reserved words
    if (RESERVED_USERNAMES.includes(normalizedNewUsername)) {
      throw new BadRequestException({
        code: 'USERNAME_RESERVED',
        message: 'This username is reserved and cannot be claimed',
      });
    }

    // Check if new username is taken (by someone else)
    const { data: existingUsername } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('username', normalizedNewUsername)
      .single();
    if (existingUsername && existingUsername.address !== normalizedAddress) {
      throw new ConflictException({
        code: 'USERNAME_TAKEN',
        message: 'This username is already taken',
      });
    }

    // Verify signature
    this.verifySignature(normalizedNewUsername, normalizedAddress, dto.signature, dto.timestamp, 'update');

    // Update record
    const { data: updatedRecord, error: updateError } = await this.supabase
      .from('usernames')
      .update({
        username: normalizedNewUsername,
        signature: dto.signature,
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (updateError || !updatedRecord) {
      throw new BadRequestException({
        code: 'USERNAME_UPDATE_FAILED',
        message: 'Failed to update username',
      });
    }

    return {
      username: updatedRecord.username,
      address: updatedRecord.address,
    };
  }

  /**
   * Delete username
   */
  async delete(dto: DeleteUsernameDto): Promise<void> {
    const normalizedAddress = dto.address.toLowerCase();

    // Find existing record
    const { data: existingRecord, error: findError } = await this.supabase
      .from('usernames')
      .select('*')
      .eq('address', normalizedAddress)
      .single();
    if (findError || !existingRecord) {
      throw new NotFoundException({
        code: 'USERNAME_NOT_FOUND',
        message: 'No username found for this address',
      });
    }

    // Verify signature
    this.verifySignature(existingRecord.username, normalizedAddress, dto.signature, dto.timestamp, 'delete');

    // Delete record
    const { error: deleteError } = await this.supabase
      .from('usernames')
      .delete()
      .eq('id', existingRecord.id);

    if (deleteError) {
      throw new BadRequestException({
        code: 'USERNAME_DELETE_FAILED',
        message: 'Failed to delete username',
      });
    }
  }

  /**
   * Validate username format
   */
  private isValidUsernameFormat(username: string): boolean {
    const regex = /^[a-z][a-z0-9_]{2,19}$/;
    return regex.test(username);
  }

  /**
   * Verify signature for username operations
   */
  private verifySignature(
    username: string,
    address: string,
    signature: string,
    timestamp: number,
    action: 'claim' | 'update' | 'delete',
  ): void {
    // Check timestamp
    const now = Date.now();
    if (now - timestamp > SIGNATURE_MAX_AGE_MS) {
      throw new BadRequestException({
        code: 'TIMESTAMP_EXPIRED',
        message: 'Signature timestamp has expired. Please try again.',
      });
    }

    // Construct message
    const message = `E-Y:${action}:@${username}:${address}:${timestamp}`;

    try {
      const recoveredAddress = verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new BadRequestException({
          code: 'SIGNATURE_INVALID',
          message: 'Invalid signature. Please sign with the correct wallet.',
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        code: 'SIGNATURE_INVALID',
        message: 'Invalid signature format.',
      });
    }
  }
}
