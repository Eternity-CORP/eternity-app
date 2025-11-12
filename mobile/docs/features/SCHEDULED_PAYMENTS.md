# 📅 Scheduled Payments System

**Comprehensive system for one-time and recurring cryptocurrency payments**

## 🎯 Overview

The Scheduled Payments system allows users to:
- Schedule one-time payments for a specific date/time
- Create recurring payments (daily, weekly, monthly)
- Execute payments automatically in background or on app launch
- Monitor payment status and execution history
- Manage payment lifecycle (pause, resume, cancel)

## 🏗️ Architecture

```
mobile/src/features/schedule/
├── types.ts                          # Domain types
├── JobRunner.ts                      # Payment executor
├── SchedulerManager.ts               # Lifecycle manager with mutex
├── store/
│   └── scheduledSlice.ts             # Zustand store with persistence
├── utils/
│   ├── time-helpers.ts               # RRULE & timezone handling
│   └── validators.ts                 # Validation & sanitization
├── adapters/
│   ├── SchedulerAdapter.ts           # Interface
│   ├── BackgroundFetchAdapter.ts     # Background execution
│   └── AppLaunchAdapter.ts           # Foreground execution
├── screens/
│   └── SchedulerSettingsScreen.tsx   # Settings UI
├── integration/
│   └── AppIntegration.tsx            # App.tsx hook
└── __tests__/
    ├── time-helpers.test.ts          # Time logic tests
    └── JobRunner.test.ts             # Execution tests
```

## 📦 Core Components

### 1. Domain Model

**ScheduledPayment:**
```typescript
interface ScheduledPayment {
  id: string;                        // UUID
  kind: 'one_time' | 'recurring';
  
  // Network & Asset
  chainId: number;                   // 1=mainnet, 11155111=sepolia
  asset: { type: 'ETH' | 'ERC20'; tokenAddress?: string };
  
  // Accounts
  fromAccountId: string;             // Source wallet
  to: string;                        // EIP-55 checksum address
  amountHuman: string;               // "1.5"
  
  // Timing
  scheduleAt?: number;               // Unix ms (one_time)
  rrule?: string;                    // RFC5545 (recurring)
  tz: string;                        // IANA timezone
  
  // Gas Caps (safety)
  maxFeePerGasCap?: string;
  maxPriorityFeePerGasCap?: string;
  
  // Execution State
  status: 'scheduled' | 'running' | 'paused' | 'failed' | 'completed';
  nextRunAt?: number;
  runCount: number;
  failCount: number;
  lastError?: string;
}
```

### 2. Store (Zustand)

**Features:**
- ✅ CRUD operations (add, update, remove)
- ✅ Pause/resume payments
- ✅ Fast lookup by `nextRunAt` (indexed)
- ✅ Persistent storage (AsyncStorage)
- ✅ Automatic index rebuild on load

**Usage:**
```typescript
import { useScheduledPayments } from './store/scheduledSlice';

// Create payment
const payment = useScheduledPayments.getState().addPayment({
  kind: 'one_time',
  chainId: 11155111,
  asset: { type: 'ETH' },
  fromAccountId: 'wallet1',
  to: '0xRecipient...',
  amountHuman: '0.1',
  scheduleAt: Date.now() + 3600000, // 1 hour from now
  tz: 'America/New_York',
});

// Get due payments
const duePayments = useScheduledPayments.getState().getDuePayments();

// Pause payment
useScheduledPayments.getState().pausePayment(payment.id);
```

### 3. JobRunner

**Responsibilities:**
- Check for due payments every tick
- Validate payment before execution
- Compute gas fees with caps
- Send transaction via `sendNative`/`sendErc20`
- Wait for confirmations
- Update payment status
- Apply exponential backoff on failure

**Execution Flow:**
```
tick() →
  getDuePayments() →
    For each payment:
      1. Revalidate (address, network, asset)
      2. Compute gas fees (with caps)
      3. Send transaction
      4. Wait for confirmations
      5. Update status:
         - one_time: → completed
         - recurring: → scheduled (compute next run)
      6. On error: → failed (apply backoff)
```

**Backoff Formula:**
```
nextRunAt = now + min(2^failCount * 15min, 24h)
```

**Usage:**
```typescript
import { getJobRunner } from './JobRunner';

const runner = getJobRunner();

// Start periodic execution
runner.start();

// Manual tick
await runner.tick();

// Subscribe to events
runner.onJobStatusChanged((event) => {
  console.log(`Payment ${event.paymentId}: ${event.status}`);
  if (event.txHash) {
    console.log(`TX: ${event.txHash}`);
  }
});

// Stop
runner.stop();
```

