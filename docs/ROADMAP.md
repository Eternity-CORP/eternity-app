# E-Y Wallet — Current Status & Roadmap

**Last Updated:** December 20, 2025  
**Phase:** MVP Completion Sprint
**Overall Progress:** ~92%

---

## 📍 Where We Are Now

### Implementation Status: **~92% Complete**

| Component | Status | Notes |
|-----------|--------|-------|
| **Mobile Wallet Core** | ✅ Done | Create, import, multi-account |
| **Same-chain Transfers** | ✅ Done | ETH, ERC-20, gas estimation |
| **BLIK Same-chain** | ✅ Done | Generate, display, pay codes |
| **Global Identity** | ✅ Done | @nicknames, EY-ID, resolution |
| **Security** | ✅ Done | Biometric, PIN, secure storage |
| **Backend Cross-Chain** | ✅ Done | LiFi + Socket routers |
| **Mobile Cross-Chain UI** | ⚠️ 90% | Quote screen done, signing needed |
| **Demo/Live Mode** | ✅ Done | Testnet/mainnet toggle |
| **Transaction History** | ✅ Done | Multi-chain, Etherscan |
| **Shards Gamification** | ✅ Done | Earning, animations |

---

## ✅ What's Already Built

### Backend (`backend/src/`)

**Cross-chain Routers:**
- **LifiRouterService** — `getQuote()`, `prepareTransaction()`, `getTransactionStatus()` ✅
- **SocketRouterService** — Full implementation with EVM + Solana ✅
- **RangoRouterService** — Implemented but deferred (no API key) ⏸️

**Core Services:**
- **CrosschainService** — Route comparison, best quote selection ✅
- **BlikService** — Code generation, TTL, pessimistic locking ✅
- **PaymentService** — Same-chain transfers ✅
- **IdentityService** — Nickname resolution, profiles ✅
- **ShardService** — Gamification points ✅

### Mobile (`mobile/src/`)

**API Clients:**
- **crosschainService.ts** — Full API client (quote, compare, prepare, status) ✅
- **blikService.ts** — BLIK API client ✅
- **identityService.ts** — Identity API client ✅

**Key Screens (42 total):**
- **HomeScreen.tsx** — Balance, tokens, quick actions ✅
- **UnifiedSendScreen.tsx** — Send flow with cross-chain detection ✅
- **CrosschainQuoteScreen.tsx** — Quote comparison UI ✅
- **CreateBlikCodeScreen.tsx** — BLIK code generation ✅
- **PayBlikCodeScreen.tsx** — BLIK payment ✅

**Core Services:**
- **walletService.ts** — HD wallet, key management ✅
- **transactionService.ts** — TX signing, broadcasting, retry ✅
- **balanceService.ts** — Multi-chain balance fetching ✅
- **gasEstimatorService.ts** — EIP-1559 + legacy gas ✅
- **biometricService.ts** — Biometric auth ✅

---

## 🎯 What's Left to Do (MVP)

### Critical Path (Must Complete)

| # | Task | Effort | Status |
|---|------|--------|--------|
| 1 | **Hook Wallet Signing** for cross-chain | 2-4h | ⏳ Next |
| 2 | **Transaction Status Screen** for cross-chain | 4h | ⏳ Pending |
| 3 | **BLIK Cross-chain** wiring | 2h | ⏳ Pending |
| 4 | **E2E Test** on testnet | 2-4h | ⏳ Pending |

**Total Remaining: ~10-14 hours (~2-3 days)**

### Nice-to-Have (Post-MVP)

| Task | Effort | Priority |
|------|--------|----------|
| Fee Breakdown Component | 4-6h | Medium |
| Error Recovery UX Polish | 4-6h | Medium |
| Webhook Status Updates | 6-8h | Low |
| Rango Router (if get key) | 2h | Low |

---

## 📊 Epic Status Summary

### Epic 01: Инфраструктура трансферов
| Story | Title | Status |
|-------|-------|--------|
| S-01 | API ключи LiFi и Rango | ✅ LiFi работает без ключа, Rango → Socket |
| S-02 | Тестнет кошелёк | ⏳ Pending (можно использовать публичные faucets) |

**Status:** ✅ Unblocked (LiFi + Socket работают)

