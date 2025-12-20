#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZWZhNTJiZS1hYmEzLTQzMTctYTBiMy1hMTBmMThhMjhiOTciLCJ3YWxsZXRBZGRyZXNzIjoiMHgxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwIiwiaWF0IjoxNzYzOTA3MDI4LCJleHAiOjE3NjQ1MTE4Mjh9.B7KyG0pPY0hUzqhUdekBESBbNoAuwD19Y79b5v1dxy0"

echo "=== GET Wallets (initial) ==="
curl -X GET http://localhost:3000/api/identity/wallets -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool

echo -e "\n=== POST Add Wallet (Sepolia) ==="
curl -X POST http://localhost:3000/api/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chainId":"sepolia","address":"0xaabbccddee1122334455667788990011223344556","isPrimary":true,"label":"My Sepolia Wallet"}' \
  -s | python3 -m json.tool

echo -e "\n=== POST Add Wallet (Polygon) ==="
curl -X POST http://localhost:3000/api/identity/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chainId":"polygon","address":"0x9988776655443322110099887766554433221100","isPrimary":false,"label":"My Polygon Wallet"}' \
  -s | python3 -m json.tool

echo -e "\n=== GET Wallets (after adding) ==="
curl -X GET http://localhost:3000/api/identity/wallets -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool

echo -e "\n=== POST Token Preference (ETH -> Sepolia) ==="
curl -X POST http://localhost:3000/api/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol":"ETH","preferredChainId":"sepolia"}' \
  -s | python3 -m json.tool

echo -e "\n=== POST Token Preference (USDC -> Polygon) ==="
curl -X POST http://localhost:3000/api/identity/token-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol":"USDC","preferredChainId":"polygon"}' \
  -s | python3 -m json.tool

echo -e "\n=== GET Token Preferences ==="
curl -X GET http://localhost:3000/api/identity/token-preferences -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool
