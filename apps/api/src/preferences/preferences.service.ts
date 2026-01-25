import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifyMessage } from 'ethers';
import { AddressPreferences } from './entities/address-preferences.entity';

// Signature message timestamp validity (5 minutes)
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(AddressPreferences)
    private readonly preferencesRepository: Repository<AddressPreferences>,
  ) {}

  /**
   * Find preferences by address
   */
  async findByAddress(address: string): Promise<AddressPreferences | null> {
    return this.preferencesRepository.findOne({
      where: { address: address.toLowerCase() },
    });
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

    let preferences = await this.findByAddress(normalizedAddress);

    if (preferences) {
      preferences.defaultNetwork = defaultNetwork;
      preferences.tokenOverrides = tokenOverrides;
    } else {
      preferences = this.preferencesRepository.create({
        address: normalizedAddress,
        defaultNetwork,
        tokenOverrides,
      });
    }

    return this.preferencesRepository.save(preferences);
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
