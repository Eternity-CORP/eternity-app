# 🛡️ Fee Caps & Biometric Approval Guide

Complete guide for fee safety limits and biometric confirmation.

## 🎯 Overview

The Fee Caps system prevents unexpected high-fee transactions with:
- **Fee Caps** - Maximum fee per transaction
- **Warning Thresholds** - Alerts before hitting cap
- **Biometric Approval** - Face ID/Touch ID/PIN confirmation
- **Batch Checking** - Total fee limits for split bills
- **Localization** - Multi-language support
- **Privacy** - No sensitive data in logs

## 🚀 Quick Start

### 1. Check Fee Cap

```typescript
import { checkFeeCap } from './features/security/feeCaps';

const feeWei = ethers.utils.parseEther('0.005');
const check = await checkFeeCap(feeWei, ethPriceUSD);

if (!check.allowed) {
  Alert.alert('Fee Cap Exceeded', `Fee ${check.feeETH} ETH exceeds cap ${check.capETH} ETH`);
  return;
}

if (check.reason === 'warning_threshold') {
  Alert.alert('High Fee Warning', `Fee ${check.feeETH} ETH is higher than usual`);
}
```

### 2. Request Biometric Approval

```typescript
import { requestScheduledPaymentApproval } from './features/security/biometricApproval';

const approval = await requestScheduledPaymentApproval({
  to: '0xRecipient...',
  amount: '0.1',
  asset: 'ETH',
});

if (!approval.success) {
  Alert.alert('Approval Required', 'Transaction cancelled');
  return;
}

// Proceed with transaction
```

### 3. Show Fee Preview

```typescript
import { FeePreview } from './features/security/components/FeePreview';

<FeePreview
  network="sepolia"
  gasLimit={BigNumber.from(21000)}
  feeLevel="medium"
  ethPriceUSD={2000}
  onFeeCheck={(check) => {
    if (!check.allowed) {
      setCanProceed(false);
    }
  }}
/>
```

## 📖 Fee Caps

### Settings

```typescript
interface FeeCapSettings {
  enabled: boolean;                // Enable/disable caps
  maxFeePerTxETH: string;         // Max fee per tx (ETH)
  maxFeePerTxUSD?: string;        // Max fee per tx (USD)
  warnThresholdETH: string;       // Warning threshold (ETH)
  warnThresholdUSD?: string;      // Warning threshold (USD)
  requireApprovalAtRun: boolean;  // Require biometric approval
  network: Network;
}
```

**Defaults:**
```typescript
{
  enabled: true,
  maxFeePerTxETH: '0.01',        // 0.01 ETH max
  maxFeePerTxUSD: '50',          // $50 max
  warnThresholdETH: '0.005',     // Warn at 0.005 ETH
  warnThresholdUSD: '25',        // Warn at $25
  requireApprovalAtRun: false,   // Optional approval
  network: 'sepolia',
}
```

### Load/Save Settings

```typescript
import {
  loadFeeCapSettings,
  saveFeeCapSettings,
  resetFeeCapSettings,
} from './features/security/feeCaps';

// Load
const settings = await loadFeeCapSettings();

// Save
await saveFeeCapSettings({
  maxFeePerTxETH: '0.02',
  warnThresholdETH: '0.01',
});

// Reset
await resetFeeCapSettings();
```

### Fee Check Result

```typescript
interface FeeCapCheck {
  allowed: boolean;              // Can proceed?
  reason?: string;               // 'cap_exceeded' | 'warning_threshold' | 'approved'
  feeETH: string;               // Fee in ETH
  feeUSD?: string;              // Fee in USD
  capETH: string;               // Cap in ETH
  capUSD?: string;              // Cap in USD
  exceedsBy?: string;           // Amount over cap (ETH)
  exceedsByUSD?: string;        // Amount over cap (USD)
  requiresApproval: boolean;    // Needs biometric approval
}
```

### Batch Fee Checking

For split bills with multiple transactions:

```typescript
import { checkBatchFeeCap } from './features/security/feeCaps';

const perTxFeeWei = ethers.utils.parseEther('0.003');
const txCount = 5;

const check = await checkBatchFeeCap(perTxFeeWei, txCount, ethPriceUSD);

console.log(`Per TX: ${check.perTxFeeETH} ETH`);
console.log(`Total: ${check.totalFeeETH} ETH`);
console.log(`Allowed: ${check.allowed}`);
```

