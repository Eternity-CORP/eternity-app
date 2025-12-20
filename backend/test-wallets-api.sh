#!/bin/bash

# Test script to verify wallets and token preferences API returns id field

BASE_URL="http://localhost:3000/api"

echo "=== Step 1: Login to get fresh token ==="
LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890","deviceToken":"test-device-token-123"}' \
  -s)

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response:"
  echo $LOGIN_RESPONSE | python3 -m json.tool
  exit 1
fi

echo "✓ Got token: ${TOKEN:0:20}..."
echo ""

echo "=== Step 2: GET Wallets (check for id field) ==="
curl -X GET "$BASE_URL/identity/wallets" \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo ""
echo "=== Step 3: GET Token Preferences (check for id field) ==="
curl -X GET "$BASE_URL/identity/token-preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo ""
echo "=== Test Complete ==="