### Epic 02: Same-Chain Transfer
| Story | Title | Status |
|-------|-------|--------|
| S-03 | Same-chain ETH перевод | ✅ Done |
| S-04 | Same-chain USDC перевод | ✅ Done |
| S-05 | Mobile smoke test | ⏳ In Progress |

**Status:** ⚠️ 90% Done

### Epic 03: Cross-Chain Execution
| Story | Title | Status |
|-------|-------|--------|
| S-06 | LiFi execution | ✅ Done |
| S-07 | Socket execution (was Rango) | ✅ Done |
| S-08 | Rango execution | ⏸️ Deferred |
| S-09 | Mobile crosschain signing | ⏳ In Progress |
| S-10 | Crosschain status UI | ⏳ In Progress |
| S-11 | BLIK crosschain | ⏳ In Progress |
| S-12 | Gas estimation | ✅ Done |

**Status:** ⚠️ 85% Done

### Epic 04: Mobile Security
| Story | Title | Status |
|-------|-------|--------|
| S-13 | Auth app launch | ✅ Done |
| S-14 | Auth transaction | ⏳ Pending |
| S-15 | Auth seed phrase | ✅ Done |
| S-16 | Security settings | ✅ Done |
| S-17 | PIN lockout | ✅ Done |
| S-18 | Seed recovery | ✅ Done |

**Status:** ✅ 90% Done

### Epic 05: Demo/Live Mode
| Story | Title | Status |
|-------|-------|--------|
| S-19 | Demo/Live Mode переключатель | ✅ Done |

**Status:** ✅ Complete

---

## 🚀 Definition of MVP Done

- [x] Can create/import HD wallet
- [x] Can send/receive same-chain ETH/tokens
- [x] Can generate/pay BLIK codes (same-chain)
- [x] Has biometric/PIN security
- [x] Shows multi-chain transaction history
- [x] Has global identity system (@nickname)
- [x] Has demo/live mode toggle
- [x] Has shards gamification
- [ ] **Can execute cross-chain transfers via mobile**
- [ ] **User sees cross-chain transaction status**
- [ ] **BLIK cross-chain works**

---

## 📋 Next Steps (In Order)

### Step 1: Hook Wallet Signing (2-4 hours)
**File:** `mobile/src/screens/CrosschainQuoteScreen.tsx`

```typescript
// Current (line ~80):
navigation.navigate('Home');

// Should be:
const signer = await getSigner();
const signedTx = await signer.signTransaction(txData);
const result = await crosschainService.executeTransaction(signedTx);
navigation.navigate('TransactionStatus', { txHash: result.hash });
```

### Step 2: Create Status Screen (4 hours)
Create `CrosschainStatusScreen.tsx`:
- Show source chain tx status
- Show bridge progress
- Show destination chain tx status
- Poll status every 5 seconds

### Step 3: Wire BLIK Cross-chain (2 hours)
Update `PayBlikCodeScreen.tsx`:
- Detect if cross-chain needed
- Show cross-chain quote
- Execute via CrosschainService

### Step 4: E2E Testing (2-4 hours)
```bash
# Start services
cd backend && npm run start:dev
cd mobile && npx expo start

# Test flow:
1. Create wallet
2. Get testnet funds
3. Send cross-chain (e.g., Polygon → Arbitrum)
4. Verify completion
```

---

## 🔗 Cross-Chain Router Status

| Router | API Key | Status | Coverage |
|--------|---------|--------|----------|
| **LiFi** | Not required (free tier) | ✅ Active | EVM (15+ chains) |
| **Socket** | Public key available | ✅ Active | EVM + Solana |
| **Rango** | Blocked | ⏸️ Deferred | Code preserved |

**Public Socket API Key:** `72a5b4b0-e727-48be-8aa1-5da9d62fe635`

---

## 📅 Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Wallet Signing Hook | 1 day | ⏳ Next |
| Status Screen + Testing | 1-2 days | After |
| Bug Fixes + Polish | 1 day | After |
| **Total to MVP** | **3-5 days** | |

---

## 📚 Related Documents

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — Quick status overview
- [Brief](./brief.md) — Project vision
- [PRD](./prd/prd.md) — Detailed requirements
- [ADR-002](./decisions/ADR-002-rango-to-socket-migration.md) — Rango → Socket decision

---

**Document Maintainer:** Dev Team  
**Review Cadence:** Daily during MVP sprint
