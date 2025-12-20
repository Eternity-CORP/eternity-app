import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SwapService } from './swap.service';
import {
  SwapQuoteRequestDto,
  SwapQuoteResponseDto,
  SwapExecuteRequestDto,
  SwapExecuteResponseDto,
  SwapStatusResponseDto,
} from './dto/swap.dto';

@Controller('api/swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() dto: SwapQuoteRequestDto): Promise<SwapQuoteResponseDto> {
    return this.swapService.getQuote(dto);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeSwap(@Body() dto: SwapExecuteRequestDto): Promise<SwapExecuteResponseDto> {
    return this.swapService.executeSwap(dto);
  }

  @Get('status/:executionId')
  async getStatus(@Param('executionId') executionId: string): Promise<SwapStatusResponseDto> {
    return this.swapService.getStatus(executionId);
  }
}
