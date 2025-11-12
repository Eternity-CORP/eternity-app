
# 💰 Split Bill

Production-ready bill splitting system for Ethereum transactions.

## ✨ Features

- ✅ **Equal & Weighted Split** - Split equally or by custom weights
- ✅ **Tip Calculation** - Add tip percentage (0-100%)
- ✅ **Rounding Strategies** - Floor, ceil, or banker's rounding
- ✅ **Remainder Distribution** - Give to first, distribute to top N, or none
- ✅ **EIP-55 Validation** - Checksummed Ethereum addresses
- ✅ **Multi-Token Support** - ETH and ERC-20 tokens
- ✅ **AsyncStorage Persistence** - Bills saved locally
- ✅ **No Private Data** - Error sanitization

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install zustand uuid @types/uuid ethers
```

### 2. Load Bills on App Start

```typescript
import { loadSplitBills } from './features/split/store/splitBillsSlice';

// In App.tsx or root component
useEffect(() => {
  loadSplitBills();
}, []);
```

### 3. Create a Split Bill

```typescript
import { useSplitBills } from './features/split/store/splitBillsSlice';

const addBill = useSplitBills((state) => state.addBill);

const bill = addBill({
  chainId: 11155111, // Sepolia
  asset: { type: 'ETH', decimals: 18 },
  totalHuman: '100.50',
  tipPercent: 15,
  mode: 'equal',
  participants: [
    { address: '0xAlice...' },
    { address: '0xBob...' },
    { address: '0xCharlie...' },
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
  note: 'Dinner at restaurant',
});

// Each participant's amount is calculated automatically
bill.participants.forEach((p) => {
  console.log(`${p.address}: ${p.amountSmallestUnit} wei`);
});
```

## 📖 Usage

### Equal Split

```typescript
const bill = addBill({
  chainId: 11155111,
  asset: { type: 'ETH', decimals: 18 },
  totalHuman: '90',
  tipPercent: 10,
  mode: 'equal',
  participants: [
    { address: '0xAlice...' },
    { address: '0xBob...' },
    { address: '0xCharlie...' },
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
});

// Total with tip: 90 * 1.1 = 99
// Each pays: 33 (with remainder going to first)
```

### Weighted Split

```typescript
const bill = addBill({
  chainId: 11155111,
  asset: { type: 'ETH', decimals: 18 },
  totalHuman: '90',
  tipPercent: 10,
  mode: 'weighted',
  participants: [
    { address: '0xAlice...', weight: 2 }, // Pays 2x
    { address: '0xBob...', weight: 1 },   // Pays 1x
    { address: '0xCharlie...', weight: 1 }, // Pays 1x
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
});

// Total with tip: 99
// Total weight: 4
// Alice: 99 * 2/4 = 49.5
// Bob: 99 * 1/4 = 24.75
// Charlie: 99 * 1/4 = 24.75
```

### ERC-20 Token

```typescript
const bill = addBill({
  chainId: 11155111,
  asset: {
    type: 'ERC20',
    tokenAddress: '0xUSDC...',
    symbol: 'USDC',
    decimals: 6,
  },
  totalHuman: '100.50',
  tipPercent: 0,
  mode: 'equal',
  participants: [
    { address: '0xAlice...' },
    { address: '0xBob...' },
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
});
```

### Update Payment Status

```typescript
const updateParticipantStatus = useSplitBills(
  (state) => state.updateParticipantStatus
);

// Mark as paid
updateParticipantStatus({
  billId: bill.id,
  participantId: participant.id,
  payStatus: 'paid',
  txHash: '0x123...',
});

// Mark as failed
updateParticipantStatus({
  billId: bill.id,
  participantId: participant.id,
  payStatus: 'failed',
});
```

### Query Bills

```typescript
const bills = useSplitBills((state) => state.getAllBills());
const pending = useSplitBills((state) => state.getPendingBills());
const bill = useSplitBills((state) => state.getBill(billId));
```

## 🎯 Rounding Strategies

### Floor (Default)

Rounds down to nearest smallest unit. Remainder goes to designated participant(s).

```typescript
// 100 / 3 = 33.333...
// Floor: 33, 33, 33 + remainder(1)
rounding: 'floor'
```

### Ceil

Rounds up to nearest smallest unit.

```typescript
// 100 / 3 = 33.333...
// Ceil: 34, 34, 34 - excess(2)
rounding: 'ceil'
```

### Banker's Rounding

Rounds to nearest even number (IEEE 754 standard).

```typescript
// For ties, round to even
rounding: 'bankers'
```

## 💡 Remainder Distribution

### First (Default)

Give all remainder to first participant.

```typescript
remainderStrategy: 'first'
```

### Top N

Distribute remainder among top N participants (1 wei/unit each).

```typescript
remainderStrategy: 'topN',
remainderTopN: 2 // Distribute to first 2 participants
```

### None

Don't distribute remainder (sum won't match total).

```typescript
remainderStrategy: 'none'
```

## 🔒 Security

### EIP-55 Checksum

All addresses are validated and checksummed:

```typescript
import { isValidAddress, getChecksumAddress } from './utils/validators';

// Validate
if (!isValidAddress(address)) {
  throw new Error('Invalid address');
}

// Checksum
const checksummed = getChecksumAddress(address);
// 0xf39fd... → 0xf39Fd...
```

### Error Sanitization

Private data is removed from errors:

```typescript
import { sanitizeError } from './utils/validators';

const error = 'Transfer from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 failed';
const sanitized = sanitizeError(error);
// "Transfer from 0x... failed"
```

## 🧪 Testing

```bash
# Run unit tests
npm test src/features/split/__tests__/calculator.test.ts
npm test src/features/split/__tests__/validators.test.ts
```

### Test Coverage

**Calculator:**
- ✅ Equal split (2, 3, N participants)
- ✅ Weighted split (various ratios)
- ✅ Tip calculation (0%, 10%, 20%)
- ✅ Remainder distribution (first, topN, none)
- ✅ Edge cases (1 participant, zero weight, invalid input)
- ✅ Decimal precision (6, 18 decimals)

**Validators:**
- ✅ EIP-55 address validation
- ✅ Amount validation
- ✅ Participant validation
- ✅ Duplicate detection
- ✅ Error sanitization

## 📁 Structure

```
src/features/split/
├── types.ts                    # Domain types
├── store/
│   └── splitBillsSlice.ts      # Zustand store + AsyncStorage
├── utils/
│   ├── calculator.ts           # Split calculation
│   └── validators.ts           # Validation & sanitization
└── __tests__/
    ├── calculator.test.ts      # Calculator tests
    └── validators.test.ts      # Validator tests
```

## 🎯 Examples

### Restaurant Bill

```typescript
// $120 bill + 18% tip, split 3 ways
const bill = addBill({
  chainId: 1,
  asset: { type: 'ETH', decimals: 18 },
  totalHuman: '120',
  tipPercent: 18,
  mode: 'equal',
  participants: [
    { address: '0xAlice...', note: 'Alice' },
    { address: '0xBob...', note: 'Bob' },
    { address: '0xCharlie...', note: 'Charlie' },
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
  note: 'Dinner at Italian restaurant',
});

// Total with tip: $141.60
// Each pays: $47.20
```

### Shared Expense (Weighted)

```typescript
// $300 shared expense, weighted by usage
const bill = addBill({
  chainId: 1,
  asset: { type: 'ETH', decimals: 18 },
  totalHuman: '300',
  tipPercent: 0,
  mode: 'weighted',
  participants: [
    { address: '0xAlice...', weight: 3, note: 'Alice (60%)' },
    { address: '0xBob...', weight: 2, note: 'Bob (40%)' },
  ],
  rounding: 'floor',
  remainderStrategy: 'first',
  note: 'Shared office rent',
});

// Total weight: 5
// Alice: $300 * 3/5 = $180
// Bob: $300 * 2/5 = $120
```

### USDC Payment

```typescript
// 500 USDC split equally
const bill = addBill({
  chainId: 1,
  asset: {
    type: 'ERC20',
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
  },
  totalHuman: '500',
  tipPercent: 0,
  mode: 'equal',
  participants: [
    { address: '0xAlice...' },
    { address: '0xBob...' },
    { address: '0xCharlie...' },
    { address: '0xDave...' },
  ],
  rounding: 'floor',
  remainderStrategy: 'topN',
  remainderTopN: 2,
  note: 'Group purchase',
});

// Each pays: 125 USDC
```

## 📊 Acceptance Criteria

- ✅ Calculate equal and weighted splits
- ✅ Apply tip percentage
- ✅ Round to smallest units (floor/ceil/bankers)
- ✅ Distribute remainder (first/topN/none)
- ✅ Sum of shares + remainder = total * (1 + tip)
- ✅ EIP-55 address validation
- ✅ No private data in errors
- ✅ AsyncStorage persistence
- ✅ Unit tests for rounding and weights
- ✅ Edge case tests (0 weight, 1 participant)

## 🎉 Status

✅ **Production Ready**

- All features implemented
- Comprehensive tests
- Type-safe
- Documented

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-11
