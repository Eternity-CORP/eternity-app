import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SplitService } from './split.service';
import { CreateSplitDto, MarkPaidDto } from './dto';
import { SplitBill } from './entities';

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

@Controller('api/splits')
export class SplitController {
  constructor(private readonly splitService: SplitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSplitDto,
    @Headers('x-wallet-address') walletAddress: string,
  ): Promise<SplitBill> {
    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      throw new BadRequestException('Valid wallet address header required');
    }

    if (dto.creatorAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException('Creator address must match wallet address');
    }

    return this.splitService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<SplitBill> {
    return this.splitService.findById(id);
  }

  @Get('creator/:address')
  async findByCreator(@Param('address') address: string): Promise<SplitBill[]> {
    return this.splitService.findByCreator(address);
  }

  @Get('pending/:address')
  async findPending(@Param('address') address: string): Promise<SplitBill[]> {
    return this.splitService.findPendingForAddress(address);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
    @Headers('x-wallet-address') walletAddress: string,
  ): Promise<SplitBill> {
    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      throw new BadRequestException('Valid wallet address header required');
    }

    // Verify the requester is the participant being marked as paid
    if (dto.participantAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException(
        'Wallet address must match the participant being marked as paid',
      );
    }

    return this.splitService.markParticipantPaid(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Headers('x-wallet-address') requesterAddress: string,
  ): Promise<SplitBill> {
    return this.splitService.cancel(id, requesterAddress);
  }
}