### 4. Time Helpers

**Features:**
- ✅ RRULE parsing with timezone support
- ✅ Next run computation
- ✅ Timezone validation
- ✅ RRULE creation helpers

**Examples:**
```typescript
import {
  computeNextRunAt,
  createDailyRRule,
  createWeeklyRRule,
  isValidTimezone,
} from './utils/time-helpers';

// Create daily RRULE (9 AM every day)
const rrule = createDailyRRule(new Date(), 9, 0);
// "FREQ=DAILY;DTSTART=20250111T090000Z"

// Create weekly RRULE (Mon, Wed, Fri at 9 AM)
const rrule = createWeeklyRRule(new Date(), [0, 2, 4], 9, 0);

// Compute next run
const nextRun = computeNextRunAt(payment);

// Validate timezone
if (isValidTimezone('America/New_York')) {
  // Valid
}
```

### 5. Validators

**Features:**
- ✅ Address validation (EIP-55 checksum)
- ✅ Amount validation
- ✅ Network validation
- ✅ Asset validation
- ✅ Schedule validation
- ✅ Error sanitization (remove private data)

**Examples:**
```typescript
import {
  isValidAddress,
  isValidAmount,
  validateCreateInput,
  sanitizeError,
} from './utils/validators';

// Validate address
if (isValidAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')) {
  // Valid checksum address
}

// Validate amount
if (isValidAmount('1.5')) {
  // Valid
}

// Validate create input
const result = validateCreateInput({
  kind: 'one_time',
  chainId: 11155111,
  asset: { type: 'ETH' },
  fromAccountId: 'wallet1',
  to: '0xRecipient...',
  amountHuman: '0.1',
  scheduleAt: Date.now() + 3600000,
  tz: 'UTC',
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Sanitize error (remove private keys, addresses)
const safe = sanitizeError('Error: insufficient funds at 0xPrivateKey...');
// "Error: insufficient funds at 0x***"
```

### 6. Scheduler Adapters

**Interface:**
```typescript
interface SchedulerAdapter {
  init(): Promise<void>;
  scheduleEvery(minutes: number): void;
  cancel(): void;
  getName(): string;
}
```

**BackgroundFetchAdapter:**
- Uses `react-native-background-fetch`
- Executes every ~15-20 minutes (platform-dependent)
- Works when app is closed
- Subject to OS restrictions

**AppLaunchAdapter:**
- Executes on app launch and foreground
- Throttled (minimum 1 minute between ticks)
- Reliable but requires app usage
- No battery impact when closed

### 7. SchedulerManager

**Features:**
- ✅ Singleton with mutex (prevents duplicate init)
- ✅ Automatic adapter selection
- ✅ Background enable/disable
- ✅ Settings persistence
- ✅ Lifecycle management

**Usage:**
```typescript
import { getSchedulerManager } from './SchedulerManager';

const manager = getSchedulerManager();

// Initialize (call once in App.tsx)
await manager.initialize();

// Enable background
await manager.setBackgroundEnabled(true);

// Manual tick
await manager.tick();

// Shutdown
await manager.shutdown();
```

## 🚀 Integration

### App.tsx

```typescript
import React from 'react';
import { useSchedulerIntegration } from './features/schedule/integration/AppIntegration';

export default function App() {
  // Initialize scheduler
  useSchedulerIntegration();

  return <YourApp />;
}
```

### Settings Screen

```typescript
import { SchedulerSettingsScreen } from './features/schedule/screens/SchedulerSettingsScreen';

// Add to navigation
<Stack.Screen 
  name="SchedulerSettings" 
  component={SchedulerSettingsScreen} 
/>
```

## 📱 User Experience

### Creating a Payment

```typescript
import { useScheduledPayments } from './features/schedule/store/scheduledSlice';

function CreatePaymentScreen() {
  const addPayment = useScheduledPayments((state) => state.addPayment);

  const handleCreate = () => {
    try {
      const payment = addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: walletId,
        to: recipientAddress,
        amountHuman: '0.1',
        scheduleAt: selectedDate.getTime(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      Alert.alert('Success', 'Payment scheduled');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
}
```

### Monitoring Payments

```typescript
function PaymentListScreen() {
  const payments = useScheduledPayments((state) => state.getAllPayments());

  return (
    <FlatList
      data={payments}
      renderItem={({ item }) => (
        <PaymentCard payment={item} />
      )}
    />
  );
}
```

## 🔒 Security

### Private Data Protection

