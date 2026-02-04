import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WaitlistEntry } from './waitlist.entity';
import { CreateWaitlistDto } from './dto';

interface SupabaseWaitlistEntry {
  id: string;
  email: string;
  is_beta_tester: boolean;
  ip: string | null;
  user_agent: string | null;
  source: string | null;
  created_at: string;
}

@Injectable()
export class WaitlistService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Map Supabase snake_case fields to camelCase entity
   */
  private mapToEntity(dbEntry: SupabaseWaitlistEntry): WaitlistEntry {
    return {
      id: dbEntry.id,
      email: dbEntry.email,
      isBetaTester: dbEntry.is_beta_tester,
      ip: dbEntry.ip,
      userAgent: dbEntry.user_agent,
      source: dbEntry.source,
      createdAt: new Date(dbEntry.created_at),
    };
  }

  /**
   * Add new entry to waitlist
   */
  async create(
    dto: CreateWaitlistDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ entry: WaitlistEntry; isNew: boolean }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if already exists
    const { data: existing, error: findError } = await this.supabaseService
      .from('waitlist')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existing && !findError) {
      return { entry: this.mapToEntity(existing), isNew: false };
    }

    // Create new entry
    const { data: newEntry, error: insertError } = await this.supabaseService
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        is_beta_tester: dto.isBetaTester || false,
        ip: ip || null,
        user_agent: userAgent || null,
        source: dto.source || 'website',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create waitlist entry: ${insertError.message}`);
    }

    return { entry: this.mapToEntity(newEntry), isNew: true };
  }

  /**
   * Get all waitlist entries
   */
  async findAll(): Promise<{
    total: number;
    betaTesters: number;
    entries: WaitlistEntry[];
  }> {
    const { data: entries, error } = await this.supabaseService
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch waitlist entries: ${error.message}`);
    }

    const mappedEntries = (entries || []).map((e) => this.mapToEntity(e));

    return {
      total: mappedEntries.length,
      betaTesters: mappedEntries.filter((e) => e.isBetaTester).length,
      entries: mappedEntries,
    };
  }

  /**
   * Get stats only
   */
  async getStats(): Promise<{
    total: number;
    betaTesters: number;
    lastSignup: Date | null;
  }> {
    // Get total count
    const { count: total, error: totalError } = await this.supabaseService
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get beta testers count
    const { count: betaTesters, error: betaError } = await this.supabaseService
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('is_beta_tester', true);

    if (betaError) {
      throw new Error(`Failed to get beta testers count: ${betaError.message}`);
    }

    // Get last entry
    const { data: lastEntry, error: lastError } = await this.supabaseService
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      total: total || 0,
      betaTesters: betaTesters || 0,
      lastSignup: lastEntry && !lastError ? new Date(lastEntry.created_at) : null,
    };
  }

  /**
   * Check if email is already registered
   */
  async exists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const { count, error } = await this.supabaseService
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail);

    if (error) {
      throw new Error(`Failed to check email existence: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  /**
   * Export emails for mailing
   */
  async exportEmails(betaTestersOnly = false): Promise<string[]> {
    let query = this.supabaseService.from('waitlist').select('email');

    if (betaTestersOnly) {
      query = query.eq('is_beta_tester', true);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw new Error(`Failed to export emails: ${error.message}`);
    }

    return (entries || []).map((e) => e.email);
  }
}
