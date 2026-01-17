import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitBill, SplitParticipant } from './entities';
import { CreateSplitDto, MarkPaidDto } from './dto';
import { SplitGateway } from './split.gateway';

@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    @InjectRepository(SplitBill)
    private readonly splitBillRepository: Repository<SplitBill>,
    @InjectRepository(SplitParticipant)
    private readonly participantRepository: Repository<SplitParticipant>,
    @Inject(forwardRef(() => SplitGateway))
    private readonly splitGateway: SplitGateway,
  ) {}

  async create(dto: CreateSplitDto): Promise<SplitBill> {
    this.logger.log(`Creating split bill for ${dto.creatorAddress}`);

    const splitBill = this.splitBillRepository.create({
      creatorAddress: dto.creatorAddress.toLowerCase(),
      creatorUsername: dto.creatorUsername,
      totalAmount: dto.totalAmount,
      tokenSymbol: dto.tokenSymbol,
      description: dto.description,
      status: 'active',
      participants: dto.participants.map((p) => ({
        address: p.address.toLowerCase(),
        username: p.username,
        name: p.name,
        amount: p.amount,
        status: 'pending' as const,
      })),
    });

    const saved = await this.splitBillRepository.save(splitBill);
    this.logger.log(`Split bill created: ${saved.id}`);

    // Notify participants via WebSocket
    this.splitGateway.notifySplitCreated(saved);

    return saved;
  }

  async findById(id: string): Promise<SplitBill> {
    const splitBill = await this.splitBillRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!splitBill) {
      throw new NotFoundException(`Split bill ${id} not found`);
    }

    return splitBill;
  }

  async findByCreator(creatorAddress: string): Promise<SplitBill[]> {
    return this.splitBillRepository.find({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingForAddress(address: string): Promise<SplitBill[]> {
    const normalizedAddress = address.toLowerCase();

    // Find all split bills where this address is a participant with pending status
    const participants = await this.participantRepository.find({
      where: {
        address: normalizedAddress,
        status: 'pending',
      },
      relations: ['splitBill', 'splitBill.participants'],
    });

    // Filter to only active split bills
    return participants
      .map((p) => p.splitBill)
      .filter((bill) => bill && bill.status === 'active');
  }

  async markParticipantPaid(
    splitId: string,
    dto: MarkPaidDto,
  ): Promise<SplitBill> {
    const splitBill = await this.findById(splitId);

    if (splitBill.status !== 'active') {
      throw new BadRequestException('Split bill is not active');
    }

    const participant = splitBill.participants.find(
      (p) => p.address.toLowerCase() === dto.participantAddress.toLowerCase(),
    );

    if (!participant) {
      throw new NotFoundException('Participant not found in this split');
    }

    if (participant.status === 'paid') {
      throw new BadRequestException('Participant already paid');
    }

    // Update participant
    participant.status = 'paid';
    participant.paidTxHash = dto.txHash;
    participant.paidAt = new Date();

    await this.participantRepository.save(participant);

    // Check if all participants have paid
    const updatedBill = await this.findById(splitId);
    const allPaid = updatedBill.participants.every((p) => p.status === 'paid');

    // Notify about payment
    this.splitGateway.notifyParticipantPaid(updatedBill, dto.participantAddress);

    if (allPaid) {
      updatedBill.status = 'completed';
      await this.splitBillRepository.save(updatedBill);
      this.logger.log(`Split bill ${splitId} completed - all participants paid`);

      // Notify completion
      this.splitGateway.notifySplitCompleted(updatedBill);
    }

    return this.findById(splitId);
  }

  async cancel(id: string, requesterAddress: string): Promise<SplitBill> {
    const splitBill = await this.findById(id);

    if (splitBill.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can cancel split bill');
    }

    if (splitBill.status !== 'active') {
      throw new BadRequestException('Split bill is not active');
    }

    // Check if any participant has already paid
    const hasPaid = splitBill.participants.some((p) => p.status === 'paid');
    if (hasPaid) {
      throw new BadRequestException('Cannot cancel - some participants have already paid');
    }

    splitBill.status = 'cancelled';
    await this.splitBillRepository.save(splitBill);

    this.logger.log(`Split bill ${id} cancelled by ${requesterAddress}`);

    // Notify participants
    this.splitGateway.notifySplitCancelled(splitBill);

    return splitBill;
  }
}