**Never logged:**
- Private keys
- Full addresses (truncated to first 10 chars)
- Large balances

**Sanitization:**
```typescript
// Before logging
const sanitized = sanitizePaymentForLog(payment);
console.log('Executing:', sanitized);
// { id, kind, chainId, asset, to: "0xf39Fd6e5...", amount, status }
```

### Gas Caps

```typescript
// Set maximum gas fees to prevent overpaying
const payment = addPayment({
  // ...
  maxFeePerGasCap: '50000000000', // 50 Gwei max
  maxPriorityFeePerGasCap: '2000000000', // 2 Gwei max
});
```

## ⚠️ Platform Limitations

### iOS
- Minimum 15-minute intervals
- System decides when to run (not guaranteed)
- May not run if battery is low
- Background refresh must be enabled

### Android
- Subject to Doze mode
- May be delayed or skipped
- Battery optimization must be disabled
- WorkManager restrictions apply

### Recommendations
1. **Don't rely on exact timing** - Allow buffer time
2. **Monitor execution** - Check payment status regularly
3. **Keep app open for critical payments**
4. **Use manual trigger** - For time-sensitive payments

## 🧪 Testing

### Unit Tests

```bash
# Time helpers
npm test src/features/schedule/__tests__/time-helpers.test.ts

# JobRunner
npm test src/features/schedule/__tests__/JobRunner.test.ts
```

### Integration Tests

```typescript
// Create test payment on Sepolia
const payment = addPayment({
  kind: 'one_time',
  chainId: 11155111,
  asset: { type: 'ETH' },
  fromAccountId: testWallet,
  to: testRecipient,
  amountHuman: '0.001',
  scheduleAt: Date.now() + 5000, // 5 seconds from now
  tz: 'UTC',
});

// Wait for execution
await new Promise(resolve => setTimeout(resolve, 10000));

// Verify
const updated = getPayment(payment.id);
expect(updated.status).toBe('completed');
expect(updated.runCount).toBe(1);
```

## 📊 Monitoring

### Events

```typescript
const runner = getJobRunner();

runner.onJobStatusChanged((event) => {
  // Log to analytics
  analytics.track('payment_executed', {
    paymentId: event.paymentId,
    status: event.status,
    txHash: event.txHash,
    error: event.error,
  });

  // Show notification
  if (event.status === 'completed') {
    showNotification('Payment sent successfully');
  } else if (event.status === 'failed') {
    showNotification(`Payment failed: ${event.error}`);
  }
});
```

### Statistics

```typescript
const payments = getAllPayments();

const stats = {
  total: payments.length,
  scheduled: payments.filter(p => p.status === 'scheduled').length,
  completed: payments.filter(p => p.status === 'completed').length,
  failed: payments.filter(p => p.status === 'failed').length,
  totalExecutions: payments.reduce((sum, p) => sum + p.runCount, 0),
  successRate: /* calculate */,
};
```

## 🎯 Acceptance Criteria

- ✅ Can create one-time and recurring payments
- ✅ `nextRunAt` computed correctly with timezone
- ✅ Data persists across app restarts
- ✅ Payments execute on Sepolia (ETH and ERC-20)
- ✅ Errors trigger retry with backoff
- ✅ Mutex prevents duplicate JobRunner instances
- ✅ Background execution works (when enabled)
- ✅ App launch execution works (fallback)
- ✅ No crashes or duplicate executions
- ✅ Platform limitations documented
- ✅ Manual trigger available

## 📚 API Reference

### Store

```typescript
// Add payment
addPayment(input: CreateScheduledPaymentInput): ScheduledPayment

// Update payment
updatePayment(input: UpdateScheduledPaymentInput): void

// Remove payment
removePayment(id: string): void

// Pause/Resume
pausePayment(id: string): void
resumePayment(id: string): void

// Queries
getPayment(id: string): ScheduledPayment | undefined
getAllPayments(): ScheduledPayment[]
getPaymentsByFilter(filter: ScheduledPaymentFilter): ScheduledPayment[]
getDuePayments(now?: number): ScheduledPayment[]
```

### JobRunner

```typescript
// Lifecycle
start(): void
stop(): void
tick(now?: number): Promise<void>

// Events
onJobStatusChanged(listener: JobStatusListener): () => void
```

### SchedulerManager

```typescript
// Lifecycle
initialize(): Promise<void>
shutdown(): Promise<void>

// Settings
setBackgroundEnabled(enabled: boolean): Promise<void>
isBackgroundEnabled(): boolean
getAdapterName(): string

// Manual
tick(): Promise<void>
```

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
**Status:** ✅ Production Ready
