# 🚀 Shard System Setup Guide

## Quick Start

### 1. Environment Configuration

Add to your `.env` file:

```env
# Shard System Configuration
MIN_TX_AMOUNT_FOR_SHARD=0.001
MAX_SHARDS_PER_DAY=3
```

### 2. Run Database Migration

```bash
npm run migration:run
```

This creates:
- ✅ `user_shard_states` table
- ✅ `shard_transactions` table  
- ✅ All indexes and foreign keys

### 3. Verify Installation

Start the server:

```bash
npm run start:dev
```

Check the logs for:
```
✅ ShardModule initialized
✅ ShardService ready (maxShardsPerDay: 3, minTxAmount: 0.001)
```

### 4. Test the API

Get shard state for authenticated user:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/shards/me
```

Expected response:
```json
{
  "totalShards": 0,
  "shardsEarnedToday": 0,
  "recentTransactions": []
}
```

## Integration Checklist

### ✅ Already Integrated

The following modules are already integrated with the shard system:

- [x] **UserService** - Awards shard on profile creation
- [x] **SplitBillService** - Awards shards on split bill creation
- [x] **ScheduledPaymentService** - Awards shards on scheduled payment creation

### 🔧 Manual Integration Required

You need to integrate shards into your payment/transaction processing:

#### For Token Send Transactions

In your payment processing code, add:

```typescript
import { ShardIntegrationService } from '../shard/shard-integration.service';

// Inject in constructor
constructor(
  private readonly shardIntegration: ShardIntegrationService,
) {}

// After successful token send
async processSend(userId: string, amountInEth: string, txData: any) {
  // ... your existing send logic ...
  
  // Award shards (safe - won't break on error)
  try {
    const { earnedShards } = await this.shardIntegration.handleTokenSent(
      userId,
      amountInEth,
      {
        txHash: txData.hash,
        recipientAddress: txData.to,
        network: txData.network,
      }
    );
    
    // Return earnedShards to frontend for animation
    return { ...result, earnedShards };
  } catch (error) {
    // Log but don't fail the transaction
    this.logger.error(`Shard award failed: ${error.message}`);
    return result;
  }
}
```

#### For Token Receive (Webhooks)

In your webhook handler for incoming transactions:

```typescript
import { ShardIntegrationService } from '../shard/shard-integration.service';

async handleIncomingTransaction(webhookData: any) {
  // ... your existing webhook logic ...
  
  // Find user by wallet address
  const user = await this.userService.findByWalletAddress(recipientAddress);
  
  if (user) {
    // Award receive shard
    await this.shardIntegration.handleTokenReceived(
      user.id,
      amountInEth,
      {
        txHash: webhookData.hash,
        senderAddress: webhookData.from,
        network: webhookData.network,
      }
    );
  }
}
```

## Testing Shard Awards

### Test Profile Creation Shard

1. Register a new user
2. Check `/shards/me` - should show `totalShards: 1`
3. Check recent transactions - should show `ONBOARD_PROFILE_CREATED`

### Test First Send Shard

1. Send tokens (amount >= 0.001 ETH)
2. Check response - should include `earnedShards: 1` or `earnedShards: 2`
3. Check `/shards/me` - should show increased `totalShards`

### Test Daily Limit

1. Perform 3 daily actions (sends, scheduled payments, split bills)
2. Check `/shards/me` - should show `shardsEarnedToday: 3`
3. Try 4th daily action - should NOT earn more shards
4. Wait until next day - counter should reset

### Test First Receive Shard

1. Have another wallet send you tokens (amount >= 0.001 ETH)
2. Webhook processes the transaction
3. Check `/shards/me` - should show `ONBOARD_FIRST_TX_RECEIVED`

## Database Queries

### Check User Shard State

```sql
SELECT * FROM user_shard_states WHERE "userId" = 'USER_UUID';
```

### View Recent Shard Transactions

```sql
SELECT * FROM shard_transactions 
WHERE "userId" = 'USER_UUID' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Find Users Who Hit Daily Limit

```sql
SELECT "userId", "shardsEarnedToday", "totalShards"
FROM user_shard_states
WHERE "shardsEarnedToday" >= 3
AND "shardsDayStartedAt" = CURRENT_DATE;
```

### Top Shard Earners

