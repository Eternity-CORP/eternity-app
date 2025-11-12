# 🔒 Mainnet Safety System

## ✅ Что реализовано

### Core Features
- ✅ **Feature Flag** - `EXPO_PUBLIC_MAINNET_ENABLED=false` по умолчанию
- ✅ **Amount Limiter** - максимум 0.1 ETH на транзакцию
- ✅ **Confirmation Required** - обязательное подтверждение
- ✅ **Mainnet Guard** - валидация перед отправкой
- ✅ **Smoke Test Script** - безопасный тест на mainnet
- ✅ **Production Checklist** - полный чек-лист перед деплоем
- ✅ **Unit Tests** - проверка блокировки mainnet

## 🏗️ Architecture

```
mobile/
├── .env                                    # Mainnet configuration
├── src/
│   └── utils/
│       ├── mainnet-guard.ts                # Safety guard module
│       └── __tests__/
│           └── mainnet-guard.test.ts       # Unit tests
├── scripts/
│   └── mainnet/
│       └── smoke-send-eth.ts               # Smoke test script
└── docs/
    ├── prod-checklist.md                   # Deployment checklist
    └── MAINNET_SAFETY.md                   # This file
```

## 🎯 Acceptance Criteria - 100%

- ✅ В `.env` добавлен `MAINNET_ENABLED=false|true`
- ✅ Лимитер суммы (`MAINNET_MAX_AMOUNT`)
- ✅ Предупреждение/чек-лист перед включением mainnet
- ✅ Смок-скрипт `smoke-send-eth.ts`
- ✅ Очень маленькая сумма (0.0001 ETH)
- ✅ Отправка на свой адрес
- ✅ Ручной запуск (не автоматический)
- ✅ Ожидание ≥2 подтверждений
- ✅ Без ручного разрешения прод-отправки невозможны
- ✅ Документ `prod-checklist.md`
- ✅ Никаких автозапусков смока
- ✅ Юнит-тест: фича-флаг блокирует mainnet

## 🔧 Configuration

### Environment Variables (`.env`):

```env
# Enable mainnet transactions (MUST be explicitly enabled)
# WARNING: Only enable after completing prod-checklist.md
EXPO_PUBLIC_MAINNET_ENABLED=false

# Maximum transaction amount on mainnet (in ETH)
# Prevents accidental large transfers
EXPO_PUBLIC_MAINNET_MAX_AMOUNT=0.1

# Require confirmation for mainnet transactions
EXPO_PUBLIC_MAINNET_REQUIRE_CONFIRMATION=true
```

**Default State:**
- ✅ Mainnet: **DISABLED**
- ✅ Max Amount: **0.1 ETH**
- ✅ Confirmation: **REQUIRED**

## 🛡️ Mainnet Guard

### Usage:

```typescript
import { validateMainnetTransaction } from './utils/mainnet-guard';

try {
  // Validate before sending
  validateMainnetTransaction(
    'mainnet',
    '0.05',      // amount in ETH
    true         // user confirmed
  );
  
  // If validation passes, send transaction
  await sendTransaction(...);
  
} catch (error) {
  if (error instanceof MainnetDisabledError) {
    // Mainnet is disabled
    showError('Mainnet is disabled. Enable in settings.');
  } else if (error instanceof MainnetAmountExceededError) {
    // Amount too large
    showError('Amount exceeds mainnet limit.');
  } else if (error instanceof MainnetConfirmationRequiredError) {
    // User must confirm
    showConfirmationDialog();
  }
}
```

### Features:

**1. Network Check:**
```typescript
if (isMainnet(network)) {
  // Apply mainnet restrictions
}
```

**2. Amount Validation:**
```typescript
const safe = isSafeMainnetAmount('0.05', 'mainnet');
// Returns: true (within 0.1 ETH limit)
```

**3. Warning Messages:**
```typescript
const warning = getMainnetWarning('0.05');
// Returns: "⚠️ MAINNET TRANSACTION\n\nYou are about to send..."
```

## 🔥 Smoke Test

### Prerequisites:

1. ✅ Complete `docs/prod-checklist.md`
2. ✅ Test wallet with ~0.002 ETH
3. ✅ Enable mainnet in `.env`

### Run Smoke Test:

```bash
npm run mainnet:smoke
```

### What It Does:

1. **Checks mainnet is enabled**
2. **Prompts for private key** (not stored)
3. **Verifies balance** (~0.002 ETH needed)
4. **Shows transaction details**
   - From: Your address
   - To: Your address (self)
   - Amount: 0.0001 ETH
5. **Requires checklist confirmation**
6. **Requires final confirmation**
7. **Sends transaction**
8. **Waits for 2+ confirmations**
9. **Verifies success**

### Expected Output:

