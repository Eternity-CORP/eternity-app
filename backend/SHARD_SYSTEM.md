# 💎 Shard System Documentation

## Overview

The Shard System is an off-chain gamification feature that rewards users with "shards" for completing specific actions in the E-Y Wallet. This system includes:

- **One-time onboarding rewards** for first-time actions
- **Daily repeatable rewards** for regular engagement
- **Strict daily limits** to prevent abuse
- **No spending mechanism** (earn-only for now)

## Architecture

### Database Schema

#### `user_shard_states` Table
Stores the current shard state for each user.

| Column | Type | Description |
|--------|------|-------------|
| `userId` | UUID | Primary key, references `users.id` |
| `totalShards` | INT | Total shards earned (minus spent, when implemented) |
| `shardsEarnedToday` | INT | Shards earned from daily quests today |
| `shardsDayStartedAt` | DATE | Date when current daily window started |
| `hasProfileCreationShard` | BOOLEAN | Flag: awarded profile creation shard |
| `hasFirstSendShard` | BOOLEAN | Flag: awarded first send shard |
| `hasFirstReceiveShard` | BOOLEAN | Flag: awarded first receive shard |
| `hasFirstScheduledPaymentShard` | BOOLEAN | Flag: awarded first scheduled payment shard |
| `hasFirstSplitBillShard` | BOOLEAN | Flag: awarded first split bill shard |

#### `shard_transactions` Table
Immutable log of all shard transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | References `users.id` |
| `amount` | INT | Number of shards (positive for earn) |
| `type` | VARCHAR | Transaction type: `"earn"` (spend reserved) |
| `reason` | VARCHAR | Reason enum (see below) |
| `metaJson` | JSONB | Optional metadata about the action |
| `createdAt` | TIMESTAMPTZ | When the transaction occurred |

**Indexes:**
- `idx_shard_tx_user_id` on `userId`
- `idx_shard_tx_created_at` on `createdAt`
- `idx_shard_tx_user_reason` on `(userId, reason)`

### Shard Reasons (Enum)

#### Onboarding Rewards (One-time)
- `ONBOARD_PROFILE_CREATED` - First time creating profile
- `ONBOARD_FIRST_TX_SENT` - First successful token send
- `ONBOARD_FIRST_TX_RECEIVED` - First incoming transaction
- `ONBOARD_FIRST_SCHEDULED_PAYMENT` - First scheduled payment created
- `ONBOARD_FIRST_SPLIT_BILL` - First split bill created

#### Daily Rewards (Repeatable)
- `DAILY_FIRST_SEND` - First token send of the day
- `DAILY_ADVANCED_FEATURE` - First use of advanced feature (scheduled payment or split bill) of the day

## Configuration

Add to `.env`:

```env
# Minimum transaction amount (in ETH) to qualify for shard rewards
MIN_TX_AMOUNT_FOR_SHARD=0.001

# Maximum shards that can be earned per day from repeatable quests
MAX_SHARDS_PER_DAY=3
```

## API Endpoints

### GET `/shards/me`
Get current user's shard state and recent transactions.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "totalShards": 15,
  "shardsEarnedToday": 2,
  "recentTransactions": [
    {
      "id": "uuid",
      "amount": 1,
      "reason": "DAILY_FIRST_SEND",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Integration Points

### 1. User Registration
**Location:** `UserService.registerUser()`

**Trigger:** When a new user is created

**Reward:** +1 shard for `ONBOARD_PROFILE_CREATED`

**Implementation:**
```typescript
if (isNewUser) {
  await shardService.awardShardOnce(
    user.id,
    ShardReason.ONBOARD_PROFILE_CREATED,
    { walletAddress: normalizedAddress }
  );
}
```

### 2. Token Send
**Location:** Your payment processing logic

**Trigger:** When user successfully sends tokens (amount >= MIN_TX_AMOUNT_FOR_SHARD)

**Rewards:**
- +1 shard for `ONBOARD_FIRST_TX_SENT` (one-time)
- +1 shard for `DAILY_FIRST_SEND` (daily, respects limit)

**Implementation:**
```typescript
const { earnedShards } = await shardIntegration.handleTokenSent(
  userId,
  amountInEth,
  { txHash, recipientAddress, network }
);

// Return earnedShards in API response for frontend animation
return { ...response, earnedShards };
```

### 3. Token Receive
**Location:** Webhook handler for incoming transactions

**Trigger:** When user receives tokens (amount >= MIN_TX_AMOUNT_FOR_SHARD)

**Reward:** +1 shard for `ONBOARD_FIRST_TX_RECEIVED` (one-time)

**Implementation:**
```typescript
await shardIntegration.handleTokenReceived(
  userId,
  amountInEth,
  { txHash, senderAddress, network }
);
```

### 4. Scheduled Payment
**Location:** `ScheduledPaymentService.create()`

**Trigger:** When user creates a scheduled payment

**Rewards:**
- +1 shard for `ONBOARD_FIRST_SCHEDULED_PAYMENT` (one-time)
- +1 shard for `DAILY_ADVANCED_FEATURE` (daily, respects limit)

**Implementation:**
```typescript
const { earnedShards } = await shardIntegration.handleScheduledPaymentCreated(
  user.id,
  { scheduledPaymentId, amount, recipientAddress }
);

return { ...savedPayment, earnedShards };
```

### 5. Split Bill
**Location:** `SplitBillService.create()`

**Trigger:** When user creates a split bill

**Rewards:**
- +1 shard for `ONBOARD_FIRST_SPLIT_BILL` (one-time)
- +1 shard for `DAILY_ADVANCED_FEATURE` (daily, respects limit)

**Implementation:**
```typescript
const { earnedShards } = await shardIntegration.handleSplitBillCreated(
  creator.id,
  { splitBillId, totalAmount, participantsCount }
);

return { ...result, earnedShards };
```

## Business Logic

### Onboarding Rewards (One-time)
- **No daily limit** - these can be earned any time
- **Idempotent** - attempting to award twice has no effect
- **Tracked by flags** in `user_shard_states` table

### Daily Rewards (Repeatable)
- **Daily limit enforced** - max `MAX_SHARDS_PER_DAY` per day
- **Per-reason tracking** - can't earn same daily reward twice in one day
- **Automatic reset** - counter resets at midnight (based on `shardsDayStartedAt`)

### Transaction Amount Check
For send/receive rewards, the transaction amount must be >= `MIN_TX_AMOUNT_FOR_SHARD` (default: 0.001 ETH).

This prevents spam with dust transactions.

## Error Handling

**Critical Principle:** Shard system failures must NEVER break main business flows.

All integration points use try-catch blocks:

```typescript
try {
  await shardIntegration.handleTokenSent(userId, amount, meta);
} catch (error) {
  logger.error(`Failed to award shards: ${error.message}`);
  // Continue with main flow - don't throw
}
```

## Database Transactions

All shard awards use database transactions to ensure atomicity:

```typescript
await dataSource.transaction(async (manager) => {
  // 1. Update user_shard_states
  await manager.save(UserShardState, userState);
  
  // 2. Create shard_transaction record
  await manager.save(ShardTransaction, transaction);
});
```

This prevents:
- Inconsistency between state and transaction log
- Race conditions from concurrent awards
- Partial updates on errors

## Testing

Run tests:
```bash
npm test -- shard.service.spec.ts
```

Key test scenarios:
- ✅ One-time rewards only awarded once
- ✅ Daily rewards respect daily limit
- ✅ Daily counter resets on new day
- ✅ Transaction amount eligibility check
- ✅ Concurrent award attempts handled safely

## Migration

Run migration to create tables:

```bash
npm run migration:run
```

This will create:
- `user_shard_states` table
- `shard_transactions` table
- All necessary indexes and foreign keys

## Frontend Integration

### Displaying Shards

Call `GET /shards/me` to show user's total shards and recent activity.

### Reward Animations

When user completes an action, check the `earnedShards` field in the response:

```typescript
const response = await api.post('/split-bill/create', data);

if (response.earnedShards > 0) {
  // Show "+1 Shard!" animation
  showShardAnimation(response.earnedShards);
}
```

### Real-time Updates

Consider polling `/shards/me` or using WebSocket for live shard count updates.

## Future Enhancements

### Spending Shards (Not Implemented)
When ready to implement spending:

1. Add `SPEND` to `ShardTransactionType` enum
2. Create spending reasons (e.g., `SPEND_PREMIUM_FEATURE`)
3. Implement `spendShards()` method with balance checks
4. Update `totalShards` calculation to account for spending

### Additional Rewards
Easy to add new reward types:

1. Add new reason to `ShardReason` enum
2. Optionally add flag to `UserShardState` (for one-time rewards)
3. Call `awardShardOnce()` or `tryAwardDailyShard()` at appropriate integration point

### Leaderboards
Query top users by `totalShards`:

```sql
SELECT user_id, total_shards 
FROM user_shard_states 
ORDER BY total_shards DESC 
LIMIT 100;
```

## Monitoring

### Key Metrics to Track

1. **Daily active shard earners** - users earning shards each day
2. **Average shards per user** - engagement metric
3. **Daily limit hit rate** - % of users hitting max daily shards
4. **Onboarding completion** - % of users earning all onboarding shards

### Logging

All shard awards are logged with emoji for visibility:

```
✨ Awarded onboarding shard to user abc-123 for ONBOARD_PROFILE_CREATED
✨ Awarded daily shard to user abc-123 for DAILY_FIRST_SEND (2/3)
```

## Support

For questions or issues with the shard system, contact the backend team or check:
- Service implementation: `src/modules/shard/shard.service.ts`
- Integration helper: `src/modules/shard/shard-integration.service.ts`
- Tests: `src/modules/shard/shard.service.spec.ts`
