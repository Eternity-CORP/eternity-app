# Software Requirements Specification (SRS)
# Eternity Wallet - Mobile Cryptocurrency Wallet

**Version:** 1.0
**Date:** October 29, 2025
**Author:** Development Team
**Status:** Active Development

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [System Architecture](#5-system-architecture)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Requirements](#7-data-requirements)
8. [Appendices](#8-appendices)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for the Eternity Wallet mobile application. The document is intended for:
- Development team members
- Project stakeholders
- Quality assurance team
- Future maintainers

### 1.2 Scope
Eternity Wallet is a privacy-focused mobile cryptocurrency wallet application with social payment features. The system consists of:
- **Mobile Application** (React Native + Expo)
- **Backend API** (NestJS + TypeORM)
- **Database** (PostgreSQL)
- **Push Notification Service** (Expo Push Notifications)

### 1.3 Definitions, Acronyms, and Abbreviations
| Term | Definition |
|------|------------|
| **Wallet Address** | A unique cryptographic identifier for blockchain transactions |
| **Split Bill** | Feature allowing users to divide payment amounts among multiple participants |
| **Scheduled Payment** | Pre-configured payment with future execution time |
| **Push Token** | Expo notification token for sending push notifications |
| **ETH** | Ethereum cryptocurrency |
| **USDC** | USD Coin stablecoin |
| **API** | Application Programming Interface |
| **JWT** | JSON Web Token |
| **CRUD** | Create, Read, Update, Delete operations |

### 1.4 References
- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications
- React Native Documentation: https://reactnative.dev/
- NestJS Documentation: https://docs.nestjs.com/
- Expo Documentation: https://docs.expo.dev/

---

## 2. Overall Description

### 2.1 Product Perspective
Eternity Wallet is a standalone mobile application that interacts with:
- Ethereum blockchain networks
- Custom backend API for social features
- Expo push notification service
- Device secure storage for private keys

### 2.2 Product Functions
The system provides the following core functions:
1. **Wallet Management**
   - Create and import wallets
   - Secure private key storage
   - Multi-wallet support

2. **Transaction Operations**
   - Send cryptocurrency (ETH, USDC)
   - Receive payments
   - Transaction history

3. **Social Payment Features**
   - Split bills with multiple participants
   - Schedule future payments
   - Payment requests via deep links

4. **Notification System**
   - Push notifications for payment requests
   - Scheduled payment reminders
   - Transaction confirmations

5. **Additional Features**
   - Add money via Transak integration
   - NFT viewing (future enhancement)
   - Token swaps (future enhancement)

### 2.3 User Classes and Characteristics

#### Primary Users
- **Regular Users**: Mobile users who want to send/receive cryptocurrency
- **Social Users**: Users who utilize split bill and scheduled payment features
- **Technical Users**: Users who understand blockchain and gas fees

#### User Characteristics
- Age: 18+
- Technical proficiency: Basic to Advanced
- Device: iOS 13+ or Android 10+
- Expected usage: Daily for payments, weekly for social features

### 2.4 Operating Environment
- **Mobile Platforms**: iOS 13+, Android 10+
- **Backend Server**: Node.js 18+, NestJS framework
- **Database**: PostgreSQL 14+
- **Network**: Ethereum Mainnet, Sepolia Testnet
- **External Services**: Alchemy RPC, Transak, Expo Push Notifications

### 2.5 Design and Implementation Constraints
1. **Privacy-First Architecture**
   - Only wallet addresses stored in backend
   - No personal information (email, phone, name) collected
   - Private keys never leave device

2. **Technology Stack**
   - Frontend: React Native with Expo SDK 54
   - Backend: NestJS with TypeORM
   - Database: PostgreSQL with UUID primary keys
   - Language: TypeScript 5.9+

3. **Security Requirements**
   - Secure storage for private keys (device keychain)
   - HTTPS for all API communications
   - Input validation on all endpoints
   - Rate limiting on API endpoints

### 2.6 Assumptions and Dependencies
**Assumptions:**
- Users have stable internet connection
- Users understand basic cryptocurrency concepts
- Mobile devices support required Expo modules

**Dependencies:**
- Expo SDK and modules availability
- Alchemy API uptime
- Transak service availability
- PostgreSQL database availability

---

## 3. System Features

### 3.1 Wallet Management

#### 3.1.1 Description and Priority
**Priority:** HIGH
Users can create new wallets or import existing ones using seed phrases or private keys.

#### 3.1.2 Functional Requirements

**FR-WM-001**: Create New Wallet
- System shall generate a new HD wallet with 12-word seed phrase
- System shall securely store private key in device keychain
- System shall display seed phrase once for user backup

**FR-WM-002**: Import Existing Wallet
- System shall allow import via 12/24-word seed phrase
- System shall allow import via private key
- System shall validate seed phrase/key before importing

**FR-WM-003**: Multi-Wallet Support
- System shall allow users to create multiple wallets
- System shall allow switching between wallets
- System shall display distinct names/icons for each wallet

**FR-WM-004**: Wallet Security
- System shall require device biometric/PIN to access wallet
- System shall encrypt private keys using device secure storage
- System shall never transmit private keys over network

---

### 3.2 Send Transaction

#### 3.2.1 Description and Priority
**Priority:** HIGH
Users can send cryptocurrency to any valid wallet address with optional message and emoji.

#### 3.2.2 Functional Requirements

**FR-ST-001**: Address Input
- System shall accept Ethereum addresses (0x format, 42 characters)
- System shall validate address format in real-time
- System shall show visual feedback (green for valid, red for invalid)

**FR-ST-002**: Amount Input
- System shall accept amount input with up to 18 decimal places
- System shall display amount in both crypto and fiat currency
- System shall validate sufficient balance before transaction

**FR-ST-003**: Message and Emoji
- System shall allow optional text message (max 100 characters)
- System shall provide emoji picker with predefined options
- System shall display preview card with emoji and message

**FR-ST-004**: Transaction Confirmation
- System shall use swipe-to-confirm gesture for transaction
- System shall display gas fee estimate before confirmation
- System shall show confetti animation on successful send

**FR-ST-005**: Transaction Execution
- System shall sign transaction with user's private key
- System shall broadcast transaction to Ethereum network
- System shall display transaction hash and status

---

### 3.3 Split Bill Feature

#### 3.3.1 Description and Priority
**Priority:** MEDIUM
Users can divide payment amounts among multiple participants and send payment requests via deep links.

#### 3.3.2 Functional Requirements

**FR-SB-001**: Create Split Bill
- System shall allow user to enter total amount
- System shall support two split modes: Equal and Custom
- System shall validate total amount matches sum of individual amounts

**FR-SB-002**: Add Participants
- System shall allow adding participants by wallet address
- System shall calculate equal split automatically in Equal mode
- System shall allow custom amount input per participant in Custom mode
- System shall support minimum 2 participants

**FR-SB-003**: Generate Shareable Link
- System shall generate deep link format: `eternitywallet://pay-split-bill`
- System shall include recipient address, amount, and metadata in link
- System shall allow copying link to clipboard
- System shall allow sharing via system share sheet

**FR-SB-004**: Split Bill History
- System shall display all created split bills
- System shall show payment status for each participant
- System shall allow deleting old split bills
- System shall allow resending notifications

**FR-SB-005**: Receive Split Bill Request
- System shall handle deep link when user taps shared link
- System shall open PaySplitBillScreen with pre-filled data
- System shall allow user to "Pay Now" or "Save For Later"
- System shall track unpaid requests with badge counter

**FR-SB-006**: Backend Integration
- System shall send split bill data to backend API
- Backend shall store split bill with participants
- Backend shall send push notifications to all participants
- Backend shall track payment status per participant

---

### 3.4 Scheduled Payments

#### 3.4.1 Description and Priority
**Priority:** MEDIUM
Users can schedule payments for future execution with reminder notifications.

#### 3.4.2 Functional Requirements

**FR-SP-001**: Create Scheduled Payment (3-Step Process)
- **Step 1**: System shall provide date and time picker
- **Step 2**: System shall accept recipient address and amount
- **Step 3**: System shall accept optional message and emoji
- System shall validate future date/time selection

**FR-SP-002**: Schedule Local Notification
- System shall schedule local notification at specified time
- System shall include payment details in notification
- System shall open app to payment screen when notification tapped

**FR-SP-003**: Scheduled Payments List
- System shall display all scheduled payments sorted by date
- System shall filter by status: Pending, Completed, Failed, Cancelled
- System shall show overdue indicator for past-due payments
- System shall display countdown until scheduled time

**FR-SP-004**: Payment Actions
- System shall allow "Send Now" to execute immediately
- System shall allow "Cancel" to delete scheduled payment
- System shall update status after payment execution
- System shall store transaction hash on completion

**FR-SP-005**: Backend Integration
- System shall sync scheduled payments to backend
- Backend shall send push notification at scheduled time
- Backend cron job shall check every minute for due payments
- Backend shall track payment execution status

---

### 3.5 Add Money (Transak Integration)

#### 3.5.1 Description and Priority
**Priority:** LOW
Users can purchase cryptocurrency using fiat currency via Transak widget.

#### 3.5.2 Functional Requirements

**FR-AM-001**: Amount Selection
- System shall provide preset amounts: $50, $100, $250, $500
- System shall allow custom amount input
- System shall enforce min $20, max $10,000 limit
- System shall calculate ~1% fee and show preview

**FR-AM-002**: Transak Widget
- System shall embed Transak widget in WebView
- System shall pre-fill wallet address
- System shall configure default cryptocurrency (USDC)
- System shall handle widget callbacks and status updates

---

### 3.6 User Management

#### 3.6.1 Description and Priority
**Priority:** HIGH
Backend system manages users and push notification tokens.

#### 3.6.2 Functional Requirements

**FR-UM-001**: User Registration
- System shall register user with wallet address only
- System shall normalize wallet address to lowercase
- System shall return existing user if already registered
- System shall create user record with UUID

**FR-UM-002**: Push Token Management
- System shall register Expo push token for notifications
- System shall store platform type (IOS, ANDROID, WEB)
- System shall support multiple tokens per user (multi-device)
- System shall deactivate old tokens when re-registering

**FR-UM-003**: Privacy Compliance
- System shall store ONLY wallet addresses (public data)
- System shall NOT store email, phone, or name
- System shall NOT store private keys or seed phrases
- System shall allow token deactivation (opt-out)

---

### 3.7 Push Notifications

#### 3.7.1 Description and Priority
**Priority:** MEDIUM
System sends push notifications for payment requests and reminders.

#### 3.7.2 Functional Requirements

**FR-PN-001**: Split Bill Notifications
- System shall send notification to each participant
- Notification shall include emoji, amount, and message
- Notification shall include deep link to payment screen
- System shall track notification sent status

**FR-PN-002**: Scheduled Payment Notifications
- System shall send notification at scheduled time
- Notification shall include payment details
- Notification shall prompt user to execute payment
- System shall not auto-execute payment (security)

**FR-PN-003**: Notification Delivery
- System shall use Expo Push Notification service
- System shall batch notifications for efficiency
- System shall handle failed deliveries gracefully
- System shall retry failed notifications (max 3 times)

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 Mobile App UI Requirements
- **Design System**: Consistent color scheme (background, card, primary, text)
- **Typography**: Clear hierarchy with support for crypto amounts
- **Navigation**: Bottom tab navigation + stack navigation
- **Responsiveness**: Support for various screen sizes (320px - 428px width)
- **Accessibility**: Minimum touch target size 44x44pt, sufficient contrast ratios

#### 4.1.2 Key Screens
1. **HomeScreen**: Wallet balance, action buttons, transaction list
2. **SendScreen**: Address input, amount, message, emoji, swipe-to-confirm
3. **ReceiveScreen**: QR code, wallet address, copy button
4. **SplitBillScreen**: Amount input, participant list, mode toggle
5. **SchedulePaymentScreen**: 3-step wizard with progress indicators
6. **ScheduledPaymentsListScreen**: List with filters and actions
7. **AddMoneyScreen**: Amount selection with Transak integration

### 4.2 Hardware Interfaces
- **Device Secure Storage**: For private key encryption (iOS Keychain, Android Keystore)
- **Camera**: For QR code scanning (future feature)
- **Biometric Sensors**: For authentication (Touch ID, Face ID, Fingerprint)
- **Clipboard**: For copying addresses and links

### 4.3 Software Interfaces

#### 4.3.1 Backend API
- **Protocol**: HTTPS/REST
- **Base URL**: `http://localhost:3000/api` (development)
- **Authentication**: None currently (JWT recommended for production)
- **Data Format**: JSON
- **Error Codes**: Standard HTTP status codes

#### 4.3.2 Blockchain Interface
- **Provider**: Alchemy RPC
- **Networks**: Ethereum Mainnet, Sepolia Testnet
- **Library**: ethers.js v6
- **Operations**: Send transaction, get balance, estimate gas

#### 4.3.3 External Services
- **Expo Push Notifications**: For sending notifications
- **Transak**: For fiat-to-crypto purchases
- **AsyncStorage**: For local data persistence

### 4.4 Communication Interfaces

#### 4.4.1 API Endpoints

**User Module:**
```
POST   /api/users/register
POST   /api/users/push-token
GET    /api/users/:walletAddress
GET    /api/users/:walletAddress/push-tokens
DELETE /api/users/push-token/:token
```

**Split Bill Module:**
```
POST   /api/split-bills
POST   /api/split-bills/:id/notify
PATCH  /api/split-bills/participants/:participantId/mark-paid
```

**Scheduled Payment Module:**
```
POST   /api/scheduled-payments
GET    /api/scheduled-payments/:walletAddress
DELETE /api/scheduled-payments/:paymentId
PATCH  /api/scheduled-payments/:paymentId/complete
PATCH  /api/scheduled-payments/:paymentId/fail
```

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Presentation Layer (React Native + Expo)             │  │
│  │  - Screens, Components, Navigation                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                 │  │
│  │  - Services, Utils, State Management                  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Data Layer                                           │  │
│  │  - AsyncStorage, Secure Storage, API Client           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API (NestJS)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Controllers Layer                                    │  │
│  │  - UserController, SplitBillController, etc.          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Services Layer                                       │  │
│  │  - Business logic, Push notifications                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (TypeORM)                          │  │
│  │  - Repositories, Entities, Migrations                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Background Workers                                   │  │
│  │  - Cron jobs for scheduled payments                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   PostgreSQL Database    │
              │  - Users, Push Tokens    │
              │  - Split Bills           │
              │  - Scheduled Payments    │
              └──────────────────────────┘
```

### 5.2 Database Schema

#### 5.2.1 Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  walletAddress VARCHAR(64) UNIQUE NOT NULL,
  encryptedDeviceToken TEXT,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5.2.2 Push Tokens Table
```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expoPushToken TEXT NOT NULL,
  platform VARCHAR CHECK (platform IN ('IOS', 'ANDROID', 'WEB')),
  deviceId VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT true,
  lastUsedAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5.2.3 Split Bills Table
```sql
CREATE TABLE split_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creatorId UUID NOT NULL REFERENCES users(id),
  totalAmount NUMERIC(30,18) NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'ETH',
  mode VARCHAR CHECK (mode IN ('EQUAL', 'CUSTOM')),
  participantsCount INT NOT NULL,
  status VARCHAR CHECK (status IN ('DRAFT', 'PENDING', 'COMPLETED')),
  message TEXT,
  emoji VARCHAR(10),
  shareableLink VARCHAR(255),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5.2.4 Split Bill Participants Table
```sql
CREATE TABLE split_bill_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  splitBillId UUID NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
  participantAddress VARCHAR(64) NOT NULL,
  amount NUMERIC(30,18) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  transactionHash VARCHAR(128),
  paidAt TIMESTAMPTZ,
  notificationSent BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5.2.5 Scheduled Payments Table
```sql
CREATE TABLE scheduled_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id),
  recipientAddress VARCHAR(64) NOT NULL,
  amount NUMERIC(30,18) NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'ETH',
  message TEXT,
  emoji VARCHAR(10),
  scheduledFor TIMESTAMPTZ NOT NULL,
  status VARCHAR CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  transactionHash VARCHAR(128),
  errorMessage TEXT,
  executedAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 Component Hierarchy (Mobile)

```
App
├── RootNavigator (Deep Linking)
│   └── MainNavigator (Stack)
│       ├── BottomTabNavigator
│       │   ├── HomeScreen
│       │   ├── SendScreen
│       │   ├── ReceiveScreen
│       │   └── SettingsScreen
│       ├── SplitBillScreen
│       ├── SplitBillHistoryScreen
│       ├── PaySplitBillScreen
│       ├── PendingPaymentsScreen
│       ├── SchedulePaymentScreen
│       ├── ScheduledPaymentsListScreen
│       ├── AddMoneyScreen
│       └── TransakWidgetScreen
└── Shared Components
    ├── SwipeToConfirm
    ├── EmojiPicker
    ├── DateTimePicker (iOS)
    └── ConfettiCannon
```

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

**NFR-PERF-001**: Response Time
- Mobile app screens shall load within 1 second
- API responses shall return within 500ms (95th percentile)
- Transaction broadcast shall complete within 3 seconds

**NFR-PERF-002**: Throughput
- Backend shall handle 100 concurrent users
- API shall process 1000 requests per minute
- Cron worker shall process 100 scheduled payments per minute

**NFR-PERF-003**: Resource Usage
- Mobile app shall use < 100MB RAM on average
- App size shall be < 50MB download
- Battery drain shall be minimal (< 1% per hour in background)

### 6.2 Security Requirements

**NFR-SEC-001**: Data Protection
- Private keys shall be encrypted using device secure storage
- API communications shall use HTTPS/TLS 1.3
- Database passwords shall be stored in environment variables
- Sensitive data shall never be logged

**NFR-SEC-002**: Authentication & Authorization
- Users shall authenticate using device biometrics or PIN
- API shall implement rate limiting (100 req/min per IP)
- Input validation shall be performed on all endpoints
- SQL injection prevention via parameterized queries

**NFR-SEC-003**: Privacy
- System shall comply with GDPR "right to be forgotten"
- System shall not collect PII without consent
- User wallet addresses shall be anonymized in logs
- Third-party services (Transak) shall have separate privacy policies

### 6.3 Reliability Requirements

**NFR-REL-001**: Availability
- Backend shall maintain 99.5% uptime
- Database shall have automated backups every 24 hours
- System shall gracefully degrade when external services unavailable

**NFR-REL-002**: Fault Tolerance
- Mobile app shall handle network disconnections gracefully
- Failed notifications shall retry up to 3 times
- Transactions shall show pending status until confirmed

**NFR-REL-003**: Data Integrity
- Database constraints shall enforce referential integrity
- Transaction amounts shall use NUMERIC(30,18) for precision
- Critical operations shall use database transactions (ACID)

### 6.4 Maintainability Requirements

**NFR-MAIN-001**: Code Quality
- TypeScript shall be used for type safety
- Code coverage shall be > 70% (unit tests)
- Linting shall be enforced (ESLint, Prettier)
- Code reviews shall be required for all changes

**NFR-MAIN-002**: Documentation
- API endpoints shall be documented with OpenAPI/Swagger
- Database schema shall have migration scripts
- Complex functions shall have JSDoc comments
- Architecture diagrams shall be maintained

**NFR-MAIN-003**: Modularity
- Backend shall use NestJS modular architecture
- Mobile app shall separate concerns (screens, services, types)
- Reusable components shall be in shared directories

### 6.5 Usability Requirements

**NFR-USE-001**: User Experience
- UI shall follow platform guidelines (iOS HIG, Material Design)
- Error messages shall be clear and actionable
- Loading states shall provide visual feedback
- Success actions shall show confirmations (toast, confetti)

**NFR-USE-002**: Accessibility
- Text shall have minimum 4.5:1 contrast ratio
- Interactive elements shall have minimum 44x44pt touch targets
- Screen readers shall be supported (VoiceOver, TalkBack)
- Reduced motion shall be respected

**NFR-USE-003**: Localization (Future)
- UI text shall be externalized for i18n
- Date/time formats shall respect locale
- Currency symbols shall display correctly

### 6.6 Scalability Requirements

**NFR-SCALE-001**: Horizontal Scaling
- Backend shall be stateless for load balancing
- Database connections shall use connection pooling
- Cron jobs shall prevent duplicate execution

**NFR-SCALE-002**: Data Growth
- Database shall handle 1M users
- Indexes shall be optimized for common queries
- Old data shall be archivable (> 1 year)

---

## 7. Data Requirements

### 7.1 Data Models

#### 7.1.1 Mobile App Local Storage

**Wallet Data (Secure Storage):**
```typescript
interface SecureWallet {
  privateKey: string;       // Encrypted
  seedPhrase: string;       // Encrypted (optional)
  walletAddress: string;
  createdAt: number;
}
```

**Split Bill Data (AsyncStorage):**
```typescript
interface SplitBill {
  id: string;
  totalAmount: string;
  currency: 'ETH';
  mode: 'equal' | 'custom';
  participants: SplitBillParticipant[];
  creatorAddress: string;
  status: 'draft' | 'pending' | 'completed';
  message?: string;
  emoji?: string;
  shareableLink?: string;
  createdAt: number;
}

interface SplitBillParticipant {
  id: string;
  address: string;
  amount: string;
  name?: string;
}
```

**Scheduled Payment Data (AsyncStorage):**
```typescript
interface ScheduledPayment {
  id: string;
  recipientAddress: string;
  amount: string;
  currency: 'ETH';
  scheduledFor: number;      // Unix timestamp
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  emoji?: string;
  txHash?: string;
  createdAt: number;
}
```

**Pending Payment Request (AsyncStorage):**
```typescript
interface PendingPayment {
  id: string;
  to: string;
  amount: string;
  total?: string;
  participants?: string;
  message?: string;
  emoji?: string;
  receivedAt: number;
  status: 'pending' | 'paid' | 'ignored';
}
```

### 7.2 Data Flow Diagrams

#### 7.2.1 Send Transaction Flow
```
User Input → Validation → Gas Estimation → User Confirmation
→ Sign Transaction → Broadcast to Network → Update UI
```

#### 7.2.2 Split Bill Creation Flow
```
User Creates Split Bill → Save Locally → Send to Backend
→ Backend Stores in DB → Backend Sends Push Notifications
→ Participants Receive → Participants Pay → Backend Updates Status
```

#### 7.2.3 Scheduled Payment Flow
```
User Creates Scheduled Payment → Save Locally → Send to Backend
→ Backend Stores in DB → Cron Job Checks Every Minute
→ Time Reached → Send Push Notification → User Opens App
→ User Executes Payment → Update Backend Status
```

### 7.3 Data Retention Policy

**Local Mobile Data:**
- Wallet private keys: Retained indefinitely (user-managed)
- Transaction history: Last 100 transactions cached
- Split bills: Retained for 90 days, then archived
- Scheduled payments: Retained until executed or cancelled

**Backend Database:**
- User records: Retained indefinitely
- Push tokens: Deactivated tokens retained for 30 days, then deleted
- Split bills: Retained for 1 year, then archived
- Scheduled payments: Retained for 1 year after execution

**Logs:**
- Application logs: Retained for 30 days
- Error logs: Retained for 90 days
- Audit logs: Retained for 1 year

---

## 8. Appendices

### 8.1 Technology Stack Summary

**Mobile Application:**
- Framework: React Native (via Expo SDK 54)
- Language: TypeScript 5.9.2
- State Management: React Hooks, AsyncStorage
- Navigation: React Navigation 6.x
- Blockchain: ethers.js v6
- Notifications: expo-notifications
- Deep Linking: expo-linking

**Backend API:**
- Framework: NestJS 11.x
- Language: TypeScript 5.9.x
- ORM: TypeORM 0.3.27
- Database Driver: pg (PostgreSQL)
- Scheduler: @nestjs/schedule
- Push Service: expo-server-sdk

**Database:**
- Type: PostgreSQL 14+
- Migration Tool: TypeORM migrations
- Connection Pooling: Enabled (pool size: 10)

**DevOps & Tools:**
- Version Control: Git
- Package Manager: npm
- Linting: ESLint + Prettier
- Testing: Jest

### 8.2 API Request/Response Examples

#### Example 1: Register User
```bash
POST /api/users/register
Content-Type: application/json

Request:
{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}

Response: 200 OK
{
  "id": "uuid-here",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "createdAt": "2025-10-29T21:00:00.000Z"
}
```

#### Example 2: Create Split Bill
```bash
POST /api/split-bills
Content-Type: application/json

Request:
{
  "creatorAddress": "0x1234...",
  "totalAmount": "0.1",
  "currency": "ETH",
  "mode": "EQUAL",
  "participants": [
    {"address": "0xAABB...", "amount": "0.05"},
    {"address": "0x1122...", "amount": "0.05"}
  ],
  "message": "Pizza party",
  "emoji": "🍕"
}

Response: 201 Created
{
  "id": "uuid-here",
  "totalAmount": "0.100000000000000000",
  "participants": [
    {
      "id": "participant-uuid",
      "participantAddress": "0xaabb...",
      "amount": "0.050000000000000000",
      "paid": false,
      "notificationSent": true
    }
  ]
}
```

### 8.3 Glossary

**HD Wallet**: Hierarchical Deterministic wallet that generates keys from a single seed phrase

**Gas Fee**: Transaction fee paid to Ethereum validators

**Deep Link**: URL scheme that opens specific app screen (eternitywallet://)

**Seed Phrase**: 12/24-word mnemonic for wallet recovery

**RPC**: Remote Procedure Call - API for blockchain interaction

**Confetti Animation**: Visual celebration effect on successful action

**Swipe-to-Confirm**: Gesture-based confirmation UI pattern

**Cron Job**: Scheduled background task (every minute for scheduled payments)

### 8.4 Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2025-10-29 | Dev Team | Initial SRS document |

---

**Document Status:** ✅ APPROVED
**Next Review Date:** 2025-11-29
**Approved By:** Development Team