## 🔐 Biometric Approval

### Capabilities

```typescript
import { checkBiometricCapabilities } from './features/security/biometricApproval';

const capabilities = await checkBiometricCapabilities();

console.log(`Available: ${capabilities.isAvailable}`);
console.log(`Type: ${capabilities.biometricName}`); // "Face ID", "Touch ID", etc.
console.log(`Has Hardware: ${capabilities.hasHardware}`);
console.log(`Is Enrolled: ${capabilities.isEnrolled}`);
```

### Request Approval

```typescript
import { requestBiometricApproval } from './features/security/biometricApproval';

const result = await requestBiometricApproval({
  reason: 'Confirm transaction of 0.1 ETH',
  fallbackLabel: 'Use PIN',
  cancelLabel: 'Cancel',
});

if (result.success) {
  console.log(`Approved with ${result.biometricType}`);
} else {
  console.log(`Denied: ${result.error}`);
}
```

### Specialized Approvals

**Scheduled Payment:**
```typescript
import { requestScheduledPaymentApproval } from './features/security/biometricApproval';

const approval = await requestScheduledPaymentApproval({
  to: '0xRecipient...',
  amount: '0.1',
  asset: 'ETH',
}, 'en');
```

**Split Payment:**
```typescript
import { requestSplitPaymentApproval } from './features/security/biometricApproval';

const approval = await requestSplitPaymentApproval({
  participantCount: 3,
  totalAmount: '0.3',
  asset: 'ETH',
}, 'en');
```

**High Fee:**
```typescript
import { requestHighFeeApproval } from './features/security/biometricApproval';

const approval = await requestHighFeeApproval({
  feeETH: '0.015',
  feeUSD: '30.00',
}, 'en');
```

## 🎨 UI Components

### Fee Preview

Shows fee estimate with warnings:

```typescript
<FeePreview
  network="sepolia"
  gasLimit={BigNumber.from(21000)}
  feeLevel="medium"
  ethPriceUSD={2000}
  onFeeCheck={(check) => {
    if (!check.allowed) {
      Alert.alert('Fee Too High', 'Please adjust settings');
    }
  }}
  locale="en"
/>
```

**Features:**
- ✅ Real-time fee estimation
- ✅ Warning/error indicators
- ✅ Cap information
- ✅ Approval requirements
- ✅ Refresh button

### Batch Fee Preview

For split bills:

```typescript
<BatchFeePreview
  network="sepolia"
  gasLimit={BigNumber.from(21000)}
  txCount={5}
  feeLevel="medium"
  ethPriceUSD={2000}
  locale="en"
/>
```

**Shows:**
- Per-transaction fee
- Total batch fee
- Transaction count
- USD conversion

## 🌍 Localization

### Supported Languages

- **English** (`en`)
- **Russian** (`ru`)

### Example Messages

**English:**
```
Fee Cap Exceeded
Transaction fee (0.02 ETH) exceeds your cap (0.01 ETH) by 0.01 ETH.
Please adjust fee cap in settings or wait for lower gas prices.
```

**Russian:**
```
Превышен лимит комиссии
Комиссия транзакции (0.02 ETH) превышает ваш лимит (0.01 ETH) на 0.01 ETH.
Измените лимит в настройках или дождитесь снижения цены газа.
```

### Custom Translations

```typescript
const warning = generateFeeWarning(check, 'ru');

console.log(warning.title);   // Localized title
console.log(warning.message); // Localized message
```

## 🧪 Testing

### Unit Tests

```bash
npm test src/features/security/__tests__/feeCaps.test.ts
```

**Coverage:**
- ✅ Fee below cap (allowed)
- ✅ Fee above cap (blocked)
- ✅ Warning threshold
- ✅ USD conversion
- ✅ Disabled cap
- ✅ Batch fee checking
- ✅ Warning generation
- ✅ Localization
- ✅ Edge cases (zero, exact cap, 1 wei above)
- ✅ Approval requirements

### Test Examples

```typescript
it('should block fee above cap', async () => {
  const feeWei = ethers.utils.parseEther('0.02'); // Above 0.01 cap
  
  const check = await checkFeeCap(feeWei);
  
  expect(check.allowed).toBe(false);
  expect(check.reason).toBe('cap_exceeded');
  expect(check.exceedsBy).toBe('0.01');
});

it('should warn at threshold', async () => {
  const feeWei = ethers.utils.parseEther('0.006'); // Above 0.005 warning
  
  const check = await checkFeeCap(feeWei);
  
  expect(check.allowed).toBe(true);
  expect(check.reason).toBe('warning_threshold');
});
```

