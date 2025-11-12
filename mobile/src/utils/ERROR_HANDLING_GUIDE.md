# 🔄 Error Handling & Retry Policy Guide

Complete guide for unified error mapping and retry policies.

## 🎯 Overview

The Error Handling system provides:
- **Error Mapping** - User-friendly error messages
- **Retry Policies** - Configurable retry strategies
- **Action Suggestions** - Actionable CTAs
- **Retry History** - Track all attempts
- **Localization** - Multi-language support
- **Fee Bumping** - Automatic fee increases on retry

## 🚀 Quick Start

### 1. Map Error

```typescript
import { mapError } from './utils/errorMapper';

try {
  await sendTransaction();
} catch (error) {
  const mapped = mapError(error, {
    operation: 'send',
    network: 'Sepolia',
  }, 'en');
  
  console.log(mapped.title);    // "Insufficient Funds"
  console.log(mapped.message);  // "Your balance is too low..."
  console.log(mapped.actions);  // ['top_up', 'reduce_amount', 'cancel']
}
```

### 2. Implement Retry

```typescript
import { shouldRetry, calculateRetryDelay } from './config/txPolicy';
import { SCHEDULED_PAYMENT_RETRY_POLICY } from './config/txPolicy';

let attempt = 0;
const policy = SCHEDULED_PAYMENT_RETRY_POLICY;

while (attempt < policy.maxAttempts) {
  try {
    await sendTransaction();
    break; // Success!
  } catch (error) {
    const errorCode = detectErrorCode(error);
    
    if (!shouldRetry(attempt + 1, errorCode, policy)) {
      throw error; // Give up
    }
    
    const delay = calculateRetryDelay(attempt + 1, policy);
    console.log(`Retrying in ${formatRetryDelay(delay)}...`);
    
    await sleep(delay);
    attempt++;
  }
}
```

### 3. Show Error UI

```typescript
import { ErrorDisplay } from './components/ErrorDisplay';

<ErrorDisplay
  error={mappedError}
  retryHistory={retryHistory}
  onAction={(action) => {
    switch (action) {
      case 'top_up':
        navigation.navigate('AddFunds');
        break;
      case 'retry':
        handleRetry();
        break;
      case 'cancel':
        navigation.goBack();
        break;
    }
  }}
  locale="en"
/>
```

## 📖 Error Codes

### Supported Errors

| Code | Severity | Retryable | User Fault | Actions |
|------|----------|-----------|------------|---------|
| `INSUFFICIENT_FUNDS` | error | ✅ | ✅ | top_up, reduce_amount, cancel |
| `NONCE_TOO_LOW` | warning | ✅ | ❌ | retry, cancel |
| `REPLACEMENT_UNDERPRICED` | warning | ✅ | ❌ | speed_up, wait, cancel |
| `EXECUTION_REVERTED` | error | ❌ | ❌ | contact_support, cancel |
| `NETWORK_MISMATCH` | error | ❌ | ✅ | switch_network, cancel |
| `TIMEOUT` | warning | ✅ | ❌ | retry, wait, cancel |
| `USER_REJECTED` | info | ✅ | ✅ | retry, cancel |
| `GAS_PRICE_TOO_LOW` | warning | ✅ | ❌ | speed_up, wait, cancel |
| `NETWORK_ERROR` | error | ✅ | ❌ | retry, wait, cancel |
| `UNKNOWN_ERROR` | error | ✅ | ❌ | retry, contact_support, cancel |

### Error Detection

```typescript
import { detectErrorCode } from './utils/errorMapper';

const error = new Error('insufficient funds for gas * price + value');
const code = detectErrorCode(error);
// => 'INSUFFICIENT_FUNDS'
```

**Detection Patterns:**
- Case-insensitive matching
- Multiple error message formats
- Nested error objects
- Error reason extraction

## 🔄 Retry Policies

### Scheduled Payments

**Strategy:** Exponential backoff

```typescript
{
  maxAttempts: 5,
  backoffStrategy: 'exponential',
  baseDelayMs: 60000,              // 1 minute
  maxDelayMs: 3600000,             // 1 hour
  pauseAfterFailures: 3,
  notifyOnFailure: true,
  retryableErrors: [
    'INSUFFICIENT_FUNDS',
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'GAS_PRICE_TOO_LOW',
  ],
}
```

**Backoff Schedule:**
- Attempt 1: 1 minute
- Attempt 2: 2 minutes
- Attempt 3: 4 minutes
- Attempt 4: 8 minutes
- Attempt 5: 16 minutes (capped at 1 hour)

### Split Payments

