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
   */
  @Get()
  async findAll(@Query('token') token?: string) {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');

    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return this.waitlistService.findAll();
  }

  /**
   * GET /waitlist/stats - Get stats only (admin only)
   */
  @Get('stats')
  async getStats(@Query('token') token?: string) {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');

    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return this.waitlistService.getStats();
  }

  /**
   * GET /waitlist/export - Export emails (admin only)
   */
  @Get('export')
  async exportEmails(
    @Query('token') token?: string,
    @Query('betaOnly') betaOnly?: string,
  ) {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');

    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    const emails = await this.waitlistService.exportEmails(betaOnly === 'true');

    return {
      count: emails.length,
      emails,
    };
  }
}
