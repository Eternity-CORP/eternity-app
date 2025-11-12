import { Body, Controller, Post, Get, Param, Patch, Delete } from '@nestjs/common';
import { ScheduledPaymentService } from './scheduled-payment.service';
import { UserService } from '../user/user.service';

@Controller('scheduled-payments')
export class ScheduledPaymentController {
  constructor(
    private readonly scheduledPaymentService: ScheduledPaymentService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    const user = await this.userService.findByWalletAddress(dto.walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    const scheduledPayment = await this.scheduledPaymentService.create(dto, user);
    return scheduledPayment;
  }

  @Get(':walletAddress')
  async getUserPayments(@Param('walletAddress') walletAddress: string) {
    const user = await this.userService.findByWalletAddress(walletAddress);
    if (!user) {
      return [];
    }

    return this.scheduledPaymentService.getUserScheduledPayments(user.id);
  }

  @Delete(':paymentId')
  async cancel(
    @Param('paymentId') paymentId: string,
    @Body() dto: { walletAddress: string },
  ) {
    const user = await this.userService.findByWalletAddress(dto.walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    await this.scheduledPaymentService.cancel(paymentId, user.id);
    return { success: true };
  }

  @Patch(':paymentId/complete')
  async markCompleted(
    @Param('paymentId') paymentId: string,
    @Body() dto: { transactionHash: string },
  ) {
    await this.scheduledPaymentService.markCompleted(
      paymentId,
      dto.transactionHash,
    );
    return { success: true };
  }

  @Patch(':paymentId/fail')
  async markFailed(
    @Param('paymentId') paymentId: string,
    @Body() dto: { errorMessage: string },
  ) {
    await this.scheduledPaymentService.markFailed(paymentId, dto.errorMessage);
    return { success: true };
  }
}
