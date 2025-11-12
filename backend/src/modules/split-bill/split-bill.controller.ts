import { Body, Controller, Post, Param, Patch } from '@nestjs/common';
import { SplitBillService } from './split-bill.service';
import { UserService } from '../user/user.service';

@Controller('split-bills')
export class SplitBillController {
  constructor(
    private readonly splitBillService: SplitBillService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    const creator = await this.userService.findByWalletAddress(dto.creatorAddress);
    if (!creator) {
      throw new Error('Creator not found');
    }

    const splitBill = await this.splitBillService.create(dto, creator);

    // Send notifications
    await this.splitBillService.notifyParticipants(splitBill.id);

    return splitBill;
  }

  @Post(':id/notify')
  async notify(@Param('id') id: string) {
    await this.splitBillService.notifyParticipants(id);
    return { success: true };
  }

  @Patch('participants/:participantId/mark-paid')
  async markPaid(
    @Param('participantId') participantId: string,
    @Body() dto: { transactionHash: string },
  ) {
    await this.splitBillService.markParticipantPaid(
      participantId,
      dto.transactionHash,
    );
    return { success: true };
  }
}
