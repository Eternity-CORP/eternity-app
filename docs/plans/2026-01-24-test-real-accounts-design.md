# Test & Real Accounts Implementation Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to create TEST accounts (testnet) and REAL accounts (mainnet) within the same wallet, with clear visual separation and safety warnings.

**Architecture:** One mnemonic supports multiple accounts, each marked as 'test' or 'real'. TEST accounts connect to testnet networks, REAL accounts to mainnet. Visual badges and color coding prevent confusion.

**Tech Stack:** React Native, Expo, Redux Toolkit, ethers.js v6

---

## 1. Data Model

### Account Type Extension

```typescript
// packages/shared/src/types/wallet.ts
interface Account {
  id: string;
  address: string;
  accountIndex: number;
  label?: string;
  type: 'test' | 'real';  // NEW
}
```

### Network Environment

```typescript
type NetworkEnvironment = 'mainnet' | 'testnet';

interface NetworkConfig {
  // ... existing fields
  environment: NetworkEnvironment;
}
```

### Testnet Networks

| Mainnet | Testnet | Chain ID |
|---------|---------|----------|
| Ethereum | Sepolia | 11155111 |
| Polygon | Amoy | 80002 |
| Arbitrum | Arbitrum Sepolia | 421614 |
| Base | Base Sepolia | 84532 |
| Optimism | Optimism Sepolia | 11155420 |

---

## 2. Visual Design

### Color Scheme

- **TEST:** `#F59E0B` (amber/orange) — warning, but not aggressive
- **REAL:** `#10B981` (emerald/green) — stable, "live"

### Badge Display

```
┌─────────────────────────────────┐
│  👤 Account 1  [TEST]           │  ← Orange badge + border
│  0x1234...5678                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  👤 Main Wallet  [REAL]         │  ← Green badge + border
│  0xabcd...efgh                  │
└─────────────────────────────────┘
```

### Badge Locations

1. Account Selector (dropdown)
2. Home screen header (current account)
3. Settings → Accounts (list)
4. Send/Receive confirmation screens

### Test Mode Banner (Home Screen)

For TEST accounts, show banner at top:
```
"Test Mode — tokens have no real value"
```

---

## 3. Account Creation Flow

### Welcome Screen (3 buttons)

```
┌─────────────────────────────────────────┐
│         Create or Import Wallet         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  💎  New Wallet                 │   │  ← Green border
│  │  Create a new real wallet       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📥  Existing Wallet            │   │
│  │  Import with recovery phrase    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🧪  New Test Wallet            │   │  ← Orange border
│  │  For testing with free tokens   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Flow Logic

- "New Wallet" → `type: 'real'` → mainnet networks
- "Existing Wallet" → import → `type: 'real'` → mainnet networks
- "New Test Wallet" → `type: 'test'` → testnet networks

---

## 4. Network Switching

### TEST Account Networks

```
Sepolia, Polygon Amoy, Arbitrum Sepolia, Base Sepolia, Optimism Sepolia
```

### REAL Account Networks

```
Ethereum, Polygon, Arbitrum, Base, Optimism
```

### Balance Loading

- Each account type loads balances only from its networks
- API calls go to corresponding RPC endpoints (testnet or mainnet)

---

## 5. Get Test Tokens (TEST only)

Button on Home screen for TEST accounts: "Get Test Tokens"

```
┌─────────────────────────────────┐
│  Get Free Test Tokens           │
│                                 │
│  • Sepolia ETH      [Get →]     │
│  • Polygon Amoy     [Get →]     │
│  • Arbitrum Sepolia [Get →]     │
│  • Base Sepolia     [Get →]     │
│  • Optimism Sepolia [Get →]     │
└─────────────────────────────────┘
```

### Faucet Links

| Network | Faucet URL |
|---------|------------|
| Sepolia | https://sepoliafaucet.com |
| Polygon Amoy | https://faucet.polygon.technology |
| Arbitrum Sepolia | https://faucet.arbitrum.io |
| Base Sepolia | https://www.alchemy.com/faucets/base-sepolia |
| Optimism Sepolia | https://www.alchemy.com/faucets/optimism-sepolia |

---

## 6. Transaction Warnings

### Logic

- Sending from TEST account → always show warning
- Exception: recipient is also our TEST account → no warning

### Warning Block (Confirm Screen)

```
┌─────────────────────────────────────────┐
│  Confirm Transaction                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⚠️ TEST ACCOUNT                 │   │  ← Orange block
│  │ You're using a test account.    │   │
│  │ These tokens have no real value.│   │
│  └─────────────────────────────────┘   │
│                                         │
│  From: Account 1 [TEST]                 │
│  To: 0x1234...5678                      │
│  Amount: 0.1 ETH (Sepolia)              │
│                                         │
│  [Confirm]                              │
└─────────────────────────────────────────┘
```

---

## 7. Migration

### Existing Accounts

On first launch after update:
1. All existing accounts receive `type: 'test'`
2. Show one-time modal:

```
┌─────────────────────────────────────────┐
│  🎉 New: Test & Real Accounts           │
│                                         │
│  Your existing accounts are now marked  │
│  as TEST accounts (testnet).            │
│                                         │
│  You can now create REAL accounts       │
│  for mainnet transactions with real     │
│  value.                                 │
│                                         │
│  [Got it]                               │
└─────────────────────────────────────────┘
```

---

## 8. File Changes

### New Files

```
src/constants/networks-testnet.ts     — Testnet configurations
src/constants/faucets.ts              — Faucet links
src/components/AccountTypeBadge.tsx   — TEST/REAL badge component
src/components/TestModeWarning.tsx    — Warning for TEST transactions
```

### Modified Files

```
packages/shared/src/types/wallet.ts   — Add type to Account
src/store/slices/wallet-slice.ts      — Type logic on account creation
src/constants/networks.ts             — Add environment field
src/services/balance-service.ts       — Select networks by account type
src/services/network-service.ts       — Filter networks by type

app/(onboarding)/welcome.tsx          — Third button "New Test Wallet"
app/(tabs)/home.tsx                   — Badge + banner for TEST
src/components/AccountSelector.tsx    — Badge in account list

app/send/confirm.tsx                  — Warning for TEST
app/blik/*.tsx                        — Warning for TEST
```

### Redux Changes

```typescript
// wallet-slice.ts
createAccountThunk(type: 'test' | 'real')

// Selector for networks
selectNetworksForCurrentAccount(state)
  → returns testnet or mainnet networks based on account type
```

---

## 9. Implementation Order

1. **Data model** — Add type to Account, update types
2. **Networks** — Add testnet configurations, environment field
3. **Redux** — Update wallet-slice with type support, add selectors
4. **Migration** — Auto-migrate existing accounts to 'test'
5. **UI Components** — AccountTypeBadge, TestModeWarning
6. **Onboarding** — Add "New Test Wallet" button
7. **Home screen** — Badge, banner, Get Test Tokens
8. **Account Selector** — Show badges
9. **Send flows** — Add warnings for TEST accounts
10. **Balance service** — Filter networks by account type
