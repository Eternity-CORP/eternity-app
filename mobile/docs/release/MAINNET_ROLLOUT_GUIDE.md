# 🚀 Mainnet Rollout Guide

Complete guide for safe mainnet deployment of scheduled payments and split bills.

## 📋 Overview

This guide covers the safe rollout process for enabling new features on Ethereum mainnet using feature flags and smoke tests.

**Features:**
- ✅ Scheduled Payments (one-time & recurring)
- ✅ Split Bills (payment & collection)

**Safety Mechanisms:**
- 🔴 Kill-switch via feature flags
- 🧪 Manual smoke tests
- 📊 Comprehensive monitoring
- 🔄 Quick rollback capability

## 🎯 Rollout Strategy

### Phase 1: Pre-Release (Testnet Only)

**Status:** Features available on testnet only

**Flags:**
```env
SCHEDULE_MAINNET_ENABLED=false  # 🔴 DISABLED
SPLIT_MAINNET_ENABLED=false     # 🔴 DISABLED
```

**Activities:**
- Run all integration tests on Sepolia
- Collect user feedback from testnet
- Monitor error rates and gas costs
- Fix any issues found

### Phase 2: Smoke Testing (Mainnet Validation)

**Status:** Manual smoke tests on mainnet

**Prerequisites:**
- All testnet tests passing
- Code review completed
- Security review completed
- Team ready for monitoring

**Smoke Tests:**
1. **Schedule Payment Smoke Test**
   ```bash
   cd mobile/scripts/mainnet
   npx ts-node schedule-smoke.ts
   ```
   - Sends 0.0001 ETH to own address
   - Requires manual confirmation
   - Must pass twice

2. **Split Bill Smoke Test**
   ```bash
   cd mobile/scripts/mainnet
   npx ts-node split-smoke.ts
   ```
   - Sends 0.00005 ETH to 2 recipients
   - Requires manual confirmation
   - Must pass twice

### Phase 3: Mainnet Launch (Gradual Rollout)

**Status:** Features enabled on mainnet

**Flags:**
```env
SCHEDULE_MAINNET_ENABLED=true   # ✅ ENABLED
SPLIT_MAINNET_ENABLED=true      # ✅ ENABLED
```

**Rollout Steps:**
1. Enable for internal users (24h monitoring)
2. Enable for beta users (48h monitoring)
3. Enable for all users (ongoing monitoring)

### Phase 4: Monitoring & Optimization

**Status:** Production monitoring

**Activities:**
- Monitor transaction success rates
- Track gas costs and optimize
- Collect user feedback
- Iterate on UX improvements

## 🔧 Feature Flags

### Configuration

**File:** `src/config/featureFlags.ts`

```typescript
const DEFAULT_FLAGS = {
  scheduleTestnetEnabled: true,   // Always enabled on testnet
  scheduleMainnetEnabled: false,  // 🔴 KILL SWITCH
  splitTestnetEnabled: true,      // Always enabled on testnet
  splitMainnetEnabled: false,     // 🔴 KILL SWITCH
};
```

### Environment Variables

```env
# Override defaults via environment
SCHEDULE_MAINNET_ENABLED=true
SPLIT_MAINNET_ENABLED=true
```

### Usage in Code

```typescript
import { canUseScheduledPayments, canUseSplitBills } from '@/config/featureFlags';

// Check if feature is available
if (!canUseScheduledPayments(chainId)) {
  // Show disabled banner
  return <FeatureDisabledBanner reason="Not available on mainnet yet" />;
}

// Or assert and throw error
assertScheduleEnabled(chainId); // Throws if disabled
```

### Kill-Switch Activation

**Emergency disable:**
```bash
# Update environment variable
export SCHEDULE_MAINNET_ENABLED=false
export SPLIT_MAINNET_ENABLED=false

# Redeploy or restart app
# Features immediately disabled
```

## 🧪 Smoke Tests

### Setup

1. **Create dedicated test wallet**
   ```bash
   # Generate new wallet (never used before)
   # Fund with minimal ETH (0.01 ETH)
   ```

2. **Configure environment**
   ```bash
   cd mobile/scripts/mainnet
   cp .env.example .env
   nano .env
   ```

3. **Set variables**
   ```env
   MAINNET_PRIVKEY=0x...           # Dedicated test wallet
   SPLIT_RECIPIENT_1=0x...         # Your other wallet
   SPLIT_RECIPIENT_2=0x...         # Your other wallet
   MAINNET_RPC_URL=https://...     # Mainnet RPC
   ```

### Schedule Payment Smoke Test

**Purpose:** Verify scheduled payment works on mainnet

**What it does:**
- Sends 0.0001 ETH to own address (safe)
- Waits for 1 confirmation
- Logs transaction hash and gas cost

**How to run:**
```bash
npx ts-node scripts/mainnet/schedule-smoke.ts
```

**Expected output:**
```
🔥 MAINNET SMOKE TEST: Scheduled Payment

📍 Step 1: Validate configuration
   ✅ Configuration validated

📍 Step 2: Connect to mainnet
   Wallet: 0x742d...
   ✅ Connected to mainnet (chain ID: 1)

📍 Step 3: Check balance
   Balance: 0.01 ETH
   ✅ Sufficient balance

📍 Step 6: Manual confirmation
   ⚠️  Type "YES" to proceed: YES

📍 Step 7: Execute scheduled payment
   📤 Transaction sent!
   Hash: 0xabc123...
   Explorer: https://etherscan.io/tx/0xabc123...

📍 Step 8: Wait for confirmation
   ✅ Transaction confirmed!
   Block: 18234567
   Gas Used: 21000
   Gas Cost: 0.000052 ETH

✅ SMOKE TEST PASSED
```