```
🔥 MAINNET SMOKE TEST

⚠️  WARNING: This will send REAL ETH on MAINNET

✅ Mainnet is ENABLED

💰 Wallet Info:
   Address: 0xYourAddress
   Balance: 0.05 ETH

📋 Transaction Details:
   From: 0xYourAddress
   To: 0xYourAddress (self)
   Amount: 0.0001 ETH
   Network: Mainnet

⛽ Gas Price: 25 Gwei

💸 Estimated Cost:
   Amount: 0.0001 ETH
   Gas: 0.000525 ETH
   Total: 0.000625 ETH

I have completed the prod checklist (yes/no): yes
Proceed with mainnet transaction? (yes/no): yes

📤 Sending transaction...

✅ Transaction sent!
   Hash: 0xabc123...
   Explorer: https://etherscan.io/tx/0xabc123...

⏳ Waiting for 2 confirmations...

✅ Transaction confirmed!
   Block: 18123456
   Status: Success

🎉 SMOKE TEST PASSED!
```

## 📋 Production Checklist

**Location:** `docs/prod-checklist.md`

### Main Sections:

1. **Pre-Deployment Checklist**
   - Code review & testing
   - Security audit
   - Configuration
   - User experience
   - Monitoring & logging
   - Documentation
   - Backup & recovery

2. **Mainnet Smoke Test**
   - Prerequisites
   - Procedure
   - Verification

3. **Final Approval**
   - Technical Lead sign-off
   - Security Lead sign-off
   - Product Owner sign-off

4. **Deployment Steps**
   - Enable mainnet
   - Build production
   - Deploy
   - Monitor

5. **Rollback Plan**
   - Immediate actions
   - Communication
   - Investigation
   - Resolution

## 🧪 Unit Tests

### Test Coverage:

```typescript
describe('Mainnet Guard', () => {
  it('should block mainnet when disabled', () => {
    expect(() => {
      validateMainnetTransaction('mainnet', '0.01', true);
    }).toThrow(MainnetDisabledError);
  });

  it('should block amounts exceeding limit', () => {
    expect(() => {
      validateMainnetTransaction('mainnet', '1.0', true);
    }).toThrow(MainnetAmountExceededError);
  });

  it('should require confirmation', () => {
    expect(() => {
      validateMainnetTransaction('mainnet', '0.01', false);
    }).toThrow(MainnetConfirmationRequiredError);
  });
});
```

### Run Tests:

```bash
npm test src/utils/__tests__/mainnet-guard.test.ts
```

## 🚀 Deployment Process

### 1. Pre-Deployment

```bash
# Complete checklist
cat docs/prod-checklist.md

# Run all tests
npm test
npm run test:anvil
npm run test:sepolia

# Security audit
npm audit
npm run security:check
```

### 2. Enable Mainnet

```bash
# In .env
EXPO_PUBLIC_MAINNET_ENABLED=true
EXPO_PUBLIC_MAINNET_MAX_AMOUNT=0.1
```

### 3. Run Smoke Test

```bash
npm run mainnet:smoke
```

### 4. Deploy

```bash
npm run build:prod
npm run submit:prod
```

### 5. Monitor

- Transaction success rate
- Error rates
- User feedback
- Gas costs

## 🔄 Rollback

If issues occur:

```bash
# 1. Disable mainnet immediately
EXPO_PUBLIC_MAINNET_ENABLED=false

# 2. Deploy hotfix
npm run build:prod
npm run submit:prod

# 3. Investigate
# 4. Fix and re-deploy
```

## 📊 Safety Metrics

### Current Configuration:

| Setting | Value | Status |
|---------|-------|--------|
| Mainnet Enabled | `false` | ✅ Safe |
| Max Amount | `0.1 ETH` | ✅ Safe |
| Require Confirmation | `true` | ✅ Safe |

### Protection Levels:

- **Level 1:** Feature flag (disabled by default)
- **Level 2:** Amount limiter (0.1 ETH max)
- **Level 3:** Confirmation required
- **Level 4:** Validation before send
- **Level 5:** User warnings

## 🎉 Ready for Production!

### Checklist:

- ✅ Mainnet disabled by default
- ✅ Amount limits enforced
- ✅ Confirmation required
- ✅ Smoke test ready
- ✅ Production checklist complete
- ✅ Unit tests passing
- ✅ Documentation complete

### To Enable Mainnet:

1. Complete `docs/prod-checklist.md`
2. Run `npm run mainnet:smoke`
3. Set `EXPO_PUBLIC_MAINNET_ENABLED=true`
4. Deploy to production
5. Monitor closely

---

**Last Updated:** 2025-11-10
**Status:** ✅ Production Ready
**Security Level:** 🔒 Maximum
