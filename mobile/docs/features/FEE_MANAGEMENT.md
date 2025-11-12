# 💰 Fee Management & Transaction Replacement

## ✅ Что реализовано

### Core Features
- ✅ **Transparent Fees** - детальный расчёт комиссий
- ✅ **Base Fee Reading** - чтение текущего base fee из блока
- ✅ **Priority Fee Estimation** - анализ последних 20 блоков
- ✅ **Fee Levels** - Low/Medium/High с временем подтверждения
- ✅ **Transaction Replacement** - ускорение pending транзакций
- ✅ **Bump Calculation** - автоматический расчёт увеличения (12.5%)
- ✅ **USD Conversion** - опциональный показ в USD
- ✅ **BigInt Precision** - без потери точности
- ✅ **User Consent** - никакой silent-замены

## 🏗️ Architecture

```
src/
├── wallet/
│   └── fees.ts                      # Core fee management (500+ lines)
└── components/
    └── fees/
        └── FeeDetailsCard.tsx       # UI for fee breakdown
```

## 📊 Types

### FeeEstimate
```typescript
interface FeeEstimate {
  baseFee: BigNumber;              // Current base fee
  priorityFee: BigNumber;          // Tip for miners
  maxFeePerGas: BigNumber;         // baseFee * 2 + priorityFee
  maxPriorityFeePerGas: BigNumber; // Same as priorityFee
  gasLimit: BigNumber;
  totalFeeWei: BigNumber;          // Total in wei
  totalFeeETH: string;             // Human-readable
  totalFeeUSD?: string;            // Optional USD
}
```

### FeeSuggestion
```typescript
interface FeeSuggestion {
  low: FeeLevel;      // ~30 sec
  medium: FeeLevel;   // ~15 sec
  high: FeeLevel;     // ~10 sec
  baseFee: BigNumber;
  network: Network;
  timestamp: number;
}
```

### ReplacementEstimate
```typescript
interface ReplacementEstimate {
  newMaxFeePerGas: BigNumber;
  newMaxPriorityFeePerGas: BigNumber;
  oldTotalFeeWei: BigNumber;
  newTotalFeeWei: BigNumber;
  additionalCostWei: BigNumber;
  additionalCostETH: string;
  additionalCostUSD?: string;
  bumpPercentage: number;          // e.g., 12.5%
}
```

## 🚀 Как использовать

### 1. Получить предложения комиссий:

```typescript
import { suggestFees } from './wallet/fees';

const suggestion = await suggestFees(
  'sepolia',
  BigNumber.from(21000),  // Gas limit
  2000                     // ETH price in USD (optional)
);

console.log('Low:', suggestion.low);
console.log('Medium:', suggestion.medium);
console.log('High:', suggestion.high);
```

### 2. Получить детальную оценку:

```typescript
import { getDetailedFeeEstimate } from './wallet/fees';

const estimate = await getDetailedFeeEstimate(
  'sepolia',
  BigNumber.from(21000),
  'medium',
  2000
);

console.log('Base Fee:', formatGwei(estimate.baseFee), 'Gwei');
console.log('Priority Fee:', formatGwei(estimate.priorityFee), 'Gwei');
console.log('Total:', estimate.totalFeeETH, 'ETH');
console.log('USD:', estimate.totalFeeUSD);
```

### 3. Проверить, застряла ли транзакция:

```typescript
import { isTransactionStuck } from './wallet/fees';

const { isStuck, pendingMinutes, reason } = await isTransactionStuck(
  txHash,
  'sepolia',
  5  // Threshold: 5 minutes
);

if (isStuck) {
  console.log(`Transaction stuck for ${pendingMinutes} minutes`);
  console.log(`Reason: ${reason}`);
  // Show "Speed Up" button
}
```

### 4. Ускорить транзакцию (Replacement):

