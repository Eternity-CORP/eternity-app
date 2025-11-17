# 🚀 Quick Start - Shard System

## ✅ Completed Steps

1. ✅ **Migration executed successfully**
   - Tables created: `user_shard_states`, `shard_transactions`
   - Indexes created
   - Foreign keys configured

2. ✅ **Dependencies installed**
   - `@nestjs/testing` added for tests

## 🎯 Next Steps

### 1. Add Environment Variables

Edit `.env` file:

```env
# Add these lines
MIN_TX_AMOUNT_FOR_SHARD=0.001
MAX_SHARDS_PER_DAY=3
```

### 2. Start the Server

```bash
npm run start:dev
```

Expected output:
```
✅ ShardModule initialized
✅ Server listening on port 3000
```

### 3. Test the API

```bash
# Get JWT token first (login)
TOKEN="your-jwt-token"

# Test shard endpoint
curl -H "Authorization: Bearer $TOKEN" \
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

### 4. Test Shard Awards

#### Create a new user (should award +1 shard)
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234..."}'
```

#### Check shards
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/shards/me
```

Should show:
```json
{
  "totalShards": 1,
  "shardsEarnedToday": 0,
  "recentTransactions": [
    {
      "id": "...",
      "amount": 1,
      "reason": "ONBOARD_PROFILE_CREATED",
      "createdAt": "..."
    }
  ]
}
```

## 🔧 Manual Integration Required

### For Token Send/Receive

Add to your payment processing code:

```typescript
import { ShardIntegrationService } from './modules/shard/shard-integration.service';

// In your service
constructor(
  private readonly shardIntegration: ShardIntegrationService,
) {}

// After successful send
const { earnedShards } = await this.shardIntegration.handleTokenSent(
  userId,
  amountInEth,
  { txHash, recipientAddress, network }
);

return { ...response, earnedShards };
```

See `SHARD_SYSTEM_SETUP.md` for detailed instructions.

## 📊 Database Verification

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%shard%';

-- Should show:
-- user_shard_states
-- shard_transactions

-- Check a user's shard state
SELECT * FROM user_shard_states LIMIT 5;

-- Check recent transactions
SELECT * FROM shard_transactions 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## 🧪 Run Tests

```bash
npm test -- shard.service.spec.ts
```

## 📚 Documentation

- **Full docs:** `SHARD_SYSTEM.md`
- **Setup guide:** `SHARD_SYSTEM_SETUP.md`
- **Summary:** `SHARD_IMPLEMENTATION_SUMMARY.md`

## ✅ Status

- [x] Migration completed
- [x] Dependencies installed
- [x] Code compiled successfully
- [ ] Environment variables configured
- [ ] Server tested
- [ ] API tested
- [ ] Manual integration completed

---

**Ready to go!** 🎉
