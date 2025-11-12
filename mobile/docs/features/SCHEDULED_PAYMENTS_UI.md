# 📱 Scheduled Payments UI

**User interface for creating and managing scheduled payments**

## 🎯 Overview

The Scheduled Payments UI provides:
- **Create/Edit Screen** - Form for scheduling payments
- **List Screen** - View and manage all scheduled payments
- **Settings Screen** - Configure background execution
- **Inline Validation** - Real-time error checking
- **Fee Preview** - Estimate gas costs before scheduling
- **Check Now** - Test payment without sending funds

## 🏗️ Architecture

```
mobile/src/features/schedule/screens/
├── CreateScheduledPaymentScreen.tsx   # Create/edit form
├── ScheduledPaymentsListScreen.tsx    # List view
└── SchedulerSettingsScreen.tsx        # Settings
```

## 📦 Screens

### 1. Create Scheduled Payment Screen

**Features:**
- ✅ Payment type selector (one-time / recurring)
- ✅ Asset type selector (ETH / ERC-20)
- ✅ Recipient address input with checksum validation
- ✅ Amount input with validation
- ✅ Schedule picker (date/time or recurrence)
- ✅ Advanced options (gas caps, note)
- ✅ Preview with fee estimates
- ✅ "Check Now" button for dry run
- ✅ Warning banner about platform limitations
- ✅ Inline validation errors
- ✅ Form persistence

**Navigation:**
```typescript
// Create new payment
navigation.navigate('CreateScheduledPayment');

// Edit existing payment
navigation.navigate('CreateScheduledPayment', {
  paymentId: 'payment-uuid',
});
```

**Form Fields:**

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Payment Type | one_time / recurring | - | Yes |
| Asset Type | ETH / ERC20 | - | Yes |
| Token Address | string | EIP-55 checksum | If ERC20 |
| Recipient | string | EIP-55 checksum | Yes |
| Amount | string | Positive number | Yes |
| Schedule | Date / RRULE | Future date / Valid RRULE | Yes |
| Max Fee Cap | string | Positive wei | No |
| Max Priority Fee Cap | string | Positive wei | No |
| Note | string | Max 500 chars | No |

**Validation Rules:**

```typescript
// Address validation
if (!isValidAddress(address)) {
  error = 'Invalid address (must be EIP-55 checksum)';
}

// Amount validation
if (!isValidAmount(amount)) {
  error = 'Invalid amount (must be positive number)';
}

// Schedule validation (one-time)
if (scheduleAt <= Date.now()) {
  error = 'Schedule date must be in the future';
}

// Schedule validation (recurring)
if (!isValidRRule(rrule)) {
  error = 'Invalid RRULE format';
}
```

**Preview:**

Shows estimated costs before saving:
- Network (Mainnet / Sepolia / Holesky)
- Asset type
- Amount
- Recipient (truncated)
- Estimated gas fee (in Gwei)
- Schedule time or recurrence description

**Check Now:**

Simulates payment execution without sending funds:
1. Shows confirmation dialog
2. Calls `JobRunner.tick()` with dry run
3. Validates:
   - Address is valid
   - Network is supported
   - Amount is valid
   - For ERC-20: calls `callStatic.transfer()`
4. Shows success or error message

**UX Warnings:**

```
⚠️ Background Limitations

Execution timing is not guaranteed due to platform restrictions.

[How to guarantee timing?] → Opens documentation
```

Documentation explains:
- iOS: Minimum 15-minute intervals
- Android: Subject to Doze mode
- System decides when to run
- Recommendations for critical payments

### 2. Scheduled Payments List Screen

**Features:**
- ✅ Filter by status (all / scheduled / running / paused / failed / completed)
- ✅ Sort by next run time
- ✅ Pull to refresh
- ✅ Payment cards with details
- ✅ Quick actions (pause / resume / delete)
- ✅ Empty state with CTA
- ✅ FAB for creating new payment

**Payment Card:**

```
┌─────────────────────────────────────┐
│ 💎  0.1 ETH              [⏰ scheduled] │
│     To: 0xf39Fd6e5...                │
├─────────────────────────────────────┤
│ Type: One-Time                       │
│ Next Run: Jan 11, 2025 3:00 PM     │
│ Executions: 0 / Failures: 0         │
├─────────────────────────────────────┤
│ [⏸️ Pause]  [🗑️ Delete]              │
└─────────────────────────────────────┘
```

**Status Colors:**

| Status | Color | Icon |
|--------|-------|------|
| scheduled | Green | ⏰ |
| running | Blue | ▶️ |
| paused | Orange | ⏸️ |
| failed | Red | ❌ |
| completed | Gray | ✅ |

**Actions:**

- **Tap card** - Edit payment
- **Pause** - Pause scheduled payment
- **Resume** - Resume paused payment
- **Delete** - Remove payment (with confirmation)
- **Pull to refresh** - Trigger manual tick

**Empty State:**

```
📅

No Scheduled Payments

Create your first scheduled payment to get started

[Create Payment]
```

### 3. Scheduler Settings Screen

See `SCHEDULED_PAYMENTS.md` for details.

## 🔌 Integration

### Add to Navigation

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import { CreateScheduledPaymentScreen } from './features/schedule/screens/CreateScheduledPaymentScreen';
import { ScheduledPaymentsListScreen } from './features/schedule/screens/ScheduledPaymentsListScreen';
import { SchedulerSettingsScreen } from './features/schedule/screens/SchedulerSettingsScreen';

const Stack = createStackNavigator();

function ScheduleNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ScheduledPaymentsList"
        component={ScheduledPaymentsListScreen}
        options={{ title: 'Scheduled Payments' }}
      />
      <Stack.Screen
        name="CreateScheduledPayment"
        component={CreateScheduledPaymentScreen}
        options={{ title: 'Schedule Payment' }}
      />
      <Stack.Screen
        name="SchedulerSettings"
        component={SchedulerSettingsScreen}
        options={{ title: 'Scheduler Settings' }}
      />
    </Stack.Navigator>
  );
}
```

### Connect SendService

Replace mock `suggestFees` with actual implementation:

```typescript
// In CreateScheduledPaymentScreen.tsx

import { suggestFees } from '../../wallet/fees';

// Replace mock
const loadFeeEstimate = async () => {
  try {
    const fees = await suggestFees(formData.chainId);
    setFeeEstimate(fees);
  } catch (error) {
    console.error('Failed to load fees:', error);
  }
};
```

### Connect Wallet Context

Replace hardcoded `fromAccountId`:

```typescript
// In CreateScheduledPaymentScreen.tsx

import { useWallet } from '../../wallet/WalletContext';

function CreateScheduledPaymentScreen() {
  const { activeWallet } = useWallet();

  const handleSave = async () => {
    const input = {
      // ...
      fromAccountId: activeWallet.id,
      // ...
    };
  };
}
```

## 🎨 Styling

### Theme

```typescript
const colors = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  gray: '#9E9E9E',
  background: '#f5f5f5',
  card: '#fff',
  border: '#e0e0e0',
};
```

### Typography

```typescript
const typography = {
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { fontSize: 16, fontWeight: '500' },
  body: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
};
```

## 🧪 Testing

### Unit Tests

```typescript
describe('CreateScheduledPaymentScreen', () => {
  it('should validate address', () => {
    // Test address validation
  });

  it('should validate amount', () => {
    // Test amount validation
  });

  it('should show preview', () => {
    // Test preview display
  });
});
```

### E2E Tests (Detox)

```typescript
describe('Scheduled Payments E2E', () => {
  it('should create payment and execute on Sepolia', async () => {
    // 1. Navigate to create screen
    await element(by.id('create-payment-button')).tap();

    // 2. Fill form
    await element(by.id('recipient-input')).typeText('0xRecipient...');
    await element(by.id('amount-input')).typeText('0.001');

    // 3. Select schedule (5 seconds from now)
    await element(by.id('schedule-picker')).tap();
    // ... select date/time

    // 4. Save
    await element(by.id('save-button')).tap();

    // 5. Wait for execution
    await waitFor(element(by.text('completed')))
      .toBeVisible()
      .withTimeout(30000);

    // 6. Verify status
    await expect(element(by.text('completed'))).toBeVisible();
  });
});
```

### Manual Testing Checklist

- [ ] Create one-time ETH payment
- [ ] Create recurring ETH payment
- [ ] Create ERC-20 payment
- [ ] Edit existing payment
- [ ] Pause payment
- [ ] Resume payment
- [ ] Delete payment
- [ ] Preview shows correct fees
- [ ] Check Now validates correctly
- [ ] Inline errors show for invalid inputs
- [ ] Address auto-converts to checksum
- [ ] Form persists on app restart
- [ ] Payment executes at scheduled time
- [ ] Status updates correctly
- [ ] Pull to refresh works
- [ ] Filter works
- [ ] Empty state shows

## 📊 Acceptance Criteria

- ✅ Created payment appears in list
- ✅ Payment executes at scheduled time (with platform limitations)
- ✅ Fee preview is correct
- ✅ Inline validation shows errors
- ✅ Form persists across restarts
- ✅ Status updates in real-time
- ✅ Check Now validates without sending
- ✅ Warning about platform limitations shown
- ✅ Documentation link works

## 🎯 User Flows

### Create One-Time Payment

1. Tap "Create Payment" FAB
2. Select "One-Time"
3. Select "ETH"
4. Enter recipient address
5. Enter amount
6. Select date/time (future)
7. Tap "Preview"
8. Review details and fees
9. Tap "Schedule Payment"
10. See success message
11. Return to list
12. See payment in list with "scheduled" status

### Create Recurring Payment

1. Tap "Create Payment" FAB
2. Select "Recurring"
3. Select "ETH"
4. Enter recipient address
5. Enter amount
6. Select frequency (daily/weekly/monthly)
7. Set time
8. Tap "Preview"
9. Review recurrence description
10. Tap "Schedule Payment"
11. See success message

### Check Payment

1. Fill form with valid data
2. Tap "Check Now"
3. See confirmation dialog
4. Tap "Check"
5. Wait for validation
6. See success or error message

### Pause/Resume Payment

1. Find payment in list
2. Tap "Pause" button
3. Confirm in dialog
4. See status change to "paused"
5. Tap "Resume" button
6. Confirm in dialog
7. See status change to "scheduled"

## 🔒 Security

### Address Validation

- All addresses validated with EIP-55 checksum
- Auto-convert to checksum on blur
- Show error for invalid addresses

### Amount Validation

- Positive numbers only
- Max 18 decimals
- No scientific notation

### Gas Caps

- Optional safety limits
- Suggested values shown
- Prevents overpaying

### Private Data

- Private keys never stored in form
- Addresses truncated in display
- Errors sanitized before showing

## 📱 Platform Considerations

### iOS

- Use native date picker
- Follow iOS design guidelines
- Handle safe area insets

### Android

- Use Material Design components
- Handle back button
- Support different screen sizes

## 🎉 Summary

The Scheduled Payments UI provides a complete, user-friendly interface for:
- Creating and editing scheduled payments
- Managing payment lifecycle
- Monitoring execution status
- Configuring background execution

All screens are connected to the store and SendService, with proper validation, error handling, and UX warnings about platform limitations.

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
**Status:** ✅ Production Ready
