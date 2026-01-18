import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from './waitlist.entity';
import { CreateWaitlistDto } from './dto';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
  ) {}

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
    const existing = await this.waitlistRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return { entry: existing, isNew: false };
    }

    // Create new entry
    const entry = this.waitlistRepository.create({
      email: normalizedEmail,
      isBetaTester: dto.isBetaTester || false,
      ip: ip || null,
      userAgent: userAgent || null,
      source: dto.source || 'website',
    });

    await this.waitlistRepository.save(entry);

    return { entry, isNew: true };
  }

  /**
   * Get all waitlist entries
   */
  async findAll(): Promise<{
    total: number;
    betaTesters: number;
    entries: WaitlistEntry[];
  }> {
    const entries = await this.waitlistRepository.find({
      order: { createdAt: 'DESC' },
    });

    return {
      total: entries.length,
      betaTesters: entries.filter((e) => e.isBetaTester).length,
      entries,
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
    const total = await this.waitlistRepository.count();
    const betaTesters = await this.waitlistRepository.count({
      where: { isBetaTester: true },
    });

    const lastEntry = await this.waitlistRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    return {
      total,
      betaTesters,
      lastSignup: lastEntry?.createdAt || null,
    };
  }

  /**
   * Check if email is already registered
   */
  async exists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const count = await this.waitlistRepository.count({
      where: { email: normalizedEmail },
    });
    return count > 0;
  }

  /**
   * Export emails for mailing
   */
  async exportEmails(betaTestersOnly = false): Promise<string[]> {
    const where = betaTestersOnly ? { isBetaTester: true } : {};
    const entries = await this.waitlistRepository.find({
      where,
      select: ['email'],
    });
    return entries.map((e) => e.email);
  }
}
