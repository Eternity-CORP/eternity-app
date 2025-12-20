#!/bin/bash

# Test script for Wallet and Token Preference CRUD operations
# Usage: ./test-wallet-token-crud.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use the token from environment or default
TOKEN="${TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZWZhNTJiZS1hYmEzLTQzMTctYTBiMy1hMTBmMThhMjhiOTciLCJ3YWxsZXRBZGRyZXNzIjoiMHgxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwIiwiaWF0IjoxNzYzOTA3MDI4LCJleHAiOjE3NjQ1MTE4Mjh9.B7KyG0pPY0hUzqhUdekBESBbNoAuwD19Y79b5v1dxy0}"
BASE_URL="http://localhost:3000/api"

echo -e "${GREEN}=== Testing Wallet and Token Preference CRUD ===${NC}\n"

# Test 1: Add wallets for different networks
echo -e "${YELLOW}1. Adding wallets for different networks${NC}"
echo "POST $BASE_URL/identity/wallets (Sepolia)"
WALLET1=$(curl -X POST $BASE_URL/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chainId":"sepolia","address":"0xaabbccddee1122334455667788990011223344aa","isPrimary":true,"label":"My Sepolia Wallet"}' \
  -s)
echo "$WALLET1" | python3 -m json.tool
WALLET1_ID=$(echo "$WALLET1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo -e "\nPOST $BASE_URL/identity/wallets (Polygon)"
WALLET2=$(curl -X POST $BASE_URL/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chainId":"polygon","address":"0xbbccddee11223344556677889900112233445566","isPrimary":true,"label":"My Polygon Wallet"}' \
  -s)
echo "$WALLET2" | python3 -m json.tool
WALLET2_ID=$(echo "$WALLET2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

# Test 2: Try adding same address to different network (should fail)
echo -e "\n${YELLOW}2. Testing validation: same address cannot be on multiple networks${NC}"
echo "POST $BASE_URL/identity/wallets (Ethereum with same address as Sepolia)"
RESULT=$(curl -X POST $BASE_URL/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chainId":"ethereum","address":"0xaabbccddee1122334455667788990011223344aa","isPrimary":false,"label":"Should fail"}' \
  -s)
echo "$RESULT" | python3 -m json.tool
if echo "$RESULT" | grep -q "already assigned"; then
  echo -e "${GREEN}✓ Validation working: Address already assigned error${NC}"
else
  echo -e "${RED}✗ Validation failed: Should have prevented duplicate address${NC}"
fi

# Test 3: Update wallet
echo -e "\n${YELLOW}3. Updating wallet address${NC}"
echo "PUT $BASE_URL/identity/wallets/$WALLET1_ID"
UPDATED_WALLET=$(curl -X PUT "$BASE_URL/identity/wallets/$WALLET1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Updated Sepolia Wallet","address":"0xccddee112233445566778899001122334455667788"}' \
  -s)
echo "$UPDATED_WALLET" | python3 -m json.tool

# Test 4: Get all wallets
echo -e "\n${YELLOW}4. Getting all wallets${NC}"
echo "GET $BASE_URL/identity/wallets"
curl -X GET $BASE_URL/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

# Test 5: Add token preferences
echo -e "\n${YELLOW}5. Adding token preferences${NC}"
echo "POST $BASE_URL/identity/token-preferences (ETH -> Sepolia)"
TOKEN_PREF1=$(curl -X POST $BASE_URL/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol":"ETH","preferredChainId":"sepolia"}' \
  -s)
echo "$TOKEN_PREF1" | python3 -m json.tool
TOKEN_PREF1_ID=$(echo "$TOKEN_PREF1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo -e "\nPOST $BASE_URL/identity/token-preferences (USDC -> Polygon)"
TOKEN_PREF2=$(curl -X POST $BASE_URL/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol":"USDC","preferredChainId":"polygon"}' \
  -s)
echo "$TOKEN_PREF2" | python3 -m json.tool
TOKEN_PREF2_ID=$(echo "$TOKEN_PREF2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

# Test 6: Try adding same token to different network (should update, not create new)
echo -e "\n${YELLOW}6. Testing upsert: updating same token preference${NC}"
echo "POST $BASE_URL/identity/token-preferences (ETH -> Ethereum)"
UPDATED_PREF=$(curl -X POST $BASE_URL/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol":"ETH","preferredChainId":"ethereum"}' \
  -s)
echo "$UPDATED_PREF" | python3 -m json.tool
if echo "$UPDATED_PREF" | grep -q "ethereum"; then
  echo -e "${GREEN}✓ Upsert working: Token preference updated${NC}"
else
  echo -e "${RED}✗ Upsert failed${NC}"
fi

# Test 7: Update token preference using PUT
echo -e "\n${YELLOW}7. Updating token preference with PUT${NC}"
echo "PUT $BASE_URL/identity/token-preferences/$TOKEN_PREF2_ID"
UPDATED_TOKEN_PREF=$(curl -X PUT "$BASE_URL/identity/token-preferences/$TOKEN_PREF2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preferredChainId":"arbitrum"}' \
  -s)
echo "$UPDATED_TOKEN_PREF" | python3 -m json.tool

# Test 8: Get all token preferences
echo -e "\n${YELLOW}8. Getting all token preferences${NC}"
echo "GET $BASE_URL/identity/token-preferences"
curl -X GET $BASE_URL/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

# Test 9: Test resolve identifier with wallets and preferences
echo -e "\n${YELLOW}9. Testing resolve identifier (should include wallets and token preferences)${NC}"
echo "GET $BASE_URL/identity/resolve/EY-8EFA52BE"
curl -X GET "$BASE_URL/identity/resolve/EY-8EFA52BE" \
  -s | python3 -m json.tool

# Test 10: Delete wallet
echo -e "\n${YELLOW}10. Deleting wallet${NC}"
echo "DELETE $BASE_URL/identity/wallets/$WALLET2_ID"
curl -X DELETE "$BASE_URL/identity/wallets/$WALLET2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

# Test 11: Delete token preference
echo -e "\n${YELLOW}11. Deleting token preference${NC}"
echo "DELETE $BASE_URL/identity/token-preferences/$TOKEN_PREF1_ID"
curl -X DELETE "$BASE_URL/identity/token-preferences/$TOKEN_PREF1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

# Test 12: Final state
echo -e "\n${YELLOW}12. Final state check${NC}"
echo "GET $BASE_URL/identity/wallets"
curl -X GET $BASE_URL/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo -e "\nGET $BASE_URL/identity/token-preferences"
curl -X GET $BASE_URL/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo -e "\n${GREEN}=== Tests completed ===${NC}"
