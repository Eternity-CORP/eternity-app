# 🧪 Test Commands for Shard System

## ⚠️ Important Notes

1. **API Prefix:** All endpoints use `/api` prefix
2. **Redis Required:** Make sure Redis is running or configure without it

## 🚀 Start Redis (if needed)

```bash
# macOS with Homebrew
brew services start redis

# Or run manually
redis-server

# Check if running
redis-cli ping
# Should return: PONG
```

## 🔐 Get JWT Token First

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d4Dc462d5c4Ff8C8644bB5f5e62A8D4C0"
  }'

# Or login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d4Dc462d5c4Ff8C8644bB5f5e62A8D4C0"
  }'

# Response will include:
# {
#   "access_token": "eyJhbGc..."
# }

# Save the token
export TOKEN="eyJhbGc..."
```

## ✅ Test Shard Endpoints

### 1. Get User Shard State

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me
```

**Expected Response (new user with profile creation shard):**
```json
{
  "totalShards": 1,
  "shardsEarnedToday": 0,
  "recentTransactions": [
    {
      "id": "uuid",
      "amount": 1,
      "reason": "ONBOARD_PROFILE_CREATED",
      "createdAt": "2025-01-15T..."
    }
  ]
}
```

### 2. Create Split Bill (should award shards)

```bash
curl -X POST http://localhost:3000/api/split-bill/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "1.5",
    "currency": "ETH",
    "mode": "EQUAL",
    "participants": [
      {
        "address": "0x1234567890123456789012345678901234567890",
        "amount": "0.5"
      },
      {
        "address": "0x0987654321098765432109876543210987654321",
        "amount": "0.5"
      },
      {
        "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "amount": "0.5"
      }
    ],
    "message": "Dinner split",
    "emoji": "🍕"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid",
  "totalAmount": "1.5",
  "earnedShards": 2,
  ...
}
```

**Note:** `earnedShards: 2` means:
- +1 for `ONBOARD_FIRST_SPLIT_BILL` (one-time)
- +1 for `DAILY_ADVANCED_FEATURE` (daily)

### 3. Check Shards Again

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me
```

Should now show:
```json
{
  "totalShards": 3,
  "shardsEarnedToday": 1,
  "recentTransactions": [
    {
      "id": "...",
      "amount": 1,
      "reason": "DAILY_ADVANCED_FEATURE",
      "createdAt": "..."
    },
    {
      "id": "...",
      "amount": 1,
      "reason": "ONBOARD_FIRST_SPLIT_BILL",
      "createdAt": "..."
    },
    {
      "id": "...",
      "amount": 1,
      "reason": "ONBOARD_PROFILE_CREATED",
      "createdAt": "..."
    }
  ]
}
```

### 4. Create Scheduled Payment (should award shards)

```bash
curl -X POST http://localhost:3000/api/scheduled-payment/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientAddress": "0x1234567890123456789012345678901234567890",
    "amount": "0.5",
    "currency": "ETH",
    "scheduledFor": "2025-12-31T23:59:59Z",
    "message": "New Year payment",
    "emoji": "🎉"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid",
  "earnedShards": 1,
  ...
}
```

**Note:** Only +1 shard because:
- +1 for `ONBOARD_FIRST_SCHEDULED_PAYMENT` (one-time)
- +0 for `DAILY_ADVANCED_FEATURE` (already earned today from split bill)

### 5. Test Daily Limit

Create 3 more split bills or scheduled payments in the same day:

```bash
# 2nd split bill - should earn +1 (daily limit not reached)
curl -X POST http://localhost:3000/api/split-bill/create ...

# 3rd split bill - should earn +1 (daily limit not reached)
curl -X POST http://localhost:3000/api/split-bill/create ...

# 4th split bill - should earn +0 (daily limit reached: 3/3)
curl -X POST http://localhost:3000/api/split-bill/create ...
```

Check shards:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me
```

Should show:
```json
{
  "totalShards": 7,
  "shardsEarnedToday": 3,
  ...
}
```

## 🗄️ Database Queries

### Check User Shard State

```sql
SELECT 
  u."walletAddress",
  uss."totalShards",
  uss."shardsEarnedToday",
  uss."shardsDayStartedAt",
  uss."hasProfileCreationShard",
  uss."hasFirstSendShard",
  uss."hasFirstReceiveShard",
  uss."hasFirstScheduledPaymentShard",
  uss."hasFirstSplitBillShard"
FROM user_shard_states uss
JOIN users u ON u.id = uss."userId"
LIMIT 10;
```

### Check Recent Transactions

```sql
SELECT 
  u."walletAddress",
  st.amount,
  st.reason,
  st."createdAt"
FROM shard_transactions st
JOIN users u ON u.id = st."userId"
ORDER BY st."createdAt" DESC
LIMIT 20;
```

### Check Daily Limit Status

```sql
SELECT 
  u."walletAddress",
  uss."shardsEarnedToday",
  uss."shardsDayStartedAt",
  CASE 
    WHEN uss."shardsEarnedToday" >= 3 THEN 'LIMIT REACHED'
    ELSE 'CAN EARN MORE'
  END as status
FROM user_shard_states uss
JOIN users u ON u.id = uss."userId"
WHERE uss."shardsDayStartedAt" = CURRENT_DATE;
```

## 🐛 Troubleshooting

### Redis Connection Error

If you see:
```
[ioredis] Unhandled error event: AggregateError [ECONNREFUSED]
```

**Solution 1:** Start Redis
```bash
brew services start redis
```

**Solution 2:** Update `.env` to use different Redis URL
```env
REDIS_URL=redis://localhost:6379
```

**Solution 3:** Temporarily disable Redis (not recommended for production)

### 404 Not Found

Make sure to use `/api` prefix:
- ❌ `http://localhost:3000/shards/me`
- ✅ `http://localhost:3000/api/shards/me`

### Unauthorized

Make sure you:
1. Have a valid JWT token
2. Include it in Authorization header
3. Token hasn't expired

### No Shards Awarded

Check logs for errors:
```bash
# Look for shard-related logs
grep -i "shard" logs/app.log

# Or check console output
```

Common issues:
- Transaction amount too small (< 0.001 ETH)
- Daily limit reached (3 shards/day)
- Already earned that specific reward

## 📊 Expected Shard Progression

For a new user:

1. **Register** → `totalShards: 1` (profile creation)
2. **First split bill** → `totalShards: 3` (+2: onboarding + daily)
3. **First scheduled payment** → `totalShards: 4` (+1: onboarding only)
4. **Second split bill** → `totalShards: 5` (+1: daily)
5. **Third split bill** → `totalShards: 6` (+1: daily)
6. **Fourth split bill** → `totalShards: 6` (+0: daily limit reached)

**Next day:**
- Daily counter resets to 0
- Can earn up to 3 more daily shards

---

**Happy Testing!** 🎉
