import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SplitService } from './split.service';
import { CreateSplitDto, MarkPaidDto } from './dto';
import { SplitBill } from './entities';

@Controller('api/splits')
export class SplitController {
  constructor(private readonly splitService: SplitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSplitDto): Promise<SplitBill> {
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
  ): Promise<SplitBill> {
    return this.splitService.markParticipantPaid(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Query('address') requesterAddress: string,
  ): Promise<SplitBill> {
    return this.splitService.cancel(id, requesterAddress);
  }
}
