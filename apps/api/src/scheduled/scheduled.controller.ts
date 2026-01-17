import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ScheduledService } from './scheduled.service';
import { CreateScheduledDto, UpdateScheduledDto, ExecuteScheduledDto } from './dto';

@Controller('api/scheduled')
export class ScheduledController {
  constructor(private readonly scheduledService: ScheduledService) {}

  /**
   * Create a new scheduled payment
   */
  @Post()
  async create(
    @Body() dto: CreateScheduledDto,
    @Headers('x-wallet-address') walletAddress: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    // Ensure creator address matches wallet
    if (dto.creatorAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new BadRequestException('Creator address must match wallet address');
    }

    return this.scheduledService.create(dto);
  }

  /**
   * Get all scheduled payments for a user
   */
  @Get()
  async findAll(@Headers('x-wallet-address') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.scheduledService.findByCreator(walletAddress);
  }

  /**
   * Get pending scheduled payments
   */
  @Get('pending')
  async findPending(@Headers('x-wallet-address') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.scheduledService.findPending(walletAddress);
  }

  /**
   * Get upcoming scheduled payments (default: next 7 days)
   */
  @Get('upcoming')
  async findUpcoming(
    @Headers('x-wallet-address') walletAddress: string,
    @Query('days') days?: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.scheduledService.findUpcoming(walletAddress, daysNumber);
  }

  /**
   * Get a specific scheduled payment by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.scheduledService.findById(id);
  }

  /**
   * Update a scheduled payment
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledDto,
    @Headers('x-wallet-address') walletAddress: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.scheduledService.update(id, dto, walletAddress);
  }

  /**
   * Execute a scheduled payment (mark as executed with tx hash)
   */
  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @Body() dto: ExecuteScheduledDto,
    @Headers('x-wallet-address') walletAddress: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.scheduledService.execute(id, dto, walletAddress);
  }

  /**
   * Cancel a scheduled payment
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Headers('x-wallet-address') walletAddress: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.scheduledService.cancel(id, walletAddress);
  }

  /**
   * Delete a scheduled payment
   */
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('x-wallet-address') walletAddress: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    await this.scheduledService.delete(id, walletAddress);
    return { success: true };
  }
}