**Strategy:** Fixed delay with fee bump

```typescript
{
  maxAttempts: 3,                  // 1 initial + 2 retries
  maxRetriesPerParticipant: 2,
  backoffStrategy: 'fixed',
  baseDelayMs: 5000,               // 5 seconds
  maxDelayMs: 10000,               // 10 seconds
  feeBumpMultiplier: 1.125,        // 12.5% increase
  retryableErrors: [
    'INSUFFICIENT_FUNDS',
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
  ],
}
```

**Fee Bump Schedule:**
- Attempt 1: Original fee
- Attempt 2: Original fee × 1.125 (12.5% increase)
- Attempt 3: Original fee × 1.125² (26.6% increase)

### Regular Transactions

**Strategy:** Linear backoff

```typescript
{
  maxAttempts: 3,
  backoffStrategy: 'linear',
  baseDelayMs: 2000,               // 2 seconds
  maxDelayMs: 10000,               // 10 seconds
  feeBumpMultiplier: 1.1,          // 10% increase
  retryableErrors: [
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
  ],
}
```

**Backoff Schedule:**
- Attempt 1: 2 seconds
- Attempt 2: 4 seconds
- Attempt 3: 6 seconds

## 🎨 UI Components

### ErrorDisplay

Full error display with actions:

```typescript
<ErrorDisplay
  error={mappedError}
  retryHistory={retryHistory}
  onAction={(action) => handleAction(action)}
  locale="en"
  showTechnicalDetails={false}
/>
```

**Features:**
- ✅ Error title and message
- ✅ Severity indicator (error/warning/info)
- ✅ Action buttons with icons
- ✅ Retry history
- ✅ Technical details (collapsible)
- ✅ Error code display

### CompactErrorDisplay

Compact error for lists:

```typescript
<CompactErrorDisplay
  error={mappedError}
  onPress={() => showFullError()}
/>
```

## 🌍 Localization

### Supported Languages

- **English** (`en`)
- **Russian** (`ru`)

### Example Messages

**English:**
```
Title: Insufficient Funds
Message: Your balance is too low to complete this transaction. 
         Please add funds to your wallet.
Actions: Add Funds, Reduce Amount, Cancel
```

**Russian:**
```
Title: Недостаточно средств
Message: Ваш баланс слишком низкий для выполнения транзакции. 
         Пополните кошелёк.
Actions: Пополнить, Уменьшить сумму, Отменить
```

### Action Labels

| Action | English | Russian |
|--------|---------|---------|
| top_up | Add Funds | Пополнить |
| switch_network | Switch Network | Сменить сеть |
| reduce_amount | Reduce Amount | Уменьшить сумму |
| speed_up | Speed Up | Ускорить |
| retry | Retry | Повторить |
| wait | Wait | Подождать |
| cancel | Cancel | Отменить |
| contact_support | Contact Support | Поддержка |

## 📊 Retry History

### Track Attempts

```typescript
import { createRetryHistory, recordRetryAttempt } from './config/txPolicy';

let history = createRetryHistory();

const attempt = {
  attempt: 1,
  timestamp: Date.now(),
  errorCode: 'INSUFFICIENT_FUNDS',
  errorMessage: 'insufficient funds',
  delayMs: 60000,
  feeBump: '11.25 Gwei',
};

history = recordRetryAttempt(history, attempt);

console.log(`Total attempts: ${history.totalAttempts}`);
console.log(`Last attempt: ${history.lastAttempt?.errorCode}`);
console.log(`Next retry at: ${new Date(history.nextRetryAt!)}`);
```

### History Structure

```typescript
interface RetryHistory {
  totalAttempts: number;
  attempts: RetryAttempt[];
  lastAttempt?: RetryAttempt;
  nextRetryAt?: number;
}

interface RetryAttempt {
  attempt: number;
  timestamp: number;
  errorCode: string;
  errorMessage: string;
  delayMs: number;
  feeBump?: string;
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test src/utils/__tests__/errorMapper.test.ts
npm test src/config/__tests__/txPolicy.test.ts
```

**Coverage:**
- ✅ Error detection (all codes)
- ✅ Error mapping
- ✅ Localization (EN/RU)
- ✅ Action suggestions
- ✅ Retry delay calculation
- ✅ Fee bump calculation
- ✅ Retry decision logic
- ✅ Retry history tracking

### Test Examples

