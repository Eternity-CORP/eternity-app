# 💸 Split Bill Payer Guide

Complete guide for sending split bill payments with nonce management.

## 🎯 Overview

The Split Payer system enables sequential payment processing for split bills with:
- **Nonce Management** - Global mutex prevents nonce conflicts
- **Sequential Processing** - One payment at a time
- **Retry Logic** - Automatic retries on failures
- **Progress Tracking** - Real-time status updates
- **Cancellation** - Pause/resume/cancel support
- **Transaction Links** - Direct links to block explorer

## 🚀 Quick Start

### 1. Pay All Participants

```typescript
import { payAllParticipants } from './features/split/SplitPayer';

const progress = await payAllParticipants({
  billId: 'bill-123',
  network: 'sepolia',
  minConfirmations: 2,
  maxRetries: 3,
  onProgress: (progress) => {
    console.log(`${progress.completed}/${progress.total} completed`);
  },
});

console.log(`✅ ${progress.completed} payments completed`);
console.log(`❌ ${progress.failed} payments failed`);
```

### 2. Pay Selected Participants

```typescript
import { paySelectedParticipants } from './features/split/SplitPayer';

const progress = await paySelectedParticipants({
  billId: 'bill-123',
  participantIds: ['p1', 'p2'], // Only these participants
  network: 'sepolia',
  minConfirmations: 2,
  maxRetries: 3,
});
```

## 📖 How It Works

### Sequential Processing

```
┌─────────────────────────────────────────┐
│         Payment Queue                   │
├─────────────────────────────────────────┤
│ 1. Alice  → 0.5 ETH  [pending]         │
│ 2. Bob    → 0.3 ETH  [pending]         │
│ 3. Charlie→ 0.2 ETH  [pending]         │
└─────────────────────────────────────────┘
           ↓
    ┌──────────────┐
    │ Nonce Lock   │ ← Global mutex
    └──────────────┘
           ↓
    Process one at a time:
    
    1️⃣ Send to Alice
       ├─ Acquire lock
       ├─ Send transaction
       ├─ Wait for confirmations
       ├─ Update status: paid
       └─ Release lock
    
    2️⃣ Send to Bob
       ├─ Acquire lock
       ├─ Send transaction
       ├─ Wait for confirmations
       ├─ Update status: paid
       └─ Release lock
    
    3️⃣ Send to Charlie
       └─ ... same process
```

### Nonce Management

The global `NonceManager` ensures sequential sends:

```typescript
// Acquire lock (blocks if already locked)
await nonceManager.acquire();

try {
  // Send transaction (nonce auto-incremented)
  const result = await sendNative({ ... });
  
  // Wait for confirmation
  await waitForConfirmations({ ... });
  
} finally {
  // Always release lock
  nonceManager.release();
}
```

**Benefits:**
- ✅ No nonce conflicts
- ✅ No "replacement transaction underpriced" errors
- ✅ Predictable transaction ordering
- ✅ Works with any RPC provider

### Retry Logic

Automatic retries with exponential backoff:

```typescript
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    await sendTransaction();
    break; // Success!
  } catch (error) {
    if (attempt >= maxRetries) {
      // Mark as failed
      updateStatus('failed');
    } else {
      // Wait and retry
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await sleep(backoffMs);
    }
  }
}
```

**Backoff Schedule:**
- Attempt 1: Immediate
- Attempt 2: 1 second
- Attempt 3: 2 seconds
- Attempt 4+: 4 seconds (capped at 10s)

## 🎨 UI Integration

### Payment Screen

```typescript
import { SplitBillPaymentScreen } from './features/split/screens/SplitBillPaymentScreen';

<SplitBillPaymentScreen
  billId="bill-123"
  network="sepolia"
  onComplete={() => {
    console.log('All payments completed!');
  }}
/>
```

**Features:**
- ✅ Bill summary with tip calculation
- ✅ Participant list with selection
- ✅ "Pay All" and "Pay Selected" buttons
- ✅ Real-time progress bar
- ✅ Current payment indicator
- ✅ Transaction links to explorer
- ✅ Error messages

### Progress Tracking

```typescript
const [progress, setProgress] = useState<PaymentProgress | null>(null);

await payAllParticipants({
  billId: 'bill-123',
  onProgress: (p) => {
    setProgress(p);
    
    console.log(`Progress: ${p.completed}/${p.total}`);
    console.log(`Failed: ${p.failed}`);
    console.log(`Running: ${p.isRunning}`);
    
    if (p.current) {
      console.log(`Current: ${p.current.status}`);
      console.log(`  To: ${p.current.address}`);
      console.log(`  Amount: ${p.current.amountHuman} ETH`);
      console.log(`  Attempts: ${p.current.attempts}`);
    }
  },
});
```

### Explorer Links

