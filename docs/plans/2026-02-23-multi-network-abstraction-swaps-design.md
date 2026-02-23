# Multi-Network, Network Abstraction & Swaps — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable real account usage on 5 EVM mainnets with seamless network abstraction and cross-chain swaps/bridges.

**Architecture:** Three sequential phases building on existing `packages/shared/src/config/multi-network.ts` infrastructure. Shared-first approach — all business logic in `packages/shared/`, implemented simultaneously for web (`apps/web/`) and mobile (`apps/mobile/`).

**Tech Stack:** ethers.js v6, Alchemy API, LI.FI SDK, Redux Toolkit, Next.js, Expo

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gas payment | User pays | Simpler, no relayer infrastructure needed |
| Send UX | Auto-select network + auto-bridge | Best UX, user just enters amount and recipient |
| Swap/bridge provider | LI.FI SDK | Aggregates 30+ chains, 1inch/Uniswap/Stargate/Across |
| Implementation order | Phase 1 → 2 → 3 | Each builds on the previous |
| Deposit method | Crypto only (no fiat on-ramp) | Simplest MVP |
| Shared-first | All logic in `packages/shared/` | Cross-platform requirement |

---

## Phase 1: Multi-Network Mainnet Support

### Goal
Real accounts operate on 5 mainnet chains (Ethereum, Polygon, Arbitrum, Base, Optimism) simultaneously. Test accounts stay on Sepolia. Business accounts stay on Sepolia.

### 1.1 Network Configuration Updates

**File:** `packages/shared/src/config/networks.ts`

Currently `buildNetworks()` returns one config per `AccountType`. For real accounts, expand to return configs for all 5 mainnet chains:

```typescript
// Current: real → { Ethereum only }
// New: real → { ethereum, polygon, arbitrum, base, optimism }
```

Use existing `SUPPORTED_NETWORKS` from `multi-network.ts` as the source of truth. The `buildNetworks()` function for `real` accounts should produce a `Record<NetworkId, SimpleNetworkConfig>` instead of a single config.

Keep `test` → Sepolia and `business` → Sepolia unchanged.

### 1.2 Multi-Chain Provider Management

**New shared service:** `packages/shared/src/services/provider-factory.ts`

Pure factory that builds ethers.js `JsonRpcProvider` configs (RPC URLs, chain IDs) for all networks of an account type. No ethers import — just URL strings and chain IDs. The actual `new JsonRpcProvider(...)` call happens in app code (web/mobile).

**App-side (web):** `apps/web/src/lib/multi-provider.ts`
- Manages a `Map<NetworkId, JsonRpcProvider>`
- Lazy initialization — provider created on first use per network
- Used by balance fetching, gas estimation, tx broadcast

**App-side (mobile):** `apps/mobile/src/services/multi-provider.ts`
- Same pattern, adapted for React Native

### 1.3 Multi-Chain Balance Fetching

**Existing:** `apps/web/src/lib/multi-network.ts` already has `fetchAllNetworkBalances()` using Alchemy.

**Changes needed:**
1. Extract pure aggregation logic into `packages/shared/src/services/balance-aggregator.ts`
2. Keep Alchemy-specific fetch in app code (different HTTP clients per platform)
3. Return `AggregatedTokenBalance[]` (type already exists in shared)

**Balance refresh strategy:**
- On account switch: fetch all networks in parallel
- Auto-refresh: every 60 seconds (existing behavior)
- Manual pull-to-refresh in UI

### 1.4 Multi-Chain Send

**Existing:** `apps/web/src/lib/send-service.ts` sends on a single network.

**Changes:**
1. Accept `networkId` parameter to specify which network to send on
2. Use the correct provider from `multi-provider.ts` for the target network
3. Gas estimation per network (already have `estimateGas` logic)
4. Build and sign transaction with correct `chainId`

**Shared logic:** `packages/shared/src/services/send-helpers.ts`
- `buildSendParams(networkId, to, amount, tokenAddress)` — returns structured params
- `validateSendRequest(params, balances)` — checks sufficient balance
- No ethers dependency — returns plain objects

### 1.5 Multi-Chain Transaction History

**New shared types:** `packages/shared/src/types/transaction.ts`

```typescript
interface MultiChainTransaction {
  hash: string;
  networkId: NetworkId;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'swap' | 'bridge';
}
```

**App-side:** Fetch transaction history per network from Alchemy (`alchemy_getAssetTransfers`), merge and sort by timestamp.

### 1.6 Receive Flow

**Current:** Show single address + QR code.

**Change:** Since all EVM chains share the same address, keep the QR code simple. Add a network selector below the QR code so the user can hint which network they expect funds on (informational only — funds arrive on whichever network the sender uses).

### 1.7 Account Type Routing

**Update `packages/shared/src/config/networks.ts`:**

