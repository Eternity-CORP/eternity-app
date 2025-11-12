import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';

@Controller('payments')
@UseGuards(ThrottlerGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('process')
  async process(
    @Body() body: { userId: string; currency: string; amount: string },
    @Headers('Idempotency-Key') idempotencyKey?: string
  ) {
    return await this.paymentsService.process({ ...body, idempotencyKey });
  }
}