```typescript
function openExplorer(txHash: string, network: 'mainnet' | 'sepolia' | 'holesky') {
  const urls = {
    mainnet: `https://etherscan.io/tx/${txHash}`,
    sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
    holesky: `https://holesky.etherscan.io/tx/${txHash}`,
  };
  
  Linking.openURL(urls[network]);
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test src/features/split/__tests__/SplitPayer.test.ts
```

**Coverage:**
- ✅ Nonce manager lock/unlock
- ✅ Sequential payment processing
- ✅ Retry logic
- ✅ Error handling
- ✅ Progress tracking
- ✅ Pay selected functionality

### E2E Tests (Sepolia)

```bash
export TEST_PRIVATE_KEY="0x..."
npm test src/features/split/__tests__/split-payer.e2e.ts
```

**Test Cases:**
- ✅ Split 0.003 ETH to 3 addresses
- ✅ Split with 10% tip
- ✅ Weighted split (2:1:1)
- ✅ Insufficient funds handling
- ✅ Sequential processing without nonce conflicts

**Prerequisites:**
- Funded Sepolia account
- TEST_PRIVATE_KEY in environment
- 3 recipient addresses

## 📊 Logging

### Payment Logs

```
📤 Sending native ETH transaction...
  To: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Amount: 0.001 ETH
  Fee Level: medium
✅ Address validated: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✅ Amount validated: 0.001 ETH
  From: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Balance: 10.0 ETH
⚙️  Estimating gas...
✅ Gas estimated: 21000 units
💸 Sending transaction...
✅ Transaction sent: 0x123...
⏳ Waiting for 2 confirmations...
📊 Confirmations: 1/2
📊 Confirmations: 2/2
✅ Payment confirmed!

📊 Payment Result:
   To: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Amount: 0.001 ETH
   Status: completed
   TxHash: 0x123...
   Attempts: 1
   Duration: 15.3s
```

### Queue Logs

```
📋 Payment queue built: 3 participants

💸 Processing payment to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Amount: 0.001 ETH
   Attempt 1/3
   ✅ Transaction sent: 0x123...
   ⏳ Waiting for 2 confirmations...
   ✅ Payment confirmed!

💸 Processing payment to 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
   Amount: 0.001 ETH
   Attempt 1/3
   ✅ Transaction sent: 0x456...
   ⏳ Waiting for 2 confirmations...
   ✅ Payment confirmed!

✅ All payments completed: 3/3
```

## 🔧 Configuration

### Parameters

```typescript
interface PayAllParams {
  billId: string;                    // Split bill ID
  network?: Network;                 // 'mainnet' | 'sepolia' | 'holesky'
  minConfirmations?: number;         // Default: 2
  maxRetries?: number;               // Default: 3
  onProgress?: (progress) => void;   // Progress callback
}
```

### Defaults

```typescript
const DEFAULT_CONFIG = {
  minConfirmations: 2,
  maxRetries: 3,
  feeLevel: 'medium',
  backoffBase: 1000,    // 1 second
  backoffMax: 10000,    // 10 seconds
};
```

## 🎯 Best Practices

### 1. Always Use Progress Callback

```typescript
await payAllParticipants({
  billId: 'bill-123',
  onProgress: (progress) => {
    // Update UI
    setProgress(progress);
    
    // Log to analytics
    logPaymentProgress(progress);
    
    // Show notifications
    if (progress.current?.status === 'completed') {
      showNotification(`Payment to ${progress.current.address} completed`);
    }
  },
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  const progress = await payAllParticipants({ ... });
  
  if (progress.failed > 0) {
    Alert.alert(
      'Partial Success',
      `${progress.completed} succeeded, ${progress.failed} failed. Retry failed payments?`
    );
  }
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### 3. Verify on Sepolia First

```typescript
// Always test on Sepolia before mainnet
const network = __DEV__ ? 'sepolia' : 'mainnet';

await payAllParticipants({
  billId: 'bill-123',
  network,
  minConfirmations: network === 'mainnet' ? 3 : 2,
});
```

### 4. Show Transaction Links

```typescript
progress.queue.forEach((item) => {
  if (item.txHash) {
    console.log(`View: https://sepolia.etherscan.io/tx/${item.txHash}`);
  }
});
```

### 5. Monitor Gas Costs

```typescript
let totalGasUsed = BigNumber.from(0);

onProgress: (progress) => {
  progress.queue.forEach((item) => {
    if (item.status === 'completed') {
      // Track gas costs
      totalGasUsed = totalGasUsed.add(item.gasUsed);
    }
  });
}
```

## 🎉 Acceptance Criteria

- ✅ **Sequential Sends** - One payment at a time with nonce lock
- ✅ **No Nonce Conflicts** - Global mutex prevents collisions
- ✅ **Retry Logic** - Automatic retries with exponential backoff
- ✅ **Progress Tracking** - Real-time status updates
- ✅ **Transaction Confirmation** - Wait for N confirmations
- ✅ **Status Updates** - Store updated with paid/failed status
- ✅ **Explorer Links** - Direct links to Etherscan
- ✅ **Cancellation** - Can stop queue at any time
- ✅ **Logging** - Detailed logs: {to, amount, txHash, status}
- ✅ **E2E Tests** - Sepolia tests for ETH and ERC-20

## 📁 Files

```
src/features/split/
├── SplitPayer.ts                      # Payment processor (~450 lines)
├── screens/
│   └── SplitBillPaymentScreen.tsx     # UI component (~650 lines)
└── __tests__/
    ├── SplitPayer.test.ts             # Unit tests (~400 lines)
    └── split-payer.e2e.ts             # E2E tests (~300 lines)
```

**Total:** ~1,800 lines

## 🚀 Status

✅ **Production Ready**

- All features implemented
- Comprehensive tests
- Full documentation
- Sepolia tested

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-11