## 📊 Integration Examples

### Scheduled Payments

```typescript
// Before executing scheduled payment
const feeWei = gasLimit.mul(maxFeePerGas);
const check = await checkFeeCap(feeWei, ethPriceUSD);

if (!check.allowed) {
  console.log('⛔ Fee exceeds cap, skipping execution');
  return;
}

if (check.requiresApproval) {
  const approval = await requestScheduledPaymentApproval({
    to: payment.to,
    amount: payment.amount,
    asset: payment.asset,
  });
  
  if (!approval.success) {
    console.log('❌ User denied approval');
    return;
  }
}

// Proceed with transaction
await sendTransaction();
```

### Split Bills

```typescript
// Before paying all participants
const perTxFeeWei = gasLimit.mul(maxFeePerGas);
const txCount = participants.length;

const check = await checkBatchFeeCap(perTxFeeWei, txCount, ethPriceUSD);

if (!check.allowed) {
  Alert.alert(
    'Fee Cap Exceeded',
    `Per-transaction fee ${check.perTxFeeETH} ETH exceeds cap`
  );
  return;
}

if (check.reason === 'high_batch_total') {
  Alert.alert(
    'High Total Fee',
    `Total fee for ${txCount} transactions: ${check.totalFeeETH} ETH`
  );
}

// Request approval
const approval = await requestSplitPaymentApproval({
  participantCount: txCount,
  totalAmount: totalAmount,
  asset: 'ETH',
});

if (!approval.success) {
  return;
}

// Proceed with batch
await payAllParticipants();
```

## 🎯 Best Practices

### 1. Always Check Before Execution

```typescript
// ❌ Bad: No fee check
await sendTransaction();

// ✅ Good: Check fee first
const check = await checkFeeCap(feeWei);
if (!check.allowed) {
  throw new Error('Fee exceeds cap');
}
await sendTransaction();
```

### 2. Show Fee Preview to User

```typescript
// ✅ Show preview before confirming
<FeePreview
  network={network}
  gasLimit={gasLimit}
  onFeeCheck={(check) => {
    setCanProceed(check.allowed);
  }}
/>

<Button
  disabled={!canProceed}
  onPress={handleConfirm}
>
  Confirm
</Button>
```

### 3. Handle Approval Gracefully

```typescript
const approval = await requestBiometricApproval({ ... });

if (!approval.success) {
  // Don't throw error, just inform user
  Alert.alert('Approval Required', 'Transaction cancelled');
  return;
}
```

### 4. Log Without Private Data

```typescript
// ❌ Bad: Logs private key
console.log(`Sending from ${privateKey}`);

// ✅ Good: Logs sanitized info
console.log(`Fee: ${feeETH} ETH`);
console.log(`Cap: ${capETH} ETH`);
```

### 5. Respect User Settings

```typescript
const settings = await loadFeeCapSettings();

if (!settings.enabled) {
  // User disabled caps, proceed without check
  await sendTransaction();
} else {
  // Check fee cap
  const check = await checkFeeCap(feeWei);
  // ...
}
```

## 🎉 Acceptance Criteria

- ✅ **Fee Estimation** - Reuse `suggestFees()` from fees.ts
- ✅ **Fee Preview** - Show on schedule/split screens
- ✅ **Fee Caps** - Global cap per transaction
- ✅ **Warnings** - Alert if fee exceeds threshold
- ✅ **Biometric Approval** - Optional Face ID/Touch ID/PIN
- ✅ **Batch Checking** - Total fee limits for split bills
- ✅ **No Silent Charges** - Always warn on high fees
- ✅ **Localization** - Multi-language support
- ✅ **Privacy** - No private data in logs
- ✅ **Tests** - Unit tests for cap behavior

## 📁 Files

```
src/features/security/
├── feeCaps.ts                     # Fee cap checking (~350 lines)
├── biometricApproval.ts           # Biometric auth (~250 lines)
├── components/
│   └── FeePreview.tsx             # UI component (~350 lines)
└── __tests__/
    └── feeCaps.test.ts            # Unit tests (~300 lines)
```

**Total:** ~1,250 lines

## 🚀 Status

✅ **Production Ready**

- All features implemented
- Comprehensive tests
- Full documentation
- Localized

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-11
