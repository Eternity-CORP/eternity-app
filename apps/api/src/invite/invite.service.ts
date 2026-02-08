import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

@Injectable()
export class InviteService implements OnModuleInit {
  private readonly logger = new Logger(InviteService.name);
  private readonly rateLimits = new Map<string, RateLimitEntry>();

  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

  constructor(
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    await this.seedCodes();
  }

  private async seedCodes() {
    const codesEnv = this.configService.get<string>('INVITE_CODES');
    if (!codesEnv) {
      this.logger.warn('No INVITE_CODES configured — invite system disabled');
      return;
    }

    const codes = codesEnv.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);

    for (const code of codes) {
      const { error } = await this.supabase
        .from('invite_codes')
        .upsert({ code }, { onConflict: 'code', ignoreDuplicates: true });

      if (error) {
        this.logger.error(`Failed to seed invite code ${code}: ${error.message}`);
      }
    }

    this.logger.log(`Seeded ${codes.length} invite codes`);
  }

  /**
   * Validate an invite code and bind it to a device fingerprint.
   * - If code is unclaimed → claim it, bind fingerprint
   * - If code is already claimed by THIS fingerprint → allow (re-entry after cache clear)
   * - If code is already claimed by ANOTHER fingerprint → reject (single-use)
   */
  async validate(code: string, fingerprint: string, ip: string): Promise<{ valid: boolean }> {
    const normalizedCode = code.toUpperCase().trim();

    this.checkRateLimit(ip);

    // Check if any codes exist
    const { count, error: countError } = await this.supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      this.logger.error(`Failed to check invite codes: ${countError.message}`);
      throw new HttpException('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // If no codes configured, system is open
    if (!count || count === 0) {
      return { valid: true };
    }

    // Look up the code
    const { data: invite, error: findError } = await this.supabase
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (findError || !invite) {
      this.recordAttempt(ip);
      throw new HttpException(
        { message: 'Invalid invite code', code: 'INVALID_CODE' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if already claimed by a different device
    if (invite.claimed_by_fingerprint && invite.claimed_by_fingerprint !== fingerprint) {
      this.recordAttempt(ip);
      throw new HttpException(
        { message: 'This code has already been used', code: 'CODE_ALREADY_USED' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Claim or re-validate
    const updates: Record<string, unknown> = {
      usage_count: (invite.usage_count || 0) + 1,
      claimed_by_fingerprint: fingerprint,
    };
    if (!invite.claimed_at) {
      updates.claimed_at = new Date().toISOString();
      this.logger.log(`Invite code ${normalizedCode} claimed by device ${fingerprint.slice(0, 8)}...`);
    }

    await this.supabase
      .from('invite_codes')
      .update(updates)
      .eq('code', normalizedCode);

    return { valid: true };
  }

  /**
   * Check if a device fingerprint has already claimed a code.
   * Used for auto-recovery after cache clear.
   */
  async checkDevice(fingerprint: string): Promise<{ valid: boolean }> {
    const { data, error } = await this.supabase
      .from('invite_codes')
      .select('code')
      .eq('claimed_by_fingerprint', fingerprint)
      .limit(1)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    return { valid: true };
  }

  async getStatus(): Promise<{ enabled: boolean; totalCodes: number }> {
    const { count, error } = await this.supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true });

    if (error) {
      this.logger.error(`Failed to get invite status: ${error.message}`);
      return { enabled: false, totalCodes: 0 };
    }

    return {
      enabled: (count || 0) > 0,
      totalCodes: count || 0,
    };
  }

  private checkRateLimit(ip: string) {
    const entry = this.rateLimits.get(ip);
    if (!entry) return;

    const elapsed = Date.now() - entry.firstAttempt;
    if (elapsed > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.delete(ip);
      return;
    }

    if (entry.attempts >= this.MAX_ATTEMPTS) {
      const remainingMs = this.RATE_LIMIT_WINDOW - elapsed;
      throw new HttpException(
        {
          message: 'Too many attempts. Try again later.',
          code: 'RATE_LIMITED',
          remainingMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordAttempt(ip: string) {
    const entry = this.rateLimits.get(ip);
    if (!entry) {
      this.rateLimits.set(ip, { attempts: 1, firstAttempt: Date.now() });
    } else {
      entry.attempts++;
    }
  }
}
