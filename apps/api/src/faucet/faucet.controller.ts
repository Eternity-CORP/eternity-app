import { Controller, Post, Get, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { FaucetService } from './faucet.service';
import { ClaimFaucetDto } from './dto/claim-faucet.dto';

@Controller('faucet')
export class FaucetController {
  constructor(private readonly faucetService: FaucetService) {}

  @Post('claim')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async claim(@Body() dto: ClaimFaucetDto) {
    return this.faucetService.claim(dto.address);
  }

  @Get('status')
  async status() {
    return this.faucetService.getStatus();
  }
}