```sql
SELECT u."walletAddress", uss."totalShards"
FROM user_shard_states uss
JOIN users u ON u.id = uss."userId"
ORDER BY uss."totalShards" DESC
LIMIT 10;
```

## Troubleshooting

### Shards Not Being Awarded

**Check 1:** Verify migration ran successfully
```bash
npm run migration:run
```

**Check 2:** Check logs for errors
```bash
# Look for shard-related errors
grep -i "shard" logs/app.log
```

**Check 3:** Verify configuration
```typescript
// In your code, log the config
console.log('Shard config:', {
  maxPerDay: configService.get('shards.maxShardsPerDay'),
  minAmount: configService.get('shards.minTxAmountForShard'),
});
```

**Check 4:** Ensure ShardModule is imported
```typescript
// In app.module.ts
imports: [
  // ...
  ShardModule, // Must be present
]
```

### Transaction Amount Too Small

If sends aren't earning shards, check the amount:

```typescript
const minAmount = 0.001; // ETH
if (parseFloat(amountInEth) < minAmount) {
  console.log('Amount too small for shard reward');
}
```

### Daily Limit Issues

If daily rewards aren't resetting:

```sql
-- Check the shardsDayStartedAt value
SELECT "userId", "shardsDayStartedAt", "shardsEarnedToday"
FROM user_shard_states;

-- Manual reset if needed (for testing)
UPDATE user_shard_states 
SET "shardsEarnedToday" = 0, 
    "shardsDayStartedAt" = CURRENT_DATE
WHERE "userId" = 'USER_UUID';
```

### Duplicate Shard Awards

If you see duplicate awards, check:

1. **Database transaction isolation** - ensure using transactions
2. **Idempotency** - onboarding shards should only award once
3. **Race conditions** - concurrent requests should be handled safely

## Performance Considerations

### Indexes

The migration creates these indexes for optimal performance:

- `idx_shard_tx_user_id` - Fast user transaction lookups
- `idx_shard_tx_created_at` - Fast time-based queries
- `idx_shard_tx_user_reason` - Fast duplicate detection

### Caching (Optional)

For high-traffic apps, consider caching shard states:

```typescript
// Example with Redis
const cacheKey = `shard:state:${userId}`;
let state = await redis.get(cacheKey);

if (!state) {
  state = await shardService.getUserShardState(userId);
  await redis.set(cacheKey, JSON.stringify(state), 'EX', 300); // 5 min
}
```

## Monitoring

### Key Metrics

Track these metrics in your monitoring system:

```typescript
// Daily active shard earners
SELECT COUNT(DISTINCT "userId") 
FROM shard_transactions 
WHERE "createdAt" >= CURRENT_DATE;

// Average shards per user
SELECT AVG("totalShards") 
FROM user_shard_states;

// Onboarding completion rate
SELECT 
  COUNT(*) FILTER (WHERE "hasProfileCreationShard" = true) * 100.0 / COUNT(*) as profile_pct,
  COUNT(*) FILTER (WHERE "hasFirstSendShard" = true) * 100.0 / COUNT(*) as send_pct,
  COUNT(*) FILTER (WHERE "hasFirstReceiveShard" = true) * 100.0 / COUNT(*) as receive_pct
FROM user_shard_states;
```

### Alerts

Set up alerts for:

- ⚠️ Shard service errors > 1% of requests
- ⚠️ Daily limit hit rate > 50% of active users
- ⚠️ Shard transaction creation failures

## Rollback

If you need to rollback the shard system:

```bash
npm run migration:revert
```

This will:
- Drop `shard_transactions` table
- Drop `user_shard_states` table
- Remove all indexes

**Note:** This will delete all shard data permanently!

## Next Steps

1. ✅ Complete manual integration for send/receive transactions
2. ✅ Test all reward scenarios
3. ✅ Set up monitoring and alerts
4. ✅ Deploy to staging environment
5. ✅ Test with real users
6. ✅ Deploy to production

## Support

For issues or questions:
- Check logs: `logs/app.log`
- Review code: `src/modules/shard/`
- Read docs: `SHARD_SYSTEM.md`
- Contact backend team

---

**Status:** ✅ Core system implemented and ready for integration testing
**Version:** 1.0.0
**Last Updated:** 2025-01-15