```typescript
import { createReplacementTransaction } from './wallet/fees';

// IMPORTANT: Show confirmation dialog first!
const confirmed = await showConfirmDialog(
  'Speed Up Transaction',
  'This will increase the fee to speed up your transaction. Continue?'
);

if (confirmed) {
  const replacement = await createReplacementTransaction(
    originalTxHash,
    'sepolia',
    1.125  // 12.5% bump (optional, default)
  );

  console.log('New max fee:', formatGwei(replacement.maxFeePerGas), 'Gwei');
  console.log('Additional cost:', replacement.estimate.additionalCostETH, 'ETH');
  console.log('Bump:', replacement.estimate.bumpPercentage, '%');

  // Send replacement transaction with same nonce
  const tx = await signer.sendTransaction({
    to: originalTx.to,
    value: originalTx.value,
    nonce: replacement.nonce,
    gasLimit: replacement.gasLimit,
    maxFeePerGas: replacement.maxFeePerGas,
    maxPriorityFeePerGas: replacement.maxPriorityFeePerGas,
  });
}
```

## 🎯 Acceptance Criteria - 100%

- ✅ `suggestFees()` читает baseFee и tip estimate
- ✅ UI показывает детальный breakdown комиссий
- ✅ Advanced настройки для ручной правки
- ✅ Ретрай/бамп: если pending > X минут → предложить replacement
- ✅ Увеличение на 12.5% (configurable)
- ✅ Показ в ETH и USD (optional)
- ✅ Никакой silent-замены - только с согласием
- ✅ Все значения - BigInt (без потери точности)

## 📱 UI Components

### FeeDetailsCard

Показывает прозрачный breakdown комиссий:

```typescript
<FeeDetailsCard
  estimate={feeEstimate}
  showUSD={true}
/>
```

**Displays:**
- Base Fee (Gwei)
- Priority Fee / Tip (Gwei)
- Max Fee Per Gas (Gwei)
- Gas Limit
- Total Fee (ETH)
- Total Fee (USD) - optional
- Info box с объяснением

### Speed Up Button (Example)

```typescript
function SpeedUpButton({ txHash, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleSpeedUp = async () => {
    try {
      setLoading(true);

      // Check if stuck
      const { isStuck } = await isTransactionStuck(txHash, network, 5);
      if (!isStuck) {
        Alert.alert('Not Stuck', 'Transaction is not stuck yet');
        return;
      }

      // Calculate replacement
      const replacement = await createReplacementTransaction(txHash, network);

      // Show confirmation
      Alert.alert(
        'Speed Up Transaction',
        `This will increase the fee by ${replacement.estimate.bumpPercentage.toFixed(1)}%.\n\nAdditional cost: ${replacement.estimate.additionalCostETH} ETH${replacement.estimate.additionalCostUSD ? ` ($${replacement.estimate.additionalCostUSD})` : ''}\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Speed Up',
            onPress: async () => {
              // Send replacement transaction
              const tx = await sendReplacementTx(replacement);
              onSuccess(tx);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.speedUpButton}
      onPress={handleSpeedUp}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Ionicons name="flash" size={20} color="#FFF" />
          <Text style={styles.speedUpText}>Speed Up</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
```

## 💡 How It Works

### Fee Calculation

```typescript
// 1. Get base fee from latest block
const block = await provider.getBlock('latest');
const baseFee = block.baseFeePerGas;  // e.g., 10 Gwei

// 2. Get priority fee from fee history (last 20 blocks)
const feeHistory = await provider.send('eth_feeHistory', [
  '0x14',  // 20 blocks
  'latest',
  [25, 50, 75],  // Percentiles
]);

// 3. Calculate average priority fees
const avgLow = average(feeHistory.reward[0]);      // e.g., 1 Gwei
const avgMedium = average(feeHistory.reward[1]);   // e.g., 2 Gwei
const avgHigh = average(feeHistory.reward[2]);     // e.g., 3 Gwei

// 4. Calculate max fee per gas (baseFee * 2 + priorityFee)
// This protects against base fee doubling
const maxFeePerGas = baseFee.mul(2).add(priorityFee);
// e.g., 10 * 2 + 2 = 22 Gwei

// 5. Calculate total fee
const totalFee = gasLimit * maxFeePerGas;
// e.g., 21000 * 22 Gwei = 0.000462 ETH
```

### Transaction Replacement

```typescript
// 1. Check if transaction is stuck
const tx = await provider.getTransaction(txHash);
if (tx.blockNumber) {
  throw new Error('Already mined');
}

// 2. Calculate new fees (12.5% bump)
const newMaxFeePerGas = oldMaxFeePerGas * 1.125;
const newMaxPriorityFeePerGas = oldMaxPriorityFeePerGas * 1.125;

