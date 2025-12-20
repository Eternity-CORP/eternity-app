#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZWZhNTJiZS1hYmEzLTQzMTctYTBiMy1hMTBmMThhMjhiOTciLCJ3YWxsZXRBZGRyZXNzIjoiMHgxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwIiwiaWF0IjoxNzYzOTA3MDI4LCJleHAiOjE3NjQ1MTE4Mjh9.B7KyG0pPY0hUzqhUdekBESBbNoAuwD19Y79b5v1dxy0"

echo "=== DELETE Wallet (id=4 - Polygon) ==="
curl -X DELETE http://localhost:3000/api/identity/wallets/4 \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo ""
echo "=== GET Wallets (after deletion) ==="
curl -X GET http://localhost:3000/api/identity/wallets -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool

echo ""
echo "=== DELETE Token Preference (id=4 - USDC) ==="
curl -X DELETE http://localhost:3000/api/identity/token-preferences/4 \
  -H "Authorization: Bearer $TOKEN" \
  -s | python3 -m json.tool

echo ""
echo "=== GET Token Preferences (after deletion) ==="
curl -X GET http://localhost:3000/api/identity/token-preferences -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool
