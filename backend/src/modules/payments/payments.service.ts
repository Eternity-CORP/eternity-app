import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../../database/entities/payment.entity';
import { User } from '../../../database/entities/user.entity';
import type Redis from 'ioredis';

interface ProcessPaymentDto {
  userId: string;
  currency: string;
  amount: string; // string decimal
  idempotencyKey?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject('REDIS') private readonly redis: Redis
  ) {}

  async process(dto: ProcessPaymentDto) {
    if (dto.idempotencyKey) {
      const cached = await this.redis.get(`idem:${dto.idempotencyKey}`);
      if (cached) return JSON.parse(cached);
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('User not found');

    const payment = this.paymentRepo.create({
      user,
      currency: dto.currency,
      amount: dto.amount,
      status: PaymentStatus.PENDING,
      idempotencyKey: dto.idempotencyKey ?? null
    });
    await this.paymentRepo.save(payment);

    // NOTE: In production, mobile client handles blockchain transactions.
    // Backend receives txHash from mobile after broadcast confirmation.
    // This stub auto-completes for development/testing purposes.
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionHash = `tx_${Date.now()}`;
    await this.paymentRepo.save(payment);

    const response = { id: payment.id, status: payment.status, txHash: payment.transactionHash };

    if (dto.idempotencyKey) {
      await this.redis.set(`idem:${dto.idempotencyKey}`, JSON.stringify(response), 'EX', 60 * 60);
    }

    return response;
  }
}