```typescript
type AccountNetworkMode = 'single' | 'multi';

function getAccountNetworkMode(accountType: AccountType): AccountNetworkMode {
  if (accountType === 'real') return 'multi';
  return 'single'; // test, business stay single-network
}
```

All UI and services branch on this: if `multi`, use multi-chain providers/balances. If `single`, use single provider as today.

---

## Phase 2: Network Abstraction UX

### Goal
Users interact with tokens, not networks. Network selection is automatic. Users see "You have 1.5 ETH" not "0.3 ETH on Base + 0.8 ETH on Arbitrum + 0.4 ETH on Ethereum".

### 2.1 Token-First Balance Display

**Shared aggregation:** Already exists in `routing-helpers.ts` (`getTotalBalance`, `findNetworksWithBalance`).

**UI change (both web + mobile):**
- Main wallet screen shows aggregated token balances
- Each token row: icon, symbol, total balance, USD value
- Tap/click token → detail screen showing per-network breakdown
- Small network badge dots on each token (showing which networks have balance)

### 2.2 Smart Send

**Shared logic:** `packages/shared/src/services/smart-routing.ts`

```typescript
interface SendRoute {
  type: 'direct' | 'bridge' | 'consolidation';
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  estimatedGasUsd: number;
  bridgeFeeUsd?: number;
  estimatedTimeSeconds: number;
}

function findBestSendRoute(
  token: string,
  amount: string,
  balances: AggregatedTokenBalance[],
  recipientPreferredNetwork?: NetworkId,
): SendRoute;
```

**Algorithm:**
1. If recipient has a preferred network AND sender has sufficient balance there → `direct` on that network
2. Else, find cheapest network where sender has sufficient balance → `direct`
3. If no single network has enough → `bridge` from cheapest source to cheapest destination
4. Last resort: `consolidation` — combine from multiple networks (Phase 3, via LI.FI)

**UX flow (both platforms):**
1. User enters recipient + amount + token
2. System auto-selects best route
3. Shows route summary: "Sending via Base (cheapest)" or "Bridging from Ethereum to Base (~$0.50 fee, ~2 min)"
4. User confirms
5. If route is `bridge`, show extra confirmation: "This requires a cross-chain bridge. Fee: $X. Time: ~Y min."

### 2.3 Gas Guard

**Shared helper:** `packages/shared/src/services/gas-guard.ts`

Before any transaction, check if user has sufficient native token (ETH/MATIC) on the target network to cover gas:

```typescript
interface GasGuardResult {
  sufficient: boolean;
  nativeBalance: string;
  estimatedGasCost: string;
  networkId: NetworkId;
  nativeSymbol: string;
}

function checkGasAvailability(
  networkId: NetworkId,
  estimatedGasWei: bigint,
  nativeBalance: string,
): GasGuardResult;
```

**UI:** If insufficient gas, show warning: "You need ~0.001 ETH on Base for gas. Bridge some ETH first?" with a one-tap bridge action (Phase 3).

### 2.4 Network Badges

Small colored dots/chips next to token balances showing which networks hold that token:

```
ETH  1.500  $4,500    [Base] [Arb] [ETH]
USDC 250.00  $250     [Base] [Polygon]
```

Tapping a badge shows that network's individual balance.

### 2.5 Network Preferences (Existing)

Already have `apps/web/src/app/wallet/settings/networks/page.tsx` and backend API. Just needs to be wired into the smart routing as `recipientPreferredNetwork`.

---

## Phase 3: Swaps & Bridges (LI.FI SDK)

### Goal
Users can swap any token for any other token, across any chain, in one action. Bridge tokens between chains. Auto-bridge during send if needed.

### 3.1 LI.FI SDK Integration

**Shared wrapper:** `packages/shared/src/services/lifi-client.ts`

Zero-dep wrapper that defines the interface. Actual LI.FI SDK calls happen in app code.

```typescript
interface SwapQuote {
  fromToken: { symbol: string; networkId: NetworkId; amount: string };
  toToken: { symbol: string; networkId: NetworkId; amount: string };
  route: LiFiRoute;
  estimatedGasUsd: number;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  estimatedTimeSeconds: number;
  priceImpact: number;
  slippage: number;
}

interface LiFiClientInterface {
  getQuote(params: QuoteParams): Promise<SwapQuote>;
  executeSwap(quote: SwapQuote, signer: unknown): Promise<string>;
  getStatus(txHash: string): Promise<SwapStatus>;
}
```

**App-side integration:**
- `apps/web/src/lib/lifi-service.ts` — implements `LiFiClientInterface` using `@lifi/sdk`
- `apps/mobile/src/services/lifi-service.ts` — same, adapted for React Native

### 3.2 Swap UI

**New page (web):** `apps/web/src/app/wallet/swap/page.tsx`
**New screen (mobile):** `apps/mobile/src/screens/SwapScreen.tsx`

