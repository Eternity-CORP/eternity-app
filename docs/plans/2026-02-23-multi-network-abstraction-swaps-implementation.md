# Multi-Network, Network Abstraction & Swaps — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable real accounts on 5 EVM mainnets with token-first UX, smart routing, and LI.FI-powered cross-chain swaps.

**Architecture:** Three sequential phases building on existing shared infrastructure. All business logic in `packages/shared/`, all UI changes on both web and mobile simultaneously. Existing routing, bridge, and swap services are thin wrappers around shared — we extend them, not rewrite.

**Tech Stack:** ethers.js v6, Alchemy API (multi-chain), LI.FI REST API (already integrated via shared), Redux Toolkit (mobile), React Context (web), Next.js (web), Expo Router (mobile)

**Design doc:** `docs/plans/2026-02-23-multi-network-abstraction-swaps-design.md`

---

## Important Context

### What already exists (DO NOT duplicate):
- `packages/shared/src/config/multi-network.ts` — 5 mainnet configs, `NetworkId`, `SUPPORTED_NETWORKS`, `COMMON_TOKENS`, `NETWORK_GAS_RANKING`, `buildMultiNetworkRpcUrls`
- `packages/shared/src/config/networks.ts` — `buildNetworks()` returns `Record<AccountType, SimpleNetworkConfig>` (single network per account type)
- `packages/shared/src/services/routing-helpers.ts` — `getCheapestNetwork`, `findNetworksWithBalance`, `hasSufficientBalance`, `getTokenAddressForNetwork`, etc.
- `packages/shared/src/services/swap-service.ts` — `fetchSwapQuote`, `fetchPopularTokens`, `buildNativeToken` (LI.FI REST API)
- `packages/shared/src/services/bridge-service.ts` — `fetchBridgeQuote`, `fetchBridgeStatus`, `checkBridgeCostLevel`
- `packages/shared/src/types/network-balance.ts` — `AggregatedTokenBalance`, `NetworkTokenBalance`, `aggregateBalances`
- `packages/shared/src/types/swap.ts` — `SwapQuote`, `SwapToken`, `SwapParams`
- `apps/web/src/lib/multi-network.ts` — `fetchAllNetworkBalances()` with provider cache
- `apps/web/src/lib/routing-service.ts` — `calculateTransferRoute()` (direct/bridge)
- `apps/web/src/lib/swap.ts` — `getSwapQuote`, `checkAllowance`, `executeSwap`
- `apps/mobile/src/services/network-service.ts` — `fetchAllNetworkBalances()` with provider cache
- `apps/mobile/src/services/routing-service.ts` — `calculateTransferRoute()` (direct/bridge/consolidation)
- `apps/mobile/src/services/swap-service.ts` — swap integration
- `apps/mobile/src/services/bridge-service.ts` — bridge execution
- Mobile already has multi-network enabled by default (`isMultiNetworkEnabled: true` in balance-slice)

### Test infrastructure:
- Mobile: Jest 29 + ts-jest. Tests in `apps/mobile/src/**/__tests__/*.test.ts`. Run: `pnpm --filter @e-y/mobile test`
- Shared: **No test setup**. We'll add vitest for shared package tests.
- Web: **No test setup**.

### Key constraint:
- `packages/shared/` has ZERO runtime dependencies. Only `fetch()`, `AbortController`, plain JS. No ethers, no react, no platform imports.

---

## Phase 1: Multi-Network Mainnet (Real Accounts on 5 Chains)

### Task 1: Update `buildNetworks()` to support multi-chain for real accounts

**Files:**
- Modify: `packages/shared/src/config/networks.ts`

**Context:** Currently `buildNetworks()` returns one `SimpleNetworkConfig` per `AccountType`. Real accounts get Ethereum mainnet only. We need real accounts to use all 5 chains from `multi-network.ts`, while test/business accounts stay on Sepolia.

**Step 1: Add `getAccountNetworkMode` and `buildMultiNetworks` functions**

Add to `packages/shared/src/config/networks.ts`:

```typescript
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId, type MultiNetworkConfig } from './multi-network';

export type AccountNetworkMode = 'single' | 'multi';

/**
 * Determine network mode for an account type.
 * Real accounts use multi-network (5 chains), test/business are single-network (Sepolia).
 */
export function getAccountNetworkMode(accountType: AccountType): AccountNetworkMode {
  return accountType === 'real' ? 'multi' : 'single';
}

/**
 * Build multi-network configs for real accounts.
 * Returns SimpleNetworkConfig for each mainnet chain.
 */
export function buildMultiNetworkConfigs(alchemyKey: string): Record<NetworkId, SimpleNetworkConfig> {
  const result = {} as Record<NetworkId, SimpleNetworkConfig>;
  for (const id of TIER1_NETWORK_IDS) {
    const net = SUPPORTED_NETWORKS[id];
    const rpcUrl = net.rpcUrlTemplate.replace('{apiKey}', alchemyKey);
    result[id] = {
      name: net.name,
      chainId: net.chainId,
      rpcUrl,
      explorerUrl: net.blockExplorer,
      explorerTxUrl: (hash: string) => `${net.blockExplorer}/tx/${hash}`,
      explorerAddressUrl: (address: string) => `${net.blockExplorer}/address/${address}`,
      symbol: net.nativeCurrency.symbol,
    };
  }
  return result;
}
```

**Step 2: Export new functions from shared index**

Verify that `packages/shared/src/config/index.ts` re-exports everything from `networks.ts` (it should via barrel export). If not, add the re-export.

**Step 3: Commit**

```bash
git add packages/shared/src/config/networks.ts
git commit -m "feat(shared): add multi-network config builder for real accounts"
```

---

### Task 2: Update web `network.ts` to use multi-network for real accounts

**Files:**
- Modify: `apps/web/src/lib/network.ts`

**Context:** Currently `getNetwork()` returns a single config. We need a second function for multi-chain scenarios.

**Step 1: Add multi-network getter**

Replace content of `apps/web/src/lib/network.ts`:

```typescript
import type { AccountType, NetworkId } from '@e-y/shared'
import {
  buildNetworks,
  buildMultiNetworkConfigs,
  getAccountNetworkMode,
  type SimpleNetworkConfig,
} from '@e-y/shared'

export type NetworkConfig = SimpleNetworkConfig

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

const NETWORKS = buildNetworks(ALCHEMY_KEY)
const MULTI_NETWORKS = buildMultiNetworkConfigs(ALCHEMY_KEY)

/**
 * Get single-network config (for test/business accounts, or default for real).
 */
export function getNetwork(type: AccountType): NetworkConfig {
  return NETWORKS[type]
}

/**
 * Get all network configs for a real account.
 * Returns null for test/business (single-network mode).
 */
export function getMultiNetworkConfigs(type: AccountType): Record<NetworkId, NetworkConfig> | null {
  if (getAccountNetworkMode(type) !== 'multi') return null
  return MULTI_NETWORKS
}

/**
 * Get specific network config by NetworkId.
 */
export function getNetworkById(networkId: NetworkId): NetworkConfig {
  return MULTI_NETWORKS[networkId]
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/network.ts
git commit -m "feat(web): add multi-network config getters"
```

---

### Task 3: Update web `send-service.ts` to accept a networkId parameter

**Files:**
- Modify: `apps/web/src/lib/send-service.ts`
- Modify: `apps/web/src/lib/multi-network.ts` (expose `getProvider`)

**Context:** Currently `sendNativeToken` and `sendErc20Token` receive a provider directly. The caller (send page) needs to pass the correct provider for the target network. We need to expose `getProvider(networkId)` from `multi-network.ts`.

**Step 1: Export `getProvider` from `multi-network.ts`**

The `getProvider` function already exists in `apps/web/src/lib/multi-network.ts` (line 34-39) but is not exported. Add `export` keyword:

```typescript
// Change from (line 34):
function getProvider(networkId: NetworkId): JsonRpcProvider {
// To:
export function getProvider(networkId: NetworkId): JsonRpcProvider {
```

**Step 2: Add `sendOnNetwork` convenience function to `send-service.ts`**

Add at the end of `apps/web/src/lib/send-service.ts`:

```typescript
import { getProvider } from './multi-network'
import type { NetworkId } from '@e-y/shared'

/**
 * Send a token on a specific network.
 * Resolves provider internally from the networkId.
 */
export async function sendOnNetwork(
  wallet: ethers.HDNodeWallet,
  networkId: NetworkId,
  to: string,
  amount: string,
  token?: { address: string; decimals: number },
): Promise<string> {
  const provider = getProvider(networkId)
  const connectedWallet = wallet.connect(provider)

  if (token) {
    return sendErc20Token(connectedWallet, provider, to, amount, token.address, token.decimals)
  }
  return sendNativeToken(connectedWallet, provider, to, amount)
}

/**
 * Estimate gas on a specific network.
 */
export async function estimateGasOnNetwork(
  networkId: NetworkId,
  from: string,
  to: string,
  amount: string,
  token?: { address: string; decimals: number },
  ethPrice?: number,
): Promise<GasEstimate> {
  const provider = getProvider(networkId)
  return estimateGas(provider, from, to, amount, token, ethPrice)
}
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/send-service.ts apps/web/src/lib/multi-network.ts
git commit -m "feat(web): add network-aware send and gas estimation"
```

---

### Task 4: Update web send page to use routing result's networkId

**Files:**
- Modify: `apps/web/src/app/wallet/send/page.tsx`

**Context:** The send page already calculates a route via `calculateTransferRoute()` which returns `fromNetwork`. Currently, `handleSend` uses the default single provider. We need it to use `sendOnNetwork(wallet, route.fromNetwork, ...)` instead.

**Step 1: Import `sendOnNetwork` and `estimateGasOnNetwork`**

Replace send-related imports at top of file:

```typescript
import { sendOnNetwork, estimateGasOnNetwork } from '@/lib/send-service'
```

**Step 2: Update `handleSend` to use `sendOnNetwork`**

In the `handleSend` function (around line 169-203), change the send call to use the route's network:

```typescript
const handleSend = async () => {
  if (!wallet || !resolvedAddress) return
  setStatus('loading')
  setError('')

  try {
    const networkId = route?.fromNetwork || 'ethereum'
    const tokenInfo = selectedToken !== 'ETH'
      ? getTokenInfoForNetwork(selectedToken, networkId)
      : undefined

    const txHash = await sendOnNetwork(wallet, networkId, resolvedAddress, amount, tokenInfo)
    router.push(`/wallet/send/success?hash=${txHash}&network=${networkId}`)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Transaction failed')
    setStatus('failed')
  }
}
```

**Step 3: Update gas estimation to use `estimateGasOnNetwork`**

Update the gas estimation effect to use the route's network:

```typescript
// In gas estimation effect, replace estimateGas call with:
const networkId = route?.fromNetwork || 'ethereum'
const estimate = await estimateGasOnNetwork(networkId, address, resolvedAddress, amount, tokenInfo, ethPrice)
```

**Step 4: Commit**

```bash
git add apps/web/src/app/wallet/send/page.tsx
git commit -m "feat(web): send page uses route's target network"
```

---

### Task 5: Update web wallet dashboard to show network indicator per token

**Files:**
- Modify: `apps/web/src/app/wallet/page.tsx`

**Context:** The wallet dashboard already shows `aggregatedBalances` via `TokenList`. We need to add small network badges showing which networks hold each token. The `TokenList` component likely lives in `apps/web/src/components/`.

**Step 1: Find and read the TokenList component**

```bash
# Find the TokenList component:
grep -r "TokenList" apps/web/src/components/ --include="*.tsx" -l
```

**Step 2: Add network badge dots to each token row**

For each token in the list, show small colored dots for networks that have a balance:

```typescript
import { SUPPORTED_NETWORKS, type NetworkId } from '@e-y/shared'

// Inside the token row component, add after the balance display:
<div className="flex gap-0.5 mt-0.5">
  {token.networks
    .filter(n => parseFloat(n.balance) > 0)
    .map(n => (
      <span
        key={n.networkId}
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: SUPPORTED_NETWORKS[n.networkId as NetworkId]?.color || '#666' }}
        title={`${SUPPORTED_NETWORKS[n.networkId as NetworkId]?.name}: ${n.balance} ${token.symbol}`}
      />
    ))}
</div>
```

**Step 3: Update the network indicator on the dashboard**

Currently shows "Multi-Network" for real accounts. Change to show the count of active chains:

```typescript
// In the network info section, for real accounts:
<span className="text-xs" style={{ color: 'var(--accent-green)' }}>
  {currentAccount?.type === 'real' ? `${Object.keys(networkBalances).length} Networks` : network.name}
</span>
```

**Step 4: Commit**

```bash
git add apps/web/src/app/wallet/page.tsx apps/web/src/components/
git commit -m "feat(web): add network badges to token list"
```

---

### Task 6: Update web receive page to show network hints

**Files:**
- Modify: `apps/web/src/app/wallet/receive/page.tsx`

**Context:** Since all EVM chains share the same address, the QR code stays the same. Add an informational network selector below the QR code to let the user know which network they expect to receive on.

**Step 1: Add network hint selector**

Add after the QR code:

```typescript
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared'
import { useAccount } from '@/contexts/account-context'

// Inside component:
const { currentAccount } = useAccount()
const isMulti = currentAccount?.type === 'real'

// Below QR code, add:
{isMulti && (
  <div className="mt-4 text-center">
    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
      Same address works on all networks
    </p>
    <div className="flex flex-wrap justify-center gap-2">
      {TIER1_NETWORK_IDS.map(id => {
        const net = SUPPORTED_NETWORKS[id]
        return (
          <span
            key={id}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: net.color + '20',
              color: net.color,
              border: `1px solid ${net.color}40`,
            }}
          >
            {net.shortName}
          </span>
        )
      })}
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/wallet/receive/page.tsx
git commit -m "feat(web): show network hints on receive page"
```

---

### Task 7: Update mobile balance-slice and home screen for multi-network display

**Files:**
- Modify: `apps/mobile/src/components/home/TokensList.tsx`
- Modify: `apps/mobile/src/components/NetworkBadge.tsx`

**Context:** Mobile already fetches multi-network balances (`isMultiNetworkEnabled: true`). The `TokensList` component shows aggregated balances. We need to add network badge dots (similar to web Task 5).

**Step 1: Read and update `TokensList.tsx`**

Add network dots to each token row. The component has access to `aggregatedBalances` from the balance slice. Each `AggregatedTokenBalance` has a `networks` array with `{ networkId, balance }` entries.

```typescript
import { SUPPORTED_NETWORKS, type NetworkId } from '@e-y/shared'

// Inside token row, after balance display:
<View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>
  {item.networks
    .filter(n => parseFloat(n.balance) > 0)
    .map(n => (
      <View
        key={n.networkId}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: SUPPORTED_NETWORKS[n.networkId as NetworkId]?.color || '#666',
        }}
      />
    ))}
</View>
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/TokensList.tsx
git commit -m "feat(mobile): add network badges to token list"
```

---

### Task 8: Update mobile receive screen to show network hints

**Files:**
- Modify: `apps/mobile/app/receive/index.tsx`

**Context:** Same as web Task 6. Show network chips below QR code for real accounts.

**Step 1: Read and update receive screen**

Add network badges for real accounts:

```typescript
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared'
import { useAppSelector } from '@/src/store/hooks'
import { selectCurrentAccountType } from '@/src/store/slices/wallet-slice'

const accountType = useAppSelector(selectCurrentAccountType)

// Below QR code:
{accountType === 'real' && (
  <View style={{ marginTop: 12, alignItems: 'center' }}>
    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
      Same address works on all networks
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
      {TIER1_NETWORK_IDS.map(id => {
        const net = SUPPORTED_NETWORKS[id]
        return (
          <View
            key={id}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: net.color + '20',
              borderWidth: 1,
              borderColor: net.color + '40',
            }}
          >
            <Text style={{ fontSize: 11, color: net.color }}>{net.shortName}</Text>
          </View>
        )
      })}
    </View>
  </View>
)}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/receive/index.tsx
git commit -m "feat(mobile): show network hints on receive screen"
```

---

### Task 9: Add shared gas guard helper

**Files:**
- Create: `packages/shared/src/services/gas-guard.ts`
- Modify: `packages/shared/src/services/index.ts` (re-export)

**Context:** Before any transaction, we need to verify the user has sufficient native token for gas on the target network. This is a pure function — no ethers dependency.

**Step 1: Create gas guard service**

```typescript
// packages/shared/src/services/gas-guard.ts

/**
 * Gas Guard — pure helper to check if user has enough native token for gas.
 * No ethers dependency. Accepts pre-fetched values.
 */

export interface GasGuardResult {
  sufficient: boolean;
  nativeBalance: string;
  estimatedGasCostEth: string;
  estimatedGasCostUsd: number;
  networkId: string;
  nativeSymbol: string;
  shortfall: string; // '0' if sufficient, positive amount if not
}

/**
 * Check if user has enough native token to cover gas on a network.
 *
 * @param networkId - Target network
 * @param nativeSymbol - Native token symbol (ETH, MATIC)
 * @param nativeBalance - User's native token balance (human-readable, e.g. "0.005")
 * @param estimatedGasCostEth - Estimated gas cost in native token (human-readable, e.g. "0.001")
 * @param nativeTokenPriceUsd - Price of native token in USD
 */
export function checkGasAvailability(
  networkId: string,
  nativeSymbol: string,
  nativeBalance: string,
  estimatedGasCostEth: string,
  nativeTokenPriceUsd: number,
): GasGuardResult {
  const balance = parseFloat(nativeBalance) || 0;
  const gasCost = parseFloat(estimatedGasCostEth) || 0;
  const sufficient = balance >= gasCost;
  const shortfall = sufficient ? '0' : (gasCost - balance).toFixed(8);

  return {
    sufficient,
    nativeBalance,
    estimatedGasCostEth,
    estimatedGasCostUsd: gasCost * nativeTokenPriceUsd,
    networkId,
    nativeSymbol,
    shortfall,
  };
}
```