// 3. Ensure minimum bump (10%)
const minBump = oldMaxFeePerGas * 0.10;
if (newMaxFeePerGas - oldMaxFeePerGas < minBump) {
  newMaxFeePerGas = oldMaxFeePerGas + minBump;
}

// 4. Check current network conditions
const currentBaseFee = await getCurrentBaseFee();
const minRequired = currentBaseFee * 2 + newMaxPriorityFeePerGas;
if (newMaxFeePerGas < minRequired) {
  newMaxFeePerGas = minRequired;
}

// 5. Send replacement with SAME NONCE
const replacementTx = await signer.sendTransaction({
  ...originalTx,
  nonce: originalTx.nonce,  // SAME NONCE!
  maxFeePerGas: newMaxFeePerGas,
  maxPriorityFeePerGas: newMaxPriorityFeePerGas,
});
```

## 🧪 Testing

### Unit Tests:

```typescript
describe('Fee Management', () => {
  it('should calculate fees at different base fees', async () => {
    // Mock base fee = 10 Gwei
    const suggestion = await suggestFees(network, gasLimit);
    expect(suggestion.baseFee).toEqual(parseGwei('10'));
    expect(suggestion.medium.maxFeePerGas).toEqual(parseGwei('22')); // 10*2 + 2
  });

  it('should calculate replacement with 12.5% bump', async () => {
    const original = {
      maxFeePerGas: parseGwei('20'),
      maxPriorityFeePerGas: parseGwei('2'),
    };
    const replacement = await calculateReplacementFees({ originalTx: original });
    expect(replacement.newMaxFeePerGas).toEqual(parseGwei('22.5')); // 20 * 1.125
    expect(replacement.bumpPercentage).toBeCloseTo(12.5);
  });

  it('should ensure minimum 10% bump', async () => {
    const original = {
      maxFeePerGas: parseGwei('100'),
      maxPriorityFeePerGas: parseGwei('10'),
    };
    const replacement = await calculateReplacementFees({
      originalTx: original,
      bumpMultiplier: 1.05,  // Only 5%
    });
    // Should bump to at least 10%
    expect(replacement.newMaxFeePerGas.gte(parseGwei('110'))).toBe(true);
  });
});
```

### Integration Test (Sepolia):

```bash
# 1. Отправь транзакцию с заниженной комиссией
const tx = await sendNative({
  to: recipient,
  amountEther: '0.001',
  maxFeePerGas: parseGwei('1'),  # Очень низко!
  maxPriorityFeePerGas: parseGwei('0.1'),
});

# 2. Дождись 5 минут
await sleep(5 * 60 * 1000);

# 3. Проверь, что застряла
const { isStuck } = await isTransactionStuck(tx.hash, 'sepolia', 5);
expect(isStuck).toBe(true);

# 4. Ускорь
const replacement = await createReplacementTransaction(tx.hash, 'sepolia');
const newTx = await sendReplacementTx(replacement);

# 5. Проверь, что новая прошла
await newTx.wait();
expect(newTx.status).toBe(1);
```

## 📝 Files Created

```
mobile/
├── src/
│   ├── wallet/
│   │   └── fees.ts                      # Core module (500+ lines)
│   │
│   └── components/
│       └── fees/
│           └── FeeDetailsCard.tsx       # UI component
│
└── docs/
    └── features/
        └── FEE_MANAGEMENT.md            # This file
```

## 🎉 Ready to Use!

Система полностью реализована:

1. ✅ Transparent fee calculation
2. ✅ Base fee + priority fee reading
3. ✅ Fee levels (Low/Medium/High)
4. ✅ Transaction replacement (Speed Up)
5. ✅ USD conversion (optional)
6. ✅ BigInt precision
7. ✅ User consent required

### Quick Start:

```typescript
// Get fee suggestion
const fees = await suggestFees('sepolia', gasLimit, ethPrice);

// Show in UI
<FeeDetailsCard estimate={fees.medium} showUSD={true} />

// Speed up stuck transaction
if (isStuck) {
  const replacement = await createReplacementTransaction(txHash, network);
  // Show confirmation → send
}
```

---

**Last Updated:** 2025-11-10
**Status:** ✅ Production Ready