```typescript
it('should detect insufficient funds', () => {
  const error = new Error('insufficient funds for gas');
  const code = detectErrorCode(error);
  expect(code).toBe('INSUFFICIENT_FUNDS');
});

it('should calculate exponential backoff', () => {
  const delay1 = calculateRetryDelay(1, SCHEDULED_PAYMENT_RETRY_POLICY);
  const delay2 = calculateRetryDelay(2, SCHEDULED_PAYMENT_RETRY_POLICY);
  
  expect(delay1).toBe(60000);   // 1 minute
  expect(delay2).toBe(120000);  // 2 minutes
});

it('should bump fee by 12.5%', () => {
  const originalFee = ethers.utils.parseUnits('10', 'gwei');
  const bump = calculateFeeBump(originalFee, 1, 1.125);
  
  expect(ethers.utils.formatUnits(bump, 'gwei')).toBe('11.25');
});
```

## 🎯 Integration Examples

### Scheduled Payments

```typescript
import { mapError, detectErrorCode } from './utils/errorMapper';
import { shouldRetry, calculateRetryDelay, SCHEDULED_PAYMENT_RETRY_POLICY } from './config/txPolicy';

async function executeScheduledPayment(job: ScheduledJob) {
  let attempt = 0;
  const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
  let history = createRetryHistory();
  
  while (attempt < policy.maxAttempts) {
    try {
      await sendTransaction(job);
      return; // Success!
      
    } catch (error: any) {
      const errorCode = detectErrorCode(error);
      const mapped = mapError(error, { operation: 'schedule' });
      
      console.log(`❌ ${mapped.title}: ${mapped.message}`);
      
      if (!shouldRetry(attempt + 1, errorCode, policy)) {
        // Record failure and give up
        history = recordRetryAttempt(history, {
          attempt: attempt + 1,
          timestamp: Date.now(),
          errorCode,
          errorMessage: mapped.message,
          delayMs: 0,
        });
        
        throw error;
      }
      
      const delay = calculateRetryDelay(attempt + 1, policy);
      console.log(`🔄 Retrying in ${formatRetryDelay(delay)}...`);
      
      history = recordRetryAttempt(history, {
        attempt: attempt + 1,
        timestamp: Date.now(),
        errorCode,
        errorMessage: mapped.message,
        delayMs: delay,
      });
      
      await sleep(delay);
      attempt++;
    }
  }
}
```

### Split Payments

```typescript
async function payParticipant(participant: SplitParticipant) {
  let attempt = 0;
  const policy = SPLIT_PAYMENT_RETRY_POLICY;
  let currentFee = originalMaxPriorityFeePerGas;
  
  while (attempt < policy.maxRetriesPerParticipant) {
    try {
      await sendNative({
        to: participant.address,
        amountEther: participant.amountHuman,
        maxPriorityFeePerGas: currentFee,
      });
      
      return; // Success!
      
    } catch (error: any) {
      const errorCode = detectErrorCode(error);
      
      if (!shouldRetry(attempt + 1, errorCode, policy)) {
        throw error;
      }
      
      // Bump fee for next attempt
      currentFee = calculateFeeBump(
        currentFee,
        attempt + 1,
        policy.feeBumpMultiplier
      );
      
      console.log(`🔄 Retry ${attempt + 1} with fee: ${ethers.utils.formatUnits(currentFee, 'gwei')} Gwei`);
      
      const delay = calculateRetryDelay(attempt + 1, policy);
      await sleep(delay);
      attempt++;
    }
  }
}
```

## 🎉 Acceptance Criteria

- ✅ **Error Mapping** - All popular errors mapped
- ✅ **Retry Policies** - Configurable for schedule/split
- ✅ **Exponential Backoff** - For scheduled payments
- ✅ **Fee Bumping** - 12.5% increase for split payments
- ✅ **UI Suggestions** - Actionable CTAs
- ✅ **Retry History** - All attempts tracked
- ✅ **Localization** - EN/RU support
- ✅ **Config** - Policies in `config/txPolicy.ts`
- ✅ **Tests** - Unit tests for mapping and retry logic

## 📁 Files

```
src/
├── config/
│   ├── txPolicy.ts                    # Retry policies (~250 lines)
│   └── __tests__/
│       └── txPolicy.test.ts           # Policy tests (~300 lines)
├── utils/
│   ├── errorMapper.ts                 # Error mapping (~450 lines)
│   └── __tests__/
│       └── errorMapper.test.ts        # Mapper tests (~250 lines)
├── components/
│   └── ErrorDisplay.tsx               # UI component (~350 lines)
└── utils/
    └── ERROR_HANDLING_GUIDE.md        # Documentation (~500 lines)
```

**Total:** ~2,100 lines

## 🚀 Status

✅ **Production Ready**

- All features implemented
- Comprehensive tests
- Full documentation
- Localized

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-11
