# 📅 Scheduled Payments

Production-ready scheduled payments system for Ethereum transactions.

## ✨ Features

- ✅ **One-time & Recurring** - Schedule single or repeating payments
- ✅ **RRULE Scheduling** - RFC 5545 standard with DST support
- ✅ **Excluded Dates** - Skip holidays or specific dates
- ✅ **Auto-Pause** - Automatic pause after 3 consecutive insufficient funds errors
- ✅ **Background Execution** - Optional background processing
- ✅ **UI Presets** - Quick setup for common schedules
- ✅ **Timezone Support** - All IANA timezones with DST handling

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install zustand rrule uuid @types/uuid react-native-background-fetch
cd ios && pod install && cd ..
```

### 2. Add to App.tsx

```typescript
import { useSchedulerIntegration } from './features/schedule/integration/AppIntegration';

export default function App() {
  useSchedulerIntegration();
  return <YourApp />;
}
```

### 3. Add to Navigation

```typescript
import { ScheduledPaymentsListScreen } from './features/schedule/screens/ScheduledPaymentsListScreen';
import { CreateScheduledPaymentScreen } from './features/schedule/screens/CreateScheduledPaymentScreen';

<Stack.Screen name="ScheduledPaymentsList" component={ScheduledPaymentsListScreen} />
<Stack.Screen name="CreateScheduledPayment" component={CreateScheduledPaymentScreen} />
```

## 📖 Usage

### Create One-Time Payment

```typescript
import { useScheduledPayments } from './store/scheduledSlice';

const addPayment = useScheduledPayments((state) => state.addPayment);

const payment = addPayment({
  kind: 'one_time',
  chainId: 11155111, // Sepolia
  asset: { type: 'ETH' },
  fromAccountId: walletId,
  to: '0xRecipient...',
  amountHuman: '0.1',
  scheduleAt: Date.now() + 3600000, // 1 hour from now
  tz: 'America/New_York',
});
```

### Create Recurring Payment

```typescript
import { createDailyRRule } from './utils/time-helpers';

const payment = addPayment({
  kind: 'recurring',
  chainId: 11155111,
  asset: { type: 'ETH' },
  fromAccountId: walletId,
  to: '0xRecipient...',
  amountHuman: '0.1',
  rrule: createDailyRRule(new Date(), 9, 0), // Every day at 9 AM
  tz: 'America/New_York',
  exDates: [
    // Skip holidays
    new Date('2025-01-01T09:00:00Z').getTime(),
  ],
});
```

### Monitor Execution

```typescript
import { getJobRunner } from './JobRunner';

getJobRunner().onJobStatusChanged((event) => {
  console.log(`Payment ${event.paymentId}: ${event.status}`);
  if (event.txHash) {
    console.log(`TX: ${event.txHash}`);
  }
});
```

## 🌍 DST Handling

The system automatically handles Daylight Saving Time transitions:

```typescript
// Daily at 9 AM in New York
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
  tz: 'America/New_York',
};

// March 10, 2024: DST starts (2 AM → 3 AM)
// Payment still runs at 9 AM EDT (UTC-4)
// Not affected by DST transition!
```

## 🚫 Excluded Dates

Skip specific dates without changing the schedule:

```typescript
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z',
  tz: 'UTC',
  exDates: [
    new Date('2025-01-15T09:00:00Z').getTime(), // Skip Jan 15
    new Date('2025-01-20T09:00:00Z').getTime(), // Skip Jan 20
  ],
};
```

## ⚠️ Auto-Pause

Payments automatically pause after 3 consecutive insufficient funds errors:

```
Attempt 1: Insufficient funds → Retry with backoff
Attempt 2: Insufficient funds → Retry with backoff
Attempt 3: Insufficient funds → Auto-pause + Notify user
```

User must manually resume after adding funds.

## 📚 Documentation

- **[Main Documentation](../../docs/features/SCHEDULED_PAYMENTS.md)** - Complete guide
- **[RRULE Guide](../../docs/features/RRULE_GUIDE.md)** - Recurring schedules
- **[UI Guide](../../docs/features/SCHEDULED_PAYMENTS_UI.md)** - User interface
- **[Setup Guide](../../docs/features/SCHEDULED_PAYMENTS_SETUP.md)** - Installation
- **[Summary](../../docs/features/SCHEDULED_PAYMENTS_SUMMARY.md)** - Implementation summary

## 🧪 Testing

```bash
# Unit tests
npm test src/features/schedule/__tests__/time-helpers.test.ts
npm test src/features/schedule/__tests__/time-helpers-dst.test.ts
npm test src/features/schedule/__tests__/JobRunner.test.ts

# E2E tests (requires Sepolia testnet)
export TEST_PRIVATE_KEY="0x..."
export TEST_RECIPIENT="0x..."
npm test src/features/schedule/__tests__/scheduled-payments.e2e.ts
```

## 📁 Structure

```
src/features/schedule/
├── types.ts                          # Domain types
├── JobRunner.ts                      # Executor
├── SchedulerManager.ts               # Manager with mutex
├── store/
│   └── scheduledSlice.ts             # Zustand store
├── utils/
│   ├── time-helpers.ts               # RRULE & DST
│   └── validators.ts                 # Validation
├── adapters/
│   ├── SchedulerAdapter.ts           # Interface
│   ├── BackgroundFetchAdapter.ts     # Background
│   └── AppLaunchAdapter.ts           # Foreground
├── screens/
│   ├── CreateScheduledPaymentScreen.tsx
│   ├── ScheduledPaymentsListScreen.tsx
│   └── SchedulerSettingsScreen.tsx
├── components/
│   └── RecurringSchedulePicker.tsx   # UI presets
├── integration/
│   └── AppIntegration.tsx            # App.tsx hook
└── __tests__/
    ├── time-helpers.test.ts
    ├── time-helpers-dst.test.ts
    ├── JobRunner.test.ts
    └── scheduled-payments.e2e.ts
```

## 🎯 Examples

### Monthly Salary

```typescript
{
  kind: 'recurring',
  rrule: 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0;DTSTART=20250101T090000Z',
  tz: 'America/New_York',
  amountHuman: '5000',
  to: '0xEmployee...',
}
```

### Weekly Subscription

```typescript
{
  kind: 'recurring',
  rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;DTSTART=20250113T090000Z',
  tz: 'UTC',
  amountHuman: '10',
  to: '0xSubscription...',
}
```

### Bi-Weekly Contractor

```typescript
{
  kind: 'recurring',
  rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;BYHOUR=17;BYMINUTE=0;DTSTART=20250110T170000Z',
  tz: 'Europe/London',
  amountHuman: '1000',
  to: '0xContractor...',
}
```

## 🔒 Security

- ✅ Address validation (EIP-55 checksum)
- ✅ Gas caps to prevent overpaying
- ✅ Error sanitization (no private data in logs)
- ✅ Exponential backoff on failures
- ✅ Auto-pause on repeated failures

## ⚠️ Platform Limitations

**iOS:**
- Minimum 15-minute intervals
- System decides when to run
- May not run if battery low

**Android:**
- Subject to Doze mode
- May be delayed/skipped
- Battery optimization must be disabled

**Recommendation:**
- Don't rely on exact timing
- Allow buffer time
- Monitor execution
- Use manual trigger for critical payments

## 📊 Status

- ✅ **Production Ready**
- ✅ All features implemented
- ✅ Tests passing
- ✅ Documentation complete

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-11
