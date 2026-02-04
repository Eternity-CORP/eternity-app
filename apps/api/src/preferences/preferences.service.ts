import { Injectable, Logger } from '@nestjs/common';
import { verifyMessage } from 'ethers';
import { SupabaseService } from '../supabase/supabase.service';

// Signature message timestamp validity (5 minutes)
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

// Supabase row format (snake_case)
interface AddressPreferencesRow {
  address: string;
  default_network: string | null;
  token_overrides: Record<string, string>;
  updated_at: string;
}

// Entity format (camelCase)
export interface AddressPreferences {
  address: string;
  defaultNetwork: string | null;
  tokenOverrides: Record<string, string>;
  updatedAt: Date;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Map Supabase row to entity
   */
  private mapToEntity(row: AddressPreferencesRow): AddressPreferences {
    return {
      address: row.address,
      defaultNetwork: row.default_network,
      tokenOverrides: row.token_overrides,
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Find preferences by address
   */
  async findByAddress(address: string): Promise<AddressPreferences | null> {
    const { data, error } = await this.supabase
      .from('address_preferences')
      .select('*')
      .eq('address', address.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      this.logger.error(`Error finding preferences for ${address}`, error);
      throw error;
    }

    return this.mapToEntity(data);
  }

  /**
   * Save or update preferences
   */
  async upsert(
    address: string,
    defaultNetwork: string | null,
    tokenOverrides: Record<string, string>,
  ): Promise<AddressPreferences> {
    const normalizedAddress = address.toLowerCase();

    const { data, error } = await this.supabase
      .from('address_preferences')
      .upsert({
        address: normalizedAddress,
        default_network: defaultNetwork,
        token_overrides: tokenOverrides,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting preferences for ${address}`, error);
      throw error;
    }

    return this.mapToEntity(data);
  }

  /**
   * Verify signature for preferences update
   * Message format: E-Y:preferences:{address}:{timestamp}
   */
  verifySignature(address: string, signature: string, timestamp: number): boolean {
    // Check timestamp is within 5 minute window
    const now = Date.now();
    if (Math.abs(now - timestamp) > SIGNATURE_MAX_AGE_MS) {
      this.logger.warn(`Timestamp expired for address ${address}`);
      return false;
    }

    try {
      const message = `E-Y:preferences:${address.toLowerCase()}:${timestamp}`;
      const recoveredAddress = verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      this.logger.error(`Signature verification failed for ${address}`, error);
      return false;
    }
  }
}
