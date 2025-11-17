#!/bin/bash

# 🚀 Quick Test Script for Shard System
# Run this after starting the server with: npm run start:dev

echo "🧪 Testing Shard System..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate random wallet address
WALLET="0x$(openssl rand -hex 20)"
echo -e "${BLUE}📝 Using wallet: $WALLET${NC}"
echo ""

# 1. Register user
echo -e "${YELLOW}1️⃣  Registering user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\"}")

echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# 2. Login
echo -e "${YELLOW}2️⃣  Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
echo "Token: ${TOKEN:0:50}..."
echo ""

# 3. Check shards (should have 1 from profile creation)
echo -e "${YELLOW}3️⃣  Checking initial shards...${NC}"
SHARDS_1=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me)

echo "$SHARDS_1" | jq '.'
TOTAL_1=$(echo "$SHARDS_1" | jq -r '.totalShards')
echo -e "${GREEN}✅ Total shards: $TOTAL_1 (expected: 1)${NC}"
echo ""

# 4. Create split bill (should award +2 shards)
echo -e "${YELLOW}4️⃣  Creating split bill...${NC}"
SPLIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/split-bills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "1.5",
    "currency": "ETH",
    "mode": "EQUAL",
    "participants": [
      {"address": "0x1234567890123456789012345678901234567890", "amount": "0.5"},
      {"address": "0x0987654321098765432109876543210987654321", "amount": "0.5"},
      {"address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "amount": "0.5"}
    ],
    "message": "Test split",
    "emoji": "🍕"
  }')

echo "$SPLIT_RESPONSE" | jq '.'
echo ""

# 5. Check shards again (should have 3 total)
echo -e "${YELLOW}5️⃣  Checking shards after split bill...${NC}"
SHARDS_2=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me)

echo "$SHARDS_2" | jq '.'
TOTAL_2=$(echo "$SHARDS_2" | jq -r '.totalShards')
DAILY=$(echo "$SHARDS_2" | jq -r '.shardsEarnedToday')
echo -e "${GREEN}✅ Total shards: $TOTAL_2 (expected: 3)${NC}"
echo -e "${GREEN}✅ Daily shards: $DAILY (expected: 1)${NC}"
echo ""

# 6. Create scheduled payment (should award +1 shard)
echo -e "${YELLOW}6️⃣  Creating scheduled payment...${NC}"
SCHEDULED_RESPONSE=$(curl -s -X POST http://localhost:3000/api/scheduled-payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientAddress": "0x1234567890123456789012345678901234567890",
    "amount": "0.5",
    "currency": "ETH",
    "scheduledFor": "2025-12-31T23:59:59Z",
    "message": "Test payment",
    "emoji": "💰"
  }')

echo "$SCHEDULED_RESPONSE" | jq '.'
echo ""

# 7. Final shard check (should have 4 total)
echo -e "${YELLOW}7️⃣  Final shard check...${NC}"
SHARDS_3=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me)

echo "$SHARDS_3" | jq '.'
TOTAL_3=$(echo "$SHARDS_3" | jq -r '.totalShards')
DAILY_3=$(echo "$SHARDS_3" | jq -r '.shardsEarnedToday')
echo -e "${GREEN}✅ Total shards: $TOTAL_3 (expected: 4)${NC}"
echo -e "${GREEN}✅ Daily shards: $DAILY_3 (expected: 1)${NC}"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Test Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Shard Progression:"
echo "  1. Profile creation:    +1 shard  → Total: 1"
echo "  2. First split bill:    +2 shards → Total: 3"
echo "  3. First scheduled pay: +1 shard  → Total: 4"
echo ""
echo "Daily shards earned: $DAILY_3 / 3"
echo ""
echo -e "${BLUE}📊 View recent transactions:${NC}"
echo "$SHARDS_3" | jq '.recentTransactions'
echo ""
