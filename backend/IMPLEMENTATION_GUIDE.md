# Backend Implementation Guide

## ✅ Что уже создано:

### 1. Database Entities (Complete):
- ✅ User
- ✅ PushToken
- ✅ ScheduledPayment
- ✅ SplitBill
- ✅ SplitBillParticipant
- ✅ Migration файл

### 2. Services (Complete):
- ✅ PushNotificationService (src/services/push-notification.service.ts)

### 3. Modules (Partial):
- ✅ UserModule structure
- ✅ UserService
- ✅ UserController
- ⏳ SplitBillModule (skeleton only)
- ⏳ ScheduledPaymentModule (not created)

---

## 🚀 Что нужно доделать:

### Step 1: Run Migrations
```bash
cd backend

# Если база не создана
createdb eternity_wallet

# Запустить миграции
npm run migration:run
```

### Step 2: Create Missing Files

#### A. SplitBillService
File: `src/modules/split-bill/split-bill.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitBill, SplitBillParticipant } from '../../../database/entities/split-bill.entity';
import { User } from '../../../database/entities/user.entity';
import { PushNotificationService } from '../../services/push-notification.service';
import { UserService } from '../user/user.service';

@Injectable()
export class SplitBillService {
  constructor(
    @InjectRepository(SplitBill)
    private splitBillRepository: Repository<SplitBill>,
    @InjectRepository(SplitBillParticipant)
    private participantRepository: Repository<SplitBillParticipant>,
    private pushService: PushNotificationService,
    private userService: UserService,
  ) {}

  async create(dto: any, creator: User): Promise<SplitBill> {
    const splitBill = this.splitBillRepository.create({
      creator,
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'ETH',
      mode: dto.mode,
      participantsCount: dto.participants.length,
      message: dto.message,
      emoji: dto.emoji,
      shareableLink: dto.shareableLink,
    });

    const saved = await this.splitBillRepository.save(splitBill);

    // Create participants
    const participants = dto.participants.map((p: any) =>
      this.participantRepository.create({
        splitBill: saved,
        participantAddress: p.address.toLowerCase(),
        amount: p.amount,
      }),
    );

    await this.participantRepository.save(participants);

    return this.splitBillRepository.findOne({
      where: { id: saved.id },
      relations: ['participants'],
    });
  }

  async notifyParticipants(splitBillId: string): Promise<void> {
    const splitBill = await this.splitBillRepository.findOne({
      where: { id: splitBillId },
      relations: ['creator', 'participants'],
    });

    if (!splitBill) throw new Error('Split bill not found');

    for (const participant of splitBill.participants) {
      if (!participant.notificationSent) {
        await this.pushService.sendToWalletAddress(
          participant.participantAddress,
          '💸 Split Bill Request',
          `${splitBill.emoji || ''} Pay ${participant.amount} ${splitBill.currency} ${splitBill.message || ''}`,
          { splitBillId: splitBill.id },
        );

        participant.notificationSent = true;
        await this.participantRepository.save(participant);
      }
    }
  }

  async markParticipantPaid(
    participantId: string,
    transactionHash: string,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['splitBill', 'splitBill.creator'],
    });

    if (!participant) throw new Error('Participant not found');

    participant.paid = true;
    participant.transactionHash = transactionHash;
    participant.paidAt = new Date();
    await this.participantRepository.save(participant);

    // Notify creator
    await this.pushService.sendToUser(
      participant.splitBill.creator,
      '✅ Payment Received',
      `Received ${participant.amount} ${participant.splitBill.currency}`,
      { splitBillId: participant.splitBill.id },
    );
  }
}
```

#### B. SplitBillController
File: `src/modules/split-bill/split-bill.controller.ts`

```typescript
import { Body, Controller, Post, Get, Param, Patch } from '@nestjs/common';
import { SplitBillService } from './split-bill.service';
import { UserService } from '../user/user.service';

@Controller('api/split-bills')
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
```

#### C. ScheduledPaymentModule
File: `src/modules/scheduled-payment/scheduled-payment.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledPayment } from '../../../database/entities/scheduled-payment.entity';
import { User } from '../../../database/entities/user.entity';
import { PushToken } from '../../../database/entities/push-token.entity';
import { ScheduledPaymentController } from './scheduled-payment.controller';
import { ScheduledPaymentService } from './scheduled-payment.service';
import { ScheduledPaymentWorker } from './scheduled-payment.worker';
import { PushNotificationService } from '../../services/push-notification.service';
import { UserService } from '../user/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledPayment, User, PushToken])],
  controllers: [ScheduledPaymentController],
  providers: [
    ScheduledPaymentService,
    ScheduledPaymentWorker,
    PushNotificationService,
    UserService,
  ],
  exports: [ScheduledPaymentService],
})
export class ScheduledPaymentModule {}
```

#### D. ScheduledPaymentWorker
File: `src/modules/scheduled-payment/scheduled-payment.worker.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledPayment, ScheduledPaymentStatus } from '../../../database/entities/scheduled-payment.entity';
import { PushNotificationService } from '../../services/push-notification.service';

@Injectable()
export class ScheduledPaymentWorker {
  constructor(
    @InjectRepository(ScheduledPayment)
    private scheduledPaymentRepository: Repository<ScheduledPayment>,
    private pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPayments() {
    const now = new Date();

    const duePayments = await this.scheduledPaymentRepository.find({
      where: {
        scheduledFor: LessThanOrEqual(now),
        status: ScheduledPaymentStatus.PENDING,
      },
      relations: ['user'],
    });

    console.log(`Found ${duePayments.length} due scheduled payments`);

    for (const payment of duePayments) {
      await this.notifyUser(payment);
    }
  }

  private async notifyUser(payment: ScheduledPayment) {
    try {
      await this.pushService.sendToUser(
        payment.user,
        '⏰ Scheduled Payment Due',
        `${payment.emoji || '💸'} Time to send ${payment.amount} ${payment.currency}${payment.message ? ` - ${payment.message}` : ''}`,
        { scheduledPaymentId: payment.id, action: 'execute' },
      );

      console.log(`Notified user for scheduled payment ${payment.id}`);
    } catch (error) {
      console.error(`Failed to notify for payment ${payment.id}:`, error);
    }
  }
}
```

### Step 3: Update app.module.ts

File: `src/app.module.ts`

Add imports:
```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './modules/user/user.module';
import { SplitBillModule } from './modules/split-bill/split-bill.module';
import { ScheduledPaymentModule } from './modules/scheduled-payment/scheduled-payment.module';
```

Add to imports array:
```typescript
imports: [
  ScheduleModule.forRoot(), // For cron jobs
  TypeOrmModule.forRoot({...}),
  UserModule,
  SplitBillModule,
  ScheduledPaymentModule,
  // ... other modules
],
```

### Step 4: Start Backend

```bash
npm run start:dev
```

---

## 📱 Mobile App Integration

### Install Dependencies
```bash
cd mobile
npm install axios
```

### Create API Service
File: `mobile/src/services/api/apiClient.ts`

```typescript
import axios from 'axios';

const API_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-api.com';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User APIs
export const registerUser = async (walletAddress: string) => {
  const response = await apiClient.post('/api/users/register', {
    walletAddress,
  });
  return response.data;
};

export const registerPushToken = async (
  walletAddress: string,
  expoPushToken: string,
  platform: 'IOS' | 'ANDROID',
) => {
  const response = await apiClient.post('/api/users/push-token', {
    walletAddress,
    expoPushToken,
    platform,
  });
  return response.data;
};

// Split Bill APIs
export const createSplitBill = async (data: any) => {
  const response = await apiClient.post('/api/split-bills', data);
  return response.data;
};

export const notifySplitBillParticipants = async (splitBillId: string) => {
  const response = await apiClient.post(
    `/api/split-bills/${splitBillId}/notify`,
  );
  return response.data;
};

// Scheduled Payment APIs
export const createScheduledPayment = async (data: any) => {
  const response = await apiClient.post('/api/scheduled-payments', data);
  return response.data;
};
```

### Update App.tsx to Register Push Token

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken, registerUser } from './src/services/api/apiClient';

useEffect(() => {
  async function setupNotifications() {
    if (!activeAccount) return;

    // Register user
    await registerUser(activeAccount.address);

    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    // Register with backend
    await registerPushToken(
      activeAccount.address,
      token,
      Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    );

    console.log('Push token registered successfully');
  }

  setupNotifications();
}, [activeAccount]);
```

---

## 🧪 Testing

### Test Push Notifications
```bash
curl -X POST http://localhost:3000/api/users/push-token \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123...",
    "expoPushToken": "ExponentPushToken[xxx]",
    "platform": "IOS"
  }'
```

### Test Split Bill Creation
```bash
curl -X POST http://localhost:3000/api/split-bills \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x123...",
    "totalAmount": "0.1",
    "currency": "ETH",
    "mode": "EQUAL",
    "participants": [
      {"address": "0x456...", "amount": "0.05"},
      {"address": "0x789...", "amount": "0.05"}
    ],
    "message": "Dinner split",
    "emoji": "🍕"
  }'
```

---

## ✅ Checklist

- [ ] Run migrations
- [ ] Create missing service files
- [ ] Create controller files
- [ ] Update app.module.ts
- [ ] Start backend server
- [ ] Test user registration
- [ ] Test push token registration
- [ ] Install mobile dependencies
- [ ] Create API client
- [ ] Update App.tsx
- [ ] Test end-to-end notification

---

## 🎉 Result

После завершения у вас будет:
- ✅ Backend API на порту 3000
- ✅ Push notifications через Expo
- ✅ Split Bill с уведомлениями
- ✅ Scheduled payments с cron worker
- ✅ Минимальное хранение данных (только wallet addresses)