**Step 2: Re-export from services index**

Add to `packages/shared/src/services/index.ts`:

```typescript
export * from './gas-guard';
```

**Step 3: Commit**

```bash
git add packages/shared/src/services/gas-guard.ts packages/shared/src/services/index.ts
git commit -m "feat(shared): add gas guard helper"
```

---

### Task 10: Integrate gas guard into web send flow

**Files:**
- Modify: `apps/web/src/app/wallet/send/page.tsx`

**Context:** After gas estimation, check if user has enough native token on the target network. Show warning if not.

**Step 1: Add gas guard check**

After gas estimation succeeds, run gas guard:

```typescript
import { checkGasAvailability } from '@e-y/shared'

// In the gas estimation effect, after estimateGasOnNetwork succeeds:
const targetNetwork = route?.fromNetwork || 'ethereum'
const nativeSymbol = SUPPORTED_NETWORKS[targetNetwork]?.nativeCurrency?.symbol || 'ETH'
const nativeBalance = aggregatedBalances
  .find(t => t.symbol.toUpperCase() === nativeSymbol.toUpperCase())
  ?.networks.find(n => n.networkId === targetNetwork)
  ?.balance || '0'

const gasCheck = checkGasAvailability(
  targetNetwork,
  nativeSymbol,
  nativeBalance,
  estimate.estimatedCostEth, // from gas estimate result
  ethPrice,
)

setGasGuard(gasCheck) // new state variable
```

**Step 2: Show gas warning in UI**

```typescript
{gasGuard && !gasGuard.sufficient && (
  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
    <p className="text-sm" style={{ color: '#ef4444' }}>
      Insufficient {gasGuard.nativeSymbol} for gas on {SUPPORTED_NETWORKS[gasGuard.networkId as NetworkId]?.name}.
      Need ~{gasGuard.estimatedGasCostEth} {gasGuard.nativeSymbol}, you have {gasGuard.nativeBalance}.
    </p>
  </div>
)}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/wallet/send/page.tsx
git commit -m "feat(web): gas guard warning on send page"
```

---

### Task 11: Integrate gas guard into mobile send flow

**Files:**
- Modify: `apps/mobile/src/store/slices/send-slice.ts`

**Context:** The mobile send slice has `estimateGasThunk`. After it resolves, run gas guard and store the result.

**Step 1: Add gas guard state and logic to send-slice**

```typescript
import { checkGasAvailability, type GasGuardResult } from '@e-y/shared'

// Add to SendState interface:
gasGuardResult: GasGuardResult | null;

// In initial state:
gasGuardResult: null,

// After estimateGasThunk.fulfilled, add a reducer that also checks gas:
// Or create a separate thunk:
export const checkGasGuardThunk = createAsyncThunk(
  'send/checkGasGuard',
  async (params: { networkId: string; nativeSymbol: string; nativeBalance: string; gasCostEth: string; nativePrice: number }) => {
    return checkGasAvailability(params.networkId, params.nativeSymbol, params.nativeBalance, params.gasCostEth, params.nativePrice)
  },
)
```

**Step 2: Display gas warning in mobile send confirm screen**

In `apps/mobile/app/send/confirm.tsx`, read `gasGuardResult` from the store and show a warning banner if `!gasGuardResult.sufficient`.

**Step 3: Commit**

```bash
git add apps/mobile/src/store/slices/send-slice.ts apps/mobile/app/send/confirm.tsx
git commit -m "feat(mobile): gas guard warning in send flow"
```

---

### Task 12: Add multi-chain transaction history to shared

**Files:**
- Modify: `packages/shared/src/types/transaction.ts`
- Modify: `packages/shared/src/services/transaction-history-service.ts`

**Context:** The shared `TransactionHistoryItem` exists but doesn't include `networkId`. The `fetchTransactionHistory` function fetches from a single Alchemy URL. We need to add `networkId` to results and provide a multi-chain fetcher.

**Step 1: Add `networkId` to TransactionHistoryItem**

In `packages/shared/src/services/transaction-history-service.ts`, add `networkId` field:

```typescript
export interface TransactionHistoryItem {
  // ... existing fields ...
  networkId?: string; // NEW: which network this tx is on
}
```

**Step 2: Add `fetchMultiChainTransactionHistory` function**

```typescript
/**
 * Fetch transaction history from multiple Alchemy URLs.
 * Returns merged + sorted results.
 */
export async function fetchMultiChainTransactionHistory(
  networks: { networkId: string; alchemyUrl: string }[],
  address: string,
  limitPerNetwork: number = 10,
): Promise<TransactionHistoryItem[]> {
  const results = await Promise.allSettled(
    networks.map(async ({ networkId, alchemyUrl }) => {
      const items = await fetchTransactionHistory(alchemyUrl, address, limitPerNetwork);
      return items.map(item => ({ ...item, networkId }));
    }),
  );

  const allItems: TransactionHistoryItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // Sort by timestamp descending
  allItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return allItems;
}
```

**Step 3: Commit**

```bash
git add packages/shared/src/services/transaction-history-service.ts packages/shared/src/types/transaction.ts
git commit -m "feat(shared): multi-chain transaction history fetcher"
```

---

### Task 13: Integrate multi-chain tx history on web

**Files:**
- Modify: `apps/web/src/app/wallet/history/page.tsx` or wherever transaction history is displayed

**Context:** Find the transaction history page/component and update it to fetch from all networks for real accounts.

**Step 1: Find and update history component**

Use `fetchMultiChainTransactionHistory` from shared. Pass all network Alchemy URLs for real accounts. Add network badge to each transaction row.

**Step 2: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): multi-chain transaction history"
```

---

### Task 14: Integrate multi-chain tx history on mobile

**Files:**
- Modify: `apps/mobile/src/store/slices/transaction-slice.ts`
- Modify: `apps/mobile/app/(tabs)/transactions.tsx`

**Context:** The transaction slice has `fetchTransactionsThunk`. Update it to use `fetchMultiChainTransactionHistory` for real accounts.

**Step 1: Update `fetchTransactionsThunk`**

```typescript
import { fetchMultiChainTransactionHistory } from '@e-y/shared'
import { buildMultiNetworkRpcUrls, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared'

// In the thunk, for real accounts:
if (accountType === 'real') {
  const alchemyKey = process.env.EXPO_PUBLIC_ALCHEMY_KEY || ''
  const urls = buildMultiNetworkRpcUrls(alchemyKey)
  const networks = TIER1_NETWORK_IDS.map(id => ({
    networkId: id,
    alchemyUrl: urls[id].alchemyUrl,
  }))
  return fetchMultiChainTransactionHistory(networks, address, 20)
}
```

**Step 2: Add network badge to transaction list items**

In the transaction list component, show a small network indicator for each transaction.

**Step 3: Commit**

```bash
git add apps/mobile/src/store/slices/transaction-slice.ts apps/mobile/app/
git commit -m "feat(mobile): multi-chain transaction history"
```

---

## Phase 2: Network Abstraction UX

### Task 15: Create shared smart routing service

**Files:**
- Create: `packages/shared/src/services/smart-routing.ts`
- Modify: `packages/shared/src/services/index.ts`

**Context:** Both web and mobile have their own `calculateTransferRoute()`. The core logic is duplicated. Extract the pure decision logic into shared, keeping platform-specific bridge quote fetching in app code via dependency injection.

**Step 1: Create shared smart routing with DI for bridge quotes**

```typescript
// packages/shared/src/services/smart-routing.ts

import type { AggregatedTokenBalance } from '../types/network-balance';
import { findNetworksWithSufficientBalance, getBestNetworkForToken } from '../types/network-balance';
import { getCheapestNetwork, findNetworksWithBalance, getTokenAddressForNetwork } from './routing-helpers';

export type SmartRouteType = 'direct' | 'bridge' | 'consolidation' | 'insufficient';

export interface SmartRoute {
  type: SmartRouteType;
  fromNetwork: string;
  toNetwork: string;
  amount: string;
  symbol: string;
  /** For bridge: single bridge quote. For consolidation: per-source quotes. */
  bridgeInfo?: {
    feeUsd: number;
    estimatedTimeSeconds: number;
    needsApproval: boolean;
  };
  sources?: { networkId: string; amount: string }[];
  message: string;
}

export interface SmartRoutingParams {
  aggregatedBalances: AggregatedTokenBalance[];
  symbol: string;
  amount: string;
  recipientPreferredNetwork: string | null;
}

/**
 * Determine optimal send route. Pure function — no async, no bridge quotes.
 * Returns the route type and relevant networks. The caller fetches bridge quotes if needed.
 */
export function determineSendRoute(params: SmartRoutingParams): SmartRoute {
  const { aggregatedBalances, symbol, amount, recipientPreferredNetwork } = params;
  const upper = symbol.toUpperCase();
  const amountNum = parseFloat(amount);

  if (isNaN(amountNum) || amountNum <= 0) {
    return { type: 'insufficient', fromNetwork: '', toNetwork: '', amount, symbol: upper, message: 'Invalid amount' };
  }

  const sufficientNetworks = findNetworksWithSufficientBalance(aggregatedBalances, upper, amount);

  if (sufficientNetworks.length === 0) {
    // Check if consolidation from multiple networks would work
    const networksWithBalance = findNetworksWithBalance(aggregatedBalances, upper);
    if (networksWithBalance.length > 1) {
      const target = recipientPreferredNetwork || (getCheapestNetwork(networksWithBalance.map(n => n.networkId)) as string);
      return {
        type: 'consolidation',
        fromNetwork: networksWithBalance[0].networkId,
        toNetwork: target,
        amount,
        symbol: upper,
        sources: networksWithBalance.map(n => ({ networkId: n.networkId, amount: n.balance })),
        message: 'Consolidation needed from multiple networks',
      };
    }
    return { type: 'insufficient', fromNetwork: '', toNetwork: '', amount, symbol: upper, message: `Insufficient ${upper} balance` };
  }

  const target = recipientPreferredNetwork || (getCheapestNetwork(sufficientNetworks) as string);

  // Direct on target network?
  if (sufficientNetworks.includes(target)) {
    return {
      type: 'direct',
      fromNetwork: target,
      toNetwork: target,
      amount,
      symbol: upper,
      message: `Direct transfer on ${target}`,
    };
  }

  // Bridge from cheapest to target
  const source = getCheapestNetwork(sufficientNetworks) as string;
  return {
    type: 'bridge',
    fromNetwork: source,
    toNetwork: target,
    amount,
    symbol: upper,
    message: `Bridge from ${source} to ${target}`,
  };
}
```

**Step 2: Re-export from services index**

**Step 3: Commit**

```bash
git add packages/shared/src/services/smart-routing.ts packages/shared/src/services/index.ts
git commit -m "feat(shared): smart routing decision engine"
```

---

### Task 16: Refactor web routing service to use shared smart routing

**Files:**
- Modify: `apps/web/src/lib/routing-service.ts`

**Context:** Replace duplicated logic with `determineSendRoute` from shared. Keep the async bridge quote fetching in app code.

**Step 1: Refactor `calculateTransferRoute`**

```typescript
import { determineSendRoute, type SmartRoute } from '@e-y/shared'

export async function calculateTransferRoute(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string,
  recipientPreferredNetwork: NetworkId | null,
  fromAddress: string,
  toAddress: string,
): Promise<RoutingResult> {
  const route = determineSendRoute({ aggregatedBalances, symbol, amount, recipientPreferredNetwork })

  if (route.type === 'insufficient') {
    return { type: 'insufficient', /* ... */ message: route.message }
  }

  if (route.type === 'direct') {
    return {
      type: 'direct',
      fromNetwork: route.fromNetwork as NetworkId,
      toNetwork: route.toNetwork as NetworkId,
      amount,
      symbol: route.symbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '~15 sec',
      message: route.message,
    }
  }

  // Bridge: fetch quote
  // ... (existing bridge quote logic stays here) ...
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/routing-service.ts
git commit -m "refactor(web): use shared smart routing engine"
```

---

### Task 17: Refactor mobile routing service to use shared smart routing

**Files:**
- Modify: `apps/mobile/src/services/routing-service.ts`

**Context:** Same refactor as Task 16 but for mobile.

**Step 1: Replace duplicated logic with `determineSendRoute`**

Keep the mobile-specific `TransferRoute` type and `RoutingResult` type. Use `determineSendRoute` for the decision, then fetch bridge quotes if needed.

**Step 2: Run mobile tests**

```bash
pnpm --filter @e-y/mobile test -- --testPathPattern="routing-service"
```

**Step 3: Commit**

```bash
git add apps/mobile/src/services/routing-service.ts
git commit -m "refactor(mobile): use shared smart routing engine"
```

---

### Task 18: Add token detail page (per-network breakdown) on web

**Files:**
- Create: `apps/web/src/app/wallet/token/[symbol]/page.tsx`

**Context:** When user taps a token in the dashboard, show per-network breakdown: which networks hold that token, individual balances, and actions (send from this network, bridge to another).

**Step 1: Create token detail page**

```typescript
'use client'

import { useParams } from 'next/navigation'
import { useBalance } from '@/contexts/balance-context'
import { SUPPORTED_NETWORKS, type NetworkId } from '@e-y/shared'
import { formatUsd, formatBalance } from '@e-y/shared'

export default function TokenDetailPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const { aggregatedBalances } = useBalance()

  const token = aggregatedBalances.find(t => t.symbol.toUpperCase() === symbol?.toUpperCase())
  if (!token) return <div>Token not found</div>

  return (
    <div>
      <h1>{token.symbol}</h1>
      <p>Total: {formatBalance(token.totalBalance)} ({formatUsd(token.totalUsdValue)})</p>

      <h2>Network Breakdown</h2>
      {token.networks.filter(n => parseFloat(n.balance) > 0).map(n => {
        const net = SUPPORTED_NETWORKS[n.networkId as NetworkId]
        return (
          <div key={n.networkId} className="flex items-center gap-3 p-3 rounded-lg glass-card mb-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: net?.color }} />
            <span>{net?.name}</span>
            <span className="ml-auto">{formatBalance(n.balance)}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatUsd(n.usdValue)}</span>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Update TokenList to navigate to this page on click**

**Step 3: Commit**

```bash
git add apps/web/src/app/wallet/token/
git commit -m "feat(web): token detail page with network breakdown"
```

---

### Task 19: Enhance mobile token detail screen with network breakdown

**Files:**
- Modify: `apps/mobile/app/token/[symbol].tsx`

**Context:** Mobile already has a token detail page. Add per-network balance breakdown similar to web.

**Step 1: Read and update the token detail screen**

Add a "Network Breakdown" section showing per-network balances with colored dots and network names.

**Step 2: Commit**

```bash
git add apps/mobile/app/token/
git commit -m "feat(mobile): network breakdown in token detail"
```

---

### Task 20: Wire network preferences into smart routing

**Files:**
- Modify: `apps/web/src/app/wallet/send/page.tsx`
- Verify: `apps/mobile/src/store/slices/send-slice.ts` (already has `fetchRecipientPreferencesThunk`)

**Context:** Both platforms already fetch recipient preferences. Verify they pass `recipientPreferredNetwork` to `calculateTransferRoute`. The shared `determineSendRoute` already accepts it.

**Step 1: Verify web send page passes preferences**

In `apps/web/src/app/wallet/send/page.tsx`, the route calculation effect (around line 92-132) should already pass recipient preferences. Verify and fix if needed.

**Step 2: Verify mobile send slice passes preferences**

In `apps/mobile/src/store/slices/send-slice.ts`, `executeSmartSendThunk` should pass `recipientPreferences` to `calculateTransferRoute`. Verify and fix if needed.

**Step 3: Commit (if changes needed)**

```bash
git add apps/web/ apps/mobile/
git commit -m "fix: ensure recipient network preferences are used in routing"
```

---

## Phase 3: Swaps & Bridges (LI.FI)

### Task 21: Enhance shared swap service with cross-chain swap support

**Files:**
- Modify: `packages/shared/src/services/swap-service.ts`
- Modify: `packages/shared/src/types/swap.ts`

**Context:** The existing `fetchSwapQuote` in shared works for same-chain and cross-chain (LI.FI supports both). But the `SwapParams` might need `toChainId` if it's not already there. Verify and add if needed.

**Step 1: Check and update `SwapParams`**

In `packages/shared/src/types/swap.ts`, verify `SwapParams` has both `fromChainId` and `toChainId`. If not, add `toChainId`:

```typescript
export interface SwapParams {
  fromChainId: number;
  toChainId: number;   // ENSURE THIS EXISTS
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage?: number;
}
```

**Step 2: Verify `fetchSwapQuote` uses `toChainId`**

In `packages/shared/src/services/swap-service.ts`, verify the LI.FI API call includes `toChainId` in the request params. LI.FI's `/quote` endpoint uses `fromChain` and `toChain`.

**Step 3: Commit**

```bash
git add packages/shared/src/types/swap.ts packages/shared/src/services/swap-service.ts
git commit -m "feat(shared): ensure cross-chain swap support in swap types"
```

---

### Task 22: Add swap quote caching to shared

**Files:**
- Create: `packages/shared/src/services/quote-cache.ts`
- Modify: `packages/shared/src/services/index.ts`

**Context:** Avoid re-fetching LI.FI quotes on every keystroke. Cache quotes for 30 seconds keyed by params hash.

**Step 1: Create quote cache**

```typescript
// packages/shared/src/services/quote-cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry<unknown>>();

function hashParams(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

export function getCachedQuote<T>(params: Record<string, unknown>): T | null {
  const key = hashParams(params);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedQuote<T>(params: Record<string, unknown>, data: T): void {
  const key = hashParams(params);
  cache.set(key, { data, timestamp: Date.now() });

  // Evict old entries
  if (cache.size > 50) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.timestamp > CACHE_TTL) cache.delete(k);
    }
  }
}

export function clearQuoteCache(): void {
  cache.clear();
}
```

**Step 2: Re-export and commit**

```bash
git add packages/shared/src/services/quote-cache.ts packages/shared/src/services/index.ts
git commit -m "feat(shared): add swap quote cache (30s TTL)"
```

---

### Task 23: Integrate quote caching into web swap service

**Files:**
- Modify: `apps/web/src/lib/swap.ts`

**Context:** Wrap `getSwapQuote` with cache check.

**Step 1: Add caching**

```typescript
import { getCachedQuote, setCachedQuote } from '@e-y/shared'

export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const cached = getCachedQuote<SwapQuote>(params as Record<string, unknown>)
  if (cached) return cached

  const raw = await fetchSwapQuote(params)
  // ... existing enrichment logic ...
  const quote = { /* ... */ }

  setCachedQuote(params as Record<string, unknown>, quote)
  return quote
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/swap.ts
git commit -m "feat(web): cache swap quotes for 30s"
```

---

### Task 24: Integrate quote caching into mobile swap service

**Files:**
- Modify: `apps/mobile/src/services/swap-service.ts`

**Context:** Same as Task 23 for mobile.

**Step 1: Add caching to `getSwapQuote`**

Same pattern as web.

**Step 2: Commit**

```bash
git add apps/mobile/src/services/swap-service.ts
git commit -m "feat(mobile): cache swap quotes for 30s"
```

---

### Task 25: Enhance web swap page for cross-chain swaps

**Files:**
- Modify: `apps/web/src/app/wallet/swap/page.tsx` (if exists, otherwise look in components)

**Context:** The web swap page already exists. Update it to allow selecting different source and destination chains. LI.FI already supports cross-chain — we just need to expose chain selection in the UI.

**Step 1: Find and read the web swap page**

```bash
find apps/web/src -name "*swap*" -type f
```

**Step 2: Add chain selector dropdowns**

Add a source chain and destination chain selector. Default both to the cheapest chain with balance. When chains differ, the UI should indicate "Cross-chain swap (bridge + swap)".

**Step 3: Show route info**

Display: route steps (from LI.FI), estimated time, bridge fee, gas cost, price impact. Show slippage setting.

**Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): cross-chain swap support with chain selectors"
```

---

### Task 26: Enhance mobile swap screen for cross-chain swaps

**Files:**
- Modify: `apps/mobile/app/swap/index.tsx`
- Modify: `apps/mobile/src/store/slices/swap-slice.ts`

**Context:** Mobile swap screen already exists with `fromNetworkId` and `toNetworkId` in the swap slice. Verify the UI exposes chain selection.

**Step 1: Read the current swap screen**

Check if chain selection is already in the UI or if it needs to be added.

**Step 2: Add/enhance chain selector UI**

If not present, add network selector chips above the token selectors. Show cross-chain indicator when chains differ.

**Step 3: Commit**

```bash
git add apps/mobile/app/swap/ apps/mobile/src/store/slices/swap-slice.ts
git commit -m "feat(mobile): cross-chain swap UI with chain selectors"
```

---

### Task 27: Add auto-bridge option in send flow

**Files:**
- Modify: `apps/web/src/app/wallet/send/page.tsx`
- Modify: `apps/mobile/app/send/confirm.tsx`

**Context:** When routing determines a bridge is needed (route.type === 'bridge'), show the bridge details clearly and execute bridge automatically on confirm. Both platforms already have bridge execution logic — this task ensures the UX is smooth.

**Step 1: Web — enhance bridge route display**

When `route.type === 'bridge'`, show:
- Source and destination networks with colored badges
- Bridge fee in USD
- Estimated time
- "This will bridge your tokens first, then send" explanation

**Step 2: Mobile — same enhancements**

Same bridge info display on the confirm screen.

**Step 3: Commit**

```bash
git add apps/web/src/app/wallet/send/ apps/mobile/app/send/
git commit -m "feat: enhanced bridge info display in send flow"
```

---

### Task 28: Add gas bridge helper (bridge small ETH for gas)

**Files:**
- Create: `packages/shared/src/services/gas-bridge-helper.ts`
- Modify: `packages/shared/src/services/index.ts`

**Context:** When gas guard detects insufficient gas, offer to bridge a small amount of native token from another network.

**Step 1: Create helper**

```typescript
// packages/shared/src/services/gas-bridge-helper.ts

import type { AggregatedTokenBalance } from '../types/network-balance';
import { findNetworksWithBalance, getCheapestNetwork } from './routing-helpers';
import { NETWORK_GAS_RANKING, SUPPORTED_NETWORKS, type NetworkId } from '../config/multi-network';

export interface GasBridgeSuggestion {
  fromNetwork: string;
  toNetwork: string;
  amount: string; // amount of native token to bridge (e.g. "0.005")
  nativeSymbol: string;
  estimatedCostUsd: number; // rough estimate
}

/**
 * Suggest a gas bridge when user has insufficient native token on a network.
 * Returns null if no solution found.
 */
export function suggestGasBridge(
  targetNetwork: string,
  shortfallAmount: string,
  aggregatedBalances: AggregatedTokenBalance[],
): GasBridgeSuggestion | null {
  const nativeSymbol = SUPPORTED_NETWORKS[targetNetwork as NetworkId]?.nativeCurrency?.symbol;
  if (!nativeSymbol) return null;

  // Find other networks with this native token
  const networksWithBalance = findNetworksWithBalance(aggregatedBalances, nativeSymbol)
    .filter(n => n.networkId !== targetNetwork && parseFloat(n.balance) > 0);

  if (networksWithBalance.length === 0) return null;

  const sourceNetwork = getCheapestNetwork(networksWithBalance.map(n => n.networkId));
  if (!sourceNetwork) return null;

  // Bridge 2x the shortfall as safety margin
  const bridgeAmount = (parseFloat(shortfallAmount) * 2).toFixed(6);

  return {
    fromNetwork: sourceNetwork,
    toNetwork: targetNetwork,
    amount: bridgeAmount,
    nativeSymbol,
    estimatedCostUsd: 0.5, // rough estimate, will be replaced by actual bridge quote
  };
}
```

**Step 2: Re-export and commit**

```bash
git add packages/shared/src/services/gas-bridge-helper.ts packages/shared/src/services/index.ts
git commit -m "feat(shared): gas bridge suggestion helper"
```

---

### Task 29: Integrate gas bridge suggestion into web send flow

**Files:**
- Modify: `apps/web/src/app/wallet/send/page.tsx`

**Context:** When gas guard fails, show a "Bridge gas" button that triggers a small bridge transaction.

**Step 1: Add gas bridge suggestion to gas guard warning**

```typescript
import { suggestGasBridge } from '@e-y/shared'

// After gasGuard shows insufficient:
const gasBridgeSuggestion = gasGuard && !gasGuard.sufficient
  ? suggestGasBridge(gasGuard.networkId, gasGuard.shortfall, aggregatedBalances)
  : null

// In UI:
{gasBridgeSuggestion && (
  <button onClick={() => handleGasBridge(gasBridgeSuggestion)}>
    Bridge {gasBridgeSuggestion.amount} {gasBridgeSuggestion.nativeSymbol} from {gasBridgeSuggestion.fromNetwork}
  </button>
)}
```

**Step 2: Implement `handleGasBridge`**

Fetch bridge quote via `fetchBridgeQuote`, confirm with user, execute via `bridge-service.ts`.

**Step 3: Commit**

```bash
git add apps/web/src/app/wallet/send/page.tsx
git commit -m "feat(web): gas bridge quick action in send flow"
```

---

### Task 30: Integrate gas bridge suggestion into mobile send flow

**Files:**
- Modify: `apps/mobile/app/send/confirm.tsx`

**Context:** Same as Task 29 for mobile.

**Step 1: Show gas bridge suggestion when gas guard fails**

**Step 2: Commit**

```bash
git add apps/mobile/app/send/
git commit -m "feat(mobile): gas bridge quick action in send flow"
```

---

### Task 31: Add slippage settings to shared

**Files:**
- Create: `packages/shared/src/constants/swap-settings.ts`
- Modify: `packages/shared/src/constants/index.ts`

**Step 1: Create swap settings constants**

```typescript
// packages/shared/src/constants/swap-settings.ts

export const DEFAULT_SLIPPAGE = 0.005; // 0.5%
export const MAX_SLIPPAGE = 0.03;      // 3%
export const SLIPPAGE_OPTIONS = [0.001, 0.005, 0.01, 0.03]; // 0.1%, 0.5%, 1%, 3%
export const PRICE_IMPACT_WARNING_THRESHOLD = 0.02; // 2%
export const SWAP_DEADLINE_SECONDS = 20 * 60; // 20 minutes
export const QUOTE_REFRESH_INTERVAL = 30_000; // 30 seconds
```

**Step 2: Re-export and commit**

```bash
git add packages/shared/src/constants/swap-settings.ts packages/shared/src/constants/index.ts
git commit -m "feat(shared): swap settings constants"
```

---

### Task 32: Add slippage selector to web swap page

**Files:**
- Modify: `apps/web/src/app/wallet/swap/page.tsx`

**Context:** Add slippage selection UI using the constants from shared.

**Step 1: Add slippage selector**

Show preset buttons (0.1%, 0.5%, 1%, 3%) and a custom input. Use `SLIPPAGE_OPTIONS` from shared. Show price impact warning when `quote.priceImpact > PRICE_IMPACT_WARNING_THRESHOLD`.

**Step 2: Commit**

```bash
git add apps/web/src/app/wallet/swap/
git commit -m "feat(web): slippage selector and price impact warning"
```

---

### Task 33: Add slippage selector to mobile swap screen

**Files:**
- Modify: `apps/mobile/app/swap/index.tsx`
- Modify: `apps/mobile/src/store/slices/swap-slice.ts`

**Context:** Same as Task 32 for mobile. The swap slice already has a `slippage` field.

**Step 1: Add slippage selector UI and price impact warning**

**Step 2: Commit**

```bash
git add apps/mobile/app/swap/ apps/mobile/src/store/slices/swap-slice.ts
git commit -m "feat(mobile): slippage selector and price impact warning"
```

---

### Task 34: Type-check entire monorepo

**Files:** None (verification only)

**Step 1: Run type checks on all workspaces**

```bash
cd "/Users/daniillogachev/Ma project/E-Y"
pnpm --filter @e-y/shared typecheck
pnpm --filter @e-y/web exec -- npx tsc --noEmit
pnpm --filter @e-y/mobile exec -- npx tsc --noEmit
```

**Step 2: Fix any type errors**

Address all TypeScript errors found.

**Step 3: Commit fixes**

```bash
git add .
git commit -m "fix: resolve type errors after multi-network implementation"
```

---

### Task 35: Run mobile tests and fix failures

**Step 1: Run all mobile tests**

```bash
pnpm --filter @e-y/mobile test
```

**Step 2: Fix any test failures**

Especially routing-service tests, bridge-service tests, and swap-service tests — these are most likely to break due to the routing refactor.

**Step 3: Commit fixes**

```bash
git add apps/mobile/
git commit -m "fix: update mobile tests for multi-network changes"
```

---

### Task 36: Final verification and deploy

**Step 1: Build web app**

```bash
cd "/Users/daniillogachev/Ma project/E-Y"
pnpm --filter @e-y/web build
```

**Step 2: Build shared package**

```bash
pnpm --filter @e-y/shared build
```

**Step 3: Deploy web app to Vercel**

```bash
cd "/Users/daniillogachev/Ma project/E-Y"
vercel --prod
```

**Step 4: Verify on production**

Open https://e-y-app.vercel.app, test:
- Real account shows balances from multiple networks
- Token list shows network badges
- Send flow auto-selects network
- Swap page works with cross-chain
- Gas guard shows warnings appropriately