**Success criteria:**
- ✅ Transaction confirmed
- ✅ Status: Success (not reverted)
- ✅ Gas cost reasonable (< 0.001 ETH)
- ✅ Amount received correctly

### Split Bill Smoke Test

**Purpose:** Verify split bill works on mainnet

**What it does:**
- Sends 0.00005 ETH to 2 recipients
- Waits for 1 confirmation each
- Logs all transaction hashes and costs

**How to run:**
```bash
npx ts-node scripts/mainnet/split-smoke.ts
```

**Expected output:**
```
🔥 MAINNET SMOKE TEST: Split Bill Payment

📍 Step 7: Execute split payments
   Payment 1/2 to Recipient 1:
   📤 Transaction sent: 0xdef456...
   
   Payment 2/2 to Recipient 2:
   📤 Transaction sent: 0xghi789...

📍 Step 8: Wait for confirmations
   ✅ Confirmed in block 18234568
   ✅ Confirmed in block 18234569

✅ SMOKE TEST PASSED

📊 Summary:
   Recipients: 2
   Amount per recipient: 0.00005 ETH
   Total amount sent: 0.0001 ETH
   Total gas cost: 0.000104 ETH
   
   Transactions:
   1. https://etherscan.io/tx/0xdef456...
   2. https://etherscan.io/tx/0xghi789...
```

**Success criteria:**
- ✅ Both transactions confirmed
- ✅ No nonce conflicts
- ✅ Gas costs reasonable
- ✅ Recipients received funds

### Smoke Test Checklist

Before enabling mainnet:
- [ ] Schedule smoke test passed (Run 1)
- [ ] Schedule smoke test passed (Run 2)
- [ ] Split smoke test passed (Run 1)
- [ ] Split smoke test passed (Run 2)
- [ ] All transaction hashes logged
- [ ] Gas costs within expected range
- [ ] No errors or warnings

## 🎨 UI Integration

### Feature Disabled Banner

When feature is disabled on mainnet:

```typescript
import { FeatureDisabledBanner } from '@/components/FeatureDisabledBanner';
import { getScheduleDisabledReason } from '@/config/featureFlags';

function SchedulePaymentScreen() {
  const { chainId } = useWallet();
  const disabledReason = getScheduleDisabledReason(chainId);
  
  if (disabledReason) {
    return (
      <FeatureDisabledBanner
        reason={disabledReason}
        actionLabel="Switch to Testnet"
        onAction={() => switchNetwork(11155111)}
        variant="warning"
      />
    );
  }
  
  // Feature available, show normal UI
  return <SchedulePaymentForm />;
}
```

### Inline Disabled Message

For compact display:

```typescript
import { FeatureDisabledInline } from '@/components/FeatureDisabledBanner';

{!canUseScheduledPayments(chainId) && (
  <FeatureDisabledInline
    reason="Not available on mainnet yet"
  />
)}
```

## 📊 Monitoring

### Metrics to Track

**Transaction Metrics:**
- Success rate (target: > 95%)
- Average gas cost
- Confirmation time
- Error rate by type

**Usage Metrics:**
- Daily active users
- Transactions per day
- Feature adoption rate
- User retention

**Performance Metrics:**
- API response time
- RPC latency
- UI render time
- Error recovery time

### Alerting

**Critical Alerts:**
- Transaction failure rate > 5%
- Gas cost > 2x expected
- RPC errors > 10/minute
- Feature flag disabled unexpectedly

**Warning Alerts:**
- Transaction failure rate > 2%
- Gas cost > 1.5x expected
- Slow confirmations (> 5 minutes)
- High error rate on specific feature

### Logging

**Required Logs:**
```typescript
// Transaction sent
console.log('TX sent', {
  hash: tx.hash,
  from: tx.from,
  to: tx.to,
  value: tx.value,
  chainId,
  feature: 'schedule',
});

// Transaction confirmed
console.log('TX confirmed', {
  hash: receipt.transactionHash,
  block: receipt.blockNumber,
  gasUsed: receipt.gasUsed,
  status: receipt.status,
});

// Feature flag check
console.log('Feature check', {
  feature: 'schedule',
  chainId,
  allowed: canUseScheduledPayments(chainId),
});
```

## 🔄 Rollback Procedure

### When to Rollback

Rollback immediately if:
- Transaction failure rate > 5%
- Critical security issue discovered
- User funds at risk
- Excessive errors in production

### How to Rollback

1. **Disable features**
   ```bash
   export SCHEDULE_MAINNET_ENABLED=false
   export SPLIT_MAINNET_ENABLED=false
   ```

2. **Notify team**
   - Post in incident channel
   - Update status page
   - Notify users if needed

3. **Investigate**
   - Review error logs
   - Check transaction history
   - Identify root cause

4. **Fix and re-test**
   - Apply fix
   - Run smoke tests again
   - Get approval to re-enable

## ✅ Release Checklist

Use the comprehensive checklist:
- 📄 `docs/release/schedule-split-checklist.md`

Key items:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security review completed
- [ ] Smoke tests passed (2x each)
- [ ] Kill-switch tested
- [ ] Monitoring configured
- [ ] Team ready
- [ ] Rollback plan understood

## 📚 Additional Resources

**Documentation:**
- [Feature Flags](../config/featureFlags.ts)
- [Smoke Tests](../../scripts/mainnet/)
- [Release Checklist](./schedule-split-checklist.md)

**Testing:**
- [Sepolia E2E Tests](../../scripts/sepolia/)
- [Unit Tests](../../src/config/__tests__/featureFlags.test.ts)

**Monitoring:**
- Etherscan: https://etherscan.io/
- Gas Tracker: https://etherscan.io/gastracker

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-12  
**Status:** ✅ Ready for Mainnet Rollout