UI elements:
- From: token selector + amount input + network badge
- To: token selector + network badge (can be different chain)
- Quote display: rate, fees, estimated time, price impact
- "Swap" button
- Transaction progress tracker (pending → bridging → confirming → done)

**Shared types:** `packages/shared/src/types/swap.ts`

### 3.3 Auto-Bridge in Send Flow

When smart routing (Phase 2) determines a bridge is needed:
1. Get LI.FI quote for the bridge
2. Show user: "Your USDC is on Ethereum. Bridging to Base will cost ~$0.30 and take ~2 min."
3. On confirm, execute bridge via LI.FI, then send the original transaction
4. Track both operations in a combined progress view

### 3.4 Gas Bridge Helper

"I need gas on Base but have no ETH there."

Quick action: bridge a small amount of ETH from cheapest available network to the target network. Pre-calculate: "Bridge 0.005 ETH from Arbitrum to Base (~$0.10, ~1 min)".

### 3.5 Quote Caching

**Shared:** `packages/shared/src/services/quote-cache.ts`

Cache LI.FI quotes for 30 seconds to avoid re-fetching on every keystroke:

```typescript
interface CachedQuote {
  quote: SwapQuote;
  fetchedAt: number;
  key: string; // hash of params
}

function getCachedQuote(params: QuoteParams): SwapQuote | null;
function setCachedQuote(params: QuoteParams, quote: SwapQuote): void;
```

### 3.6 Slippage & Safety

- Default slippage: 0.5%
- Max slippage: 3% (user configurable in settings)
- Price impact warning at >2%
- Minimum receive amount shown clearly
- Transaction deadline: 20 minutes

---

## Cross-Cutting Concerns

### Error Handling

All new shared services use domain-prefixed error codes:
```
NETWORK_PROVIDER_FAILED
BALANCE_FETCH_TIMEOUT
SEND_INSUFFICIENT_GAS
BRIDGE_QUOTE_FAILED
SWAP_SLIPPAGE_EXCEEDED
ROUTE_NOT_FOUND
```

### State Management

Both platforms use the same state shape:

```typescript
interface MultiNetworkState {
  balances: {
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    aggregated: AggregatedTokenBalance[];
    lastFetchedAt: number | null;
    error: string | null;
  };
  send: {
    status: 'idle' | 'routing' | 'confirming' | 'broadcasting' | 'bridging' | 'succeeded' | 'failed';
    route: SendRoute | null;
    txHash: string | null;
    error: string | null;
  };
  swap: {
    status: 'idle' | 'quoting' | 'confirming' | 'executing' | 'succeeded' | 'failed';
    quote: SwapQuote | null;
    txHash: string | null;
    error: string | null;
  };
}
```

### Testing Strategy

- **Unit tests** for all shared pure functions (routing, gas guard, quote cache, helpers)
- **Integration tests** for LI.FI client wrapper (mocked API)
- **E2E** on Sepolia testnet for send flow (real transactions)

### Migration

- Existing users with real accounts: on first load after update, balances auto-fetch from all 5 networks
- No data migration needed — same address works on all EVM chains
- Network preferences (if set) are preserved

---

## File Structure Summary

```
packages/shared/src/
  config/
    multi-network.ts          (exists — source of truth for 5 networks)
    networks.ts               (update — multi-network for real accounts)
  services/
    routing-helpers.ts         (exists — extend with new helpers)
    balance-aggregator.ts      (new — pure balance aggregation logic)
    smart-routing.ts           (new — find best send route)
    gas-guard.ts               (new — check gas availability)
    send-helpers.ts            (new — build/validate send params)
    lifi-client.ts             (new — LI.FI interface + types)
    quote-cache.ts             (new — swap quote caching)
    provider-factory.ts        (new — RPC URL builder per account type)
  types/
    network-balance.ts         (exists — AggregatedTokenBalance)
    transaction.ts             (new — MultiChainTransaction)
    swap.ts                    (new — SwapQuote, SwapStatus)

apps/web/src/
  lib/
    multi-network.ts           (exists — update balance fetching)
    multi-provider.ts          (new — Map<NetworkId, Provider>)
    send-service.ts            (update — accept networkId)
    lifi-service.ts            (new — LI.FI SDK wrapper)
  contexts/
    balance-context.tsx         (update — multi-chain state)
    account-context.tsx         (update — multi-provider management)
  app/wallet/
    swap/page.tsx               (new — swap UI)
    send/page.tsx               (update — smart routing UI)
    page.tsx                    (update — token-first balance display)

apps/mobile/src/
  services/
    multi-provider.ts           (new — same as web)
    lifi-service.ts             (new — same as web)
  screens/
    SwapScreen.tsx              (new — swap UI)
    SendScreen.tsx              (update — smart routing UI)
    WalletScreen.tsx            (update — token-first display)
```
