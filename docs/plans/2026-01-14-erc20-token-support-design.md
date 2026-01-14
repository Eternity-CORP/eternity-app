# ERC-20 Token Support Design

**Date:** 2026-01-14
**Status:** Approved
**Related Task:** FR-1.4 (E-9)

## Overview

Add ERC-20 token balance support to complete FR-1.4 requirements. Currently only ETH is supported.

## Requirements

From PRD FR-1.4:
- [ ] Show ETH balance ✅ (already implemented)
- [ ] Show ERC-20 token balances (USDC, USDT, etc.)
- [ ] USD equivalent for each token
- [ ] Total portfolio value in USD ✅ (already implemented)
- [ ] Pull-to-refresh (< 1 second) ✅ (already implemented)
- [ ] Token icons and names

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token Detection | Alchemy Token Balances API | Auto-detects all ERC-20, single API call |
| Token Icons | Trust Wallet Assets (GitHub CDN) | Free, huge database, by contract address |
| Token Prices | CoinGecko (existing) | Already integrated, extend to multiple tokens |
| Token Metadata | Alchemy getTokenMetadata | Name, symbol, decimals in one call |

## Data Model

### Extended TokenBalance Interface

```typescript
interface TokenBalance {
  token: string;          // 'ETH' or contract address (0x...)
  symbol: string;         // 'ETH', 'USDC', 'USDT'
  name: string;           // 'Ethereum', 'USD Coin'
  balance: string;        // "1.5" (human-readable)
  balanceRaw: string;     // "1500000" (raw, for sending)
  decimals: number;       // 18 for ETH, 6 for USDC
  usdValue?: number;      // $3500.00
  iconUrl?: string;       // Trust Wallet CDN URL
  lastUpdated: number;
}
```

## API Integration

### 1. Alchemy Token Balances

```typescript
// POST https://eth-sepolia.g.alchemy.com/v2/{API_KEY}
{
  "jsonrpc": "2.0",
  "method": "alchemy_getTokenBalances",
  "params": [address, "erc20"]
}
// Returns: { tokenBalances: [{ contractAddress, tokenBalance }] }
```

### 2. Alchemy Token Metadata

```typescript
// POST https://eth-sepolia.g.alchemy.com/v2/{API_KEY}
{
  "jsonrpc": "2.0",
  "method": "alchemy_getTokenMetadata",
  "params": [contractAddress]
}
// Returns: { name, symbol, decimals, logo }
```

### 3. CoinGecko Token Prices

```typescript
// GET https://api.coingecko.com/api/v3/simple/token_price/ethereum
// ?contract_addresses=0x...,0x...&vs_currencies=usd
```

### 4. Trust Wallet Assets (Icons)

```typescript
// URL pattern:
const iconUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${contractAddress}/logo.png`;
```

## Data Flow

```
fetchBalancesThunk(address)
         │
         ▼
┌────────────────────────────────┐
│ 1. Parallel requests:          │
│    • fetchEthBalance(address)  │
│    • fetchAllTokenBalances()   │ ← Alchemy
│    • fetchTokenPrices()        │ ← CoinGecko
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ 2. For each token:             │
│    • Get metadata (cached)     │
│    • Get iconUrl               │
│    • Calculate usdValue        │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ 3. Redux state update:         │
│    • balances: [ETH, tokens]   │
│    • totalUsdValue: sum        │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ 4. UI renders:                 │
│    • Icon + name               │
│    • Balance + USD equivalent  │
└────────────────────────────────┘
```

## Caching Strategy

| Data | Cache Duration | Storage |
|------|----------------|---------|
| Token Metadata | Forever (immutable) | AsyncStorage |
| Token Prices | 1 minute | SecureStore (existing) |
| Token Balances | No cache (real-time) | Redux only |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/balance-service.ts` | + fetchAllTokenBalances(), + fetchTokenMetadata(), + fetchTokenPrices(), + getTokenIconUrl() |
| `src/store/slices/balance-slice.ts` | Update fetchBalancesThunk for ERC-20 |
| `app/(tabs)/home.tsx` | + Image component for icons, fallback logic |
| `app/send/token.tsx` | Minor (already supports array) |

## Error Handling

- If Alchemy fails → show only ETH (graceful degradation)
- If CoinGecko fails → show balance without USD value
- If icon fails to load → show text fallback (first 2 chars)
- If metadata fetch fails → use contract address as name

## Testing Plan

1. Wallet with only ETH → should work as before
2. Wallet with USDC/USDT → should show all tokens
3. Pull-to-refresh → all tokens refresh
4. Send flow → can select any token
5. Network switch → balances update correctly
