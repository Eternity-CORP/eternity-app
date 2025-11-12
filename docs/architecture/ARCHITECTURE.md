# Architecture Documentation
# Eternity Wallet - System Architecture

**Version:** 1.0
**Last Updated:** 2025-10-29

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Mobile Application Architecture](#mobile-application-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [Integration Architecture](#integration-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Mobile Application                           │
│                      (React Native + Expo)                           │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │   UI Layer      │  │  Business Logic │  │   Data Layer    │    │
│  │  - Screens      │  │  - Services     │  │  - AsyncStorage │    │
│  │  - Components   │  │  - Utils        │  │  - SecureStore  │    │
│  │  - Navigation   │  │  - State Mgmt   │  │  - API Client   │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
└────────────────┬──────────────────────────────────────┬─────────────┘
                 │                                       │
                 │ HTTPS/REST                           │ RPC
                 ▼                                       ▼
┌────────────────────────────────────┐   ┌──────────────────────────┐
│     Backend API (NestJS)           │   │   Ethereum Network       │
│                                    │   │   (via Alchemy RPC)      │
│  ┌──────────────────────────────┐ │   │                          │
│  │  Controllers                 │ │   │  - Mainnet               │
│  │  - User                      │ │   │  - Sepolia Testnet       │
│  │  - SplitBill                 │ │   │                          │
│  │  - ScheduledPayment          │ │   └──────────────────────────┘
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │   ┌──────────────────────────┐
│  │  Services                    │ │   │   Expo Push Service      │
│  │  - Business Logic            │─┼──▶│                          │
│  │  - PushNotificationService   │ │   │  - Send Notifications    │
│  └──────────────────────────────┘ │   └──────────────────────────┘
│  ┌──────────────────────────────┐ │
│  │  Data Access (TypeORM)       │ │   ┌──────────────────────────┐
│  │  - Repositories              │─┼──▶│   PostgreSQL Database    │
│  │  - Entities                  │ │   │                          │
│  └──────────────────────────────┘ │   │  - users                 │
│  ┌──────────────────────────────┐ │   │  - push_tokens           │
│  │  Background Workers          │ │   │  - split_bills           │
│  │  - Cron: Scheduled Payments  │ │   │  - scheduled_payments    │
│  └──────────────────────────────┘ │   └──────────────────────────┘
└────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

**Send Transaction Flow:**
```
User → SendScreen → TransactionService → ethers.js
→ Sign with Private Key → Alchemy RPC → Ethereum Network
```

**Split Bill Creation Flow:**
```
User → SplitBillScreen → splitBillService (local)
→ API Client → Backend SplitBillController
→ SplitBillService → Database → PushNotificationService
→ Expo Push Service → Participants' Devices
```

**Scheduled Payment Execution Flow:**
```
Cron Worker (every minute) → Check scheduledFor <= now()
→ Find PENDING payments → PushNotificationService
→ Send Notification → User Opens App → Executes Payment
```

---

## 2. Mobile Application Architecture

### 2.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Screens    │  │  Components  │  │  Navigation  │  │
│  │              │  │              │  │              │  │
│  │ - Home       │  │ - SwipeTo    │  │ - Root       │  │
│  │ - Send       │  │   Confirm    │  │ - Main Stack │  │
│  │ - Receive    │  │ - Emoji      │  │ - Tab Nav    │  │
│  │ - SplitBill  │  │   Picker     │  │ - Deep Link  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Business Logic Layer                    │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Services    │  │    Utils     │  │    Types     │  │
│  │              │  │              │  │              │  │
│  │ - transaction│  │ - validation │  │ - splitBill  │  │
│  │ - splitBill  │  │ - formatting │  │ - scheduled  │  │
│  │ - scheduled  │  │ - crypto     │  │ - pending    │  │
│  │ - pending    │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AsyncStorage │  │ SecureStore  │  │  API Client  │  │
│  │              │  │              │  │              │  │
│  │ - SplitBills │  │ - PrivateKey │  │ - axios      │  │
│  │ - Scheduled  │  │ - SeedPhrase │  │ - endpoints  │  │
│  │ - Pending    │  │              │  │ - interceptor│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 File Structure

```
mobile/
├── app.json                      # Expo configuration
├── App.tsx                       # Root component
├── package.json
└── src/
    ├── navigation/
    │   ├── RootNavigator.tsx     # Deep linking setup
    │   ├── MainNavigator.tsx     # Stack navigation
    │   └── TabNavigator.tsx      # Bottom tabs
    │
    ├── screens/
    │   ├── HomeScreen.tsx
    │   ├── SendScreen.tsx
    │   ├── ReceiveScreen.tsx
    │   ├── SplitBillScreen.tsx
    │   ├── SplitBillHistoryScreen.tsx
    │   ├── PaySplitBillScreen.tsx
    │   ├── PendingPaymentsScreen.tsx
    │   ├── SchedulePaymentScreen.tsx
    │   ├── ScheduledPaymentsListScreen.tsx
    │   ├── AddMoneyScreen.tsx
    │   └── TransakWidgetScreen.tsx
    │
    ├── components/
    │   ├── SwipeToConfirm.tsx
    │   └── EmojiPicker.tsx
    │
    ├── services/
    │   ├── transactionService.ts
    │   ├── splitBillService.ts
    │   ├── scheduledPaymentService.ts
    │   ├── pendingPaymentsService.ts
    │   └── api/
    │       └── apiClient.ts       # To be created
    │
    ├── types/
    │   ├── splitBill.types.ts
    │   ├── scheduledPayment.types.ts
    │   └── pendingPayment.types.ts
    │
    ├── utils/
    │   ├── validation.ts
    │   ├── formatting.ts
    │   └── crypto.ts
    │
    └── constants/
        └── theme.ts
```

### 2.3 State Management

**Approach:** React Hooks + Context API + AsyncStorage

**State Categories:**
1. **Wallet State**: Active wallet, balance (React Context)
2. **Transaction State**: Pending transactions (local state)
3. **Split Bills**: Persisted in AsyncStorage
4. **Scheduled Payments**: Persisted in AsyncStorage
5. **Pending Payments**: Persisted in AsyncStorage

**No Redux:** Using simpler state management for MVP

### 2.4 Navigation Structure

```
RootNavigator (Deep Linking)
└── MainNavigator (Stack)
    ├── BottomTabNavigator
    │   ├── HomeScreen
    │   ├── SendScreen
    │   ├── ReceiveScreen
    │   └── SettingsScreen
    │
    └── Modal Screens (Stack)
        ├── SplitBillScreen
        ├── SplitBillHistoryScreen
        ├── PaySplitBillScreen
        ├── PendingPaymentsScreen
        ├── SchedulePaymentScreen
        ├── ScheduledPaymentsListScreen
        ├── AddMoneyScreen
        └── TransakWidgetScreen
```

**Deep Link Format:** `eternitywallet://pay-split-bill?to=0x...&amount=0.05`

---

## 3. Backend Architecture

### 3.1 NestJS Module Architecture

```
AppModule (Root)
├── ConfigModule (Global)
├── ScheduleModule (Global - for cron)
├── TypeOrmModule (Database connection)
│
├── UserModule
│   ├── UserController
│   ├── UserService
│   └── Entities: User, PushToken
│
├── SplitBillModule
│   ├── SplitBillController
│   ├── SplitBillService
│   ├── Entities: SplitBill, SplitBillParticipant
│   ├── Dependencies: UserModule, PushNotificationService
│   └── Exports: SplitBillService
│
├── ScheduledPaymentModule
│   ├── ScheduledPaymentController
│   ├── ScheduledPaymentService
│   ├── ScheduledPaymentWorker (Cron)
│   ├── Entities: ScheduledPayment
│   ├── Dependencies: UserModule, PushNotificationService
│   └── Exports: ScheduledPaymentService
│
├── HealthModule
│   └── HealthController (/api/health)
│
└── MetricsModule
    └── MetricsController (/api/metrics)
```

### 3.2 File Structure

```
backend/
├── package.json
├── nest-cli.json
├── tsconfig.json
├── .env
│
├── database/
│   ├── data-source.ts           # TypeORM config
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── push-token.entity.ts
│   │   ├── split-bill.entity.ts
│   │   └── scheduled-payment.entity.ts
│   │
│   └── migrations/
│       ├── 1690000000000-InitSchema.ts
│       └── 1734200000000-AddNotificationsTables.ts
│
└── src/
    ├── main.ts                   # Bootstrap
    ├── app.module.ts             # Root module
    │
    ├── config/
    │   ├── configuration.ts
    │   ├── validation.ts
    │   └── database.config.ts
    │
    ├── services/
    │   └── push-notification.service.ts
    │
    ├── modules/
    │   ├── user/
    │   │   ├── user.module.ts
    │   │   ├── user.controller.ts
    │   │   └── user.service.ts
    │   │
    │   ├── split-bill/
    │   │   ├── split-bill.module.ts
    │   │   ├── split-bill.controller.ts
    │   │   └── split-bill.service.ts
    │   │
    │   └── scheduled-payment/
    │       ├── scheduled-payment.module.ts
    │       ├── scheduled-payment.controller.ts
    │       ├── scheduled-payment.service.ts
    │       └── scheduled-payment.worker.ts
    │
    ├── health/
    │   └── health.module.ts
    │
    └── monitoring/
        └── metrics.module.ts
```

### 3.3 Dependency Injection Pattern

```typescript
// Example: SplitBillModule dependencies
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SplitBill,
      SplitBillParticipant,
      User,
      PushToken,
    ]),
    UserModule,  // Import to access UserService
  ],
  controllers: [SplitBillController],
  providers: [
    SplitBillService,
    PushNotificationService,
  ],
  exports: [SplitBillService],  // Export for other modules
})
export class SplitBillModule {}
```

### 3.4 Background Workers

**Cron Job Implementation:**
```typescript
@Injectable()
export class ScheduledPaymentWorker {
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPayments() {
    // Find payments where scheduledFor <= now()
    // Send push notifications
    // Update notification sent status
  }
}
```

**Cron Schedule:** Every minute (*/1 * * * *)

---

## 4. Database Design

### 4.1 Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │────┐
│ walletAddr  │    │
│ createdAt   │    │
└─────────────┘    │
                   │ 1:N
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌─────────────┐      ┌──────────────────┐
│ push_tokens │      │   split_bills    │
│─────────────│      │──────────────────│
│ id (PK)     │      │ id (PK)          │────┐
│ userId (FK) │      │ creatorId (FK)   │    │
│ expoPushTkn │      │ totalAmount      │    │
│ platform    │      │ currency         │    │
│ active      │      │ mode             │    │ 1:N
└─────────────┘      │ status           │    │
                     └──────────────────┘    │
                                             ▼
┌──────────────────┐         ┌────────────────────────┐
│scheduled_payments│         │split_bill_participants │
│──────────────────│         │────────────────────────│
│ id (PK)          │         │ id (PK)                │
│ userId (FK)      │         │ splitBillId (FK)       │
│ recipientAddr    │         │ participantAddress     │
│ amount           │         │ amount                 │
│ scheduledFor     │         │ paid                   │
│ status           │         │ transactionHash        │
│ txHash           │         │ notificationSent       │
└──────────────────┘         └────────────────────────┘
```

### 4.2 Index Strategy

**Performance Indexes:**
```sql
-- User lookups by wallet address
CREATE INDEX idx_user_wallet_address ON users(walletAddress);

-- Push token lookups
CREATE INDEX idx_push_token_user ON push_tokens(userId);

-- Split bill queries
CREATE INDEX idx_split_bill_creator ON split_bills(creatorId);
CREATE INDEX idx_split_bill_status ON split_bills(status);

-- Split bill participant queries
CREATE INDEX idx_split_bill_participant_split_bill
  ON split_bill_participants(splitBillId);
CREATE INDEX idx_split_bill_participant_address
  ON split_bill_participants(participantAddress);

-- Scheduled payment queries (for cron worker)
CREATE INDEX idx_scheduled_payment_user ON scheduled_payments(userId);
CREATE INDEX idx_scheduled_payment_scheduled_for
  ON scheduled_payments(scheduledFor);
CREATE INDEX idx_scheduled_payment_status
  ON scheduled_payments(status);
```

### 4.3 Data Types

**Amount Storage:**
- Type: `NUMERIC(30, 18)`
- Precision: Up to 30 digits total, 18 after decimal
- Reason: Exact decimal representation for financial calculations

**Wallet Address:**
- Type: `VARCHAR(64)`
- Format: Lowercase hex with 0x prefix
- Length: 42 characters (0x + 40 hex digits)

**Timestamps:**
- Type: `TIMESTAMPTZ` (with timezone)
- Default: `now()`
- Timezone: UTC stored, local display

---

## 5. Integration Architecture

### 5.1 External Service Integration

```
Mobile App
    │
    ├─▶ Alchemy RPC API
    │   └─ Network: Ethereum Mainnet / Sepolia
    │
    ├─▶ Backend API (localhost:3000)
    │   └─ Protocol: HTTPS/REST
    │
    ├─▶ Transak Widget
    │   └─ Embedded WebView
    │
    └─▶ Expo Push Notifications
        └─ Token registration

Backend
    ├─▶ PostgreSQL Database
    │   └─ Local: localhost:5432
    │
    └─▶ Expo Push Notification Service
        └─ Send notifications to tokens
```

### 5.2 API Client Architecture (Mobile)

```typescript
// apiClient.ts structure
export const apiClient = axios.create({
  baseURL: __DEV__
    ? 'http://localhost:3000'
    : 'https://api.eternitywallet.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  // Add auth token if needed
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling
    return Promise.reject(error);
  }
);
```

### 5.3 Deep Linking Architecture

**URL Scheme:** `eternitywallet://`

**Supported Deep Links:**
```
eternitywallet://pay-split-bill?to=0x...&amount=0.05&total=0.1&participants=2
```

**Implementation:**
```typescript
const linking = {
  prefixes: ['eternitywallet://'],
  config: {
    screens: {
      PaySplitBill: {
        path: 'pay-split-bill',
        parse: {
          to: (to: string) => to,
          amount: (amount: string) => amount,
        },
      },
    },
  },
};
```

---

## 6. Security Architecture

### 6.1 Security Layers

```
┌────────────────────────────────────────────┐
│         Application Security               │
│                                            │
│  - Input Validation (frontend & backend)  │
│  - XSS Prevention                          │
│  - Rate Limiting (100 req/min)            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│         Data Security                      │
│                                            │
│  - Private Keys: Device Secure Storage    │
│  - Seed Phrases: Encrypted at rest        │
│  - Database: Connection pooling           │
│  - Passwords: Environment variables       │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│         Transport Security                 │
│                                            │
│  - HTTPS/TLS 1.3                          │
│  - Certificate Pinning (future)           │
│  - API Authentication (JWT - future)      │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│         Privacy Architecture               │
│                                            │
│  - Minimal Data Collection                │
│  - No PII Storage                         │
│  - Wallet Addresses Only                  │
│  - GDPR Compliant                         │
└────────────────────────────────────────────┘
```

### 6.2 Private Key Management

```
User Creates Wallet
        ↓
Generate HD Wallet (ethers.js)
        ↓
Private Key (256-bit)
        ↓
Device Secure Storage
    ┌──────────────────────┐
    │ iOS: Keychain        │
    │ Android: KeyStore    │
    └──────────────────────┘
        ↓
Encrypted at Rest
        ↓
Biometric/PIN Protection
```

**Security Properties:**
- ✅ Never transmitted over network
- ✅ Never stored in plain text
- ✅ Encrypted by OS
- ✅ Protected by biometrics/PIN
- ✅ Backed up only via seed phrase

### 6.3 API Security (Future Enhancements)

**JWT Authentication Flow:**
```
1. User signs message with private key
2. Backend verifies signature
3. Backend issues JWT token
4. Token included in subsequent requests
5. Token expires after 24 hours
```

---

## 7. Deployment Architecture

### 7.1 Development Environment

```
Developer Machine
├── Mobile App (Expo Dev Client)
│   └── Port: Expo Metro Bundler
│
├── Backend (npm run start:dev)
│   └── Port: 3000
│
└── PostgreSQL Database
    └── Port: 5432
```

### 7.2 Production Architecture (Future)

```
┌────────────────────────────────────────────────┐
│              CDN (CloudFlare)                   │
│  - Static Assets                                │
│  - DDoS Protection                              │
└────────────────────────────────────────────────┘
                      │
┌────────────────────────────────────────────────┐
│           Load Balancer (AWS ALB)               │
│  - SSL Termination                              │
│  - Health Checks                                │
└────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────┐           ┌──────────────┐
│  NestJS API  │           │  NestJS API  │
│  Instance 1  │           │  Instance 2  │
│  (Docker)    │           │  (Docker)    │
└──────────────┘           └──────────────┘
        │                           │
        └─────────────┬─────────────┘
                      ▼
        ┌──────────────────────────┐
        │  PostgreSQL (AWS RDS)    │
        │  - Multi-AZ              │
        │  - Automated Backups     │
        └──────────────────────────┘
```

### 7.3 Monitoring & Logging

**Metrics to Track:**
- API response times (P50, P95, P99)
- Error rates by endpoint
- Database query performance
- Cron job execution success rate
- Push notification delivery rate

**Logging Strategy:**
- Application logs: 30 days retention
- Error logs: 90 days retention
- Audit logs: 1 year retention
- No PII in logs

---

## 8. Technology Decisions

### 8.1 Why React Native + Expo?
- ✅ Cross-platform (iOS + Android)
- ✅ Fast development with hot reload
- ✅ Rich ecosystem of libraries
- ✅ Easy push notification setup
- ✅ Over-the-air updates

### 8.2 Why NestJS?
- ✅ TypeScript-first framework
- ✅ Modular architecture (scalable)
- ✅ Built-in dependency injection
- ✅ Great for microservices
- ✅ Excellent documentation

### 8.3 Why PostgreSQL?
- ✅ ACID compliance (data integrity)
- ✅ JSON support for flexible data
- ✅ Excellent TypeORM integration
- ✅ Mature and reliable
- ✅ Free and open-source

### 8.4 Why ethers.js?
- ✅ Modern Ethereum library
- ✅ TypeScript support
- ✅ Comprehensive documentation
- ✅ Active maintenance
- ✅ Smaller bundle size vs web3.js

---

**Document Version:** 1.0
**Last Review:** 2025-10-29
**Next Review:** 2025-11-29
