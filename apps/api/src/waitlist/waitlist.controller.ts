import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from './dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(
    private readonly waitlistService: WaitlistService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate admin token from Authorization header (Bearer token)
   */
  private validateAdminToken(authHeader?: string): void {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');
    const token = authHeader?.replace('Bearer ', '');

    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Invalid admin token');
    }
  }

  /**
   * POST /waitlist - Add email to waitlist
   */
  @Post()
  async create(
    @Body() dto: CreateWaitlistDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = forwardedFor || realIp || undefined;

    const { entry, isNew } = await this.waitlistService.create(
      dto,
      ip,
      userAgent,
    );

    return {
      success: true,
      message: isNew ? 'Successfully joined waitlist' : 'Email already registered',
      isNew,
      entry: {
        email: entry.email,
        isBetaTester: entry.isBetaTester,
      },
    };
  }

  /**
   * GET /waitlist - Get all entries (admin only)
   * Token must be sent via Authorization: Bearer <token> header
   */
  @Get()
  async findAll(@Headers('authorization') authHeader?: string) {
    this.validateAdminToken(authHeader);
    return this.waitlistService.findAll();
  }

  /**
   * GET /waitlist/stats - Get stats only (admin only)
   * Token must be sent via Authorization: Bearer <token> header
   */
  @Get('stats')
  async getStats(@Headers('authorization') authHeader?: string) {
    this.validateAdminToken(authHeader);
    return this.waitlistService.getStats();
  }

  /**
   * GET /waitlist/export - Export emails (admin only)
   * Token must be sent via Authorization: Bearer <token> header
   */
  @Get('export')
  async exportEmails(
    @Headers('authorization') authHeader?: string,
    @Query('betaOnly') betaOnly?: string,
  ) {
    this.validateAdminToken(authHeader);

    const emails = await this.waitlistService.exportEmails(betaOnly === 'true');

    return {
      count: emails.length,
      emails,
    };
  }
}
