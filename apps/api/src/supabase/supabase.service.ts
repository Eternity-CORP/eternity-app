import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
    this.logger.log('Supabase client initialized');
  }

  /**
   * Get the Supabase client for direct access
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Access a table for queries
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any {
    return this.client.from(table);
  }

  /**
   * Subscribe to realtime changes
   */
  channel(name: string) {
    return this.client.channel(name);
  }

  /**
   * Remove a channel subscription
   */
  removeChannel(channel: ReturnType<SupabaseClient['channel']>) {
    return this.client.removeChannel(channel);
  }
}
