# ERC-20 Token Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ERC-20 token balance support with auto-detection, USD prices, and token icons.

**Architecture:** Use Alchemy Token Balances API to auto-detect all ERC-20 tokens, CoinGecko for prices (existing), Trust Wallet Assets CDN for icons. Metadata cached forever (immutable).

**Tech Stack:** Alchemy JSON-RPC, CoinGecko API, Trust Wallet GitHub CDN, AsyncStorage for caching, React Native Image component.

---

## Task 1: Extend TokenBalance Interface

**Files:**
- Modify: `apps/mobile/src/services/balance-service.ts:51-58`

**Step 1: Update TokenBalance interface**

Add the new fields needed for ERC-20 support:

```typescript
export interface TokenBalance {
  token: string;          // 'ETH' or contract address (0x...)
  symbol: string;         // 'ETH', 'USDC', 'USDT'
  name: string;           // 'Ethereum', 'USD Coin'
  balance: string;        // Human-readable balance (e.g., "1.5")
  balanceRaw: string;     // Raw balance in smallest unit (for sending)
  decimals: number;       // 18 for ETH, 6 for USDC
  usdValue?: number;      // USD value
  iconUrl?: string;       // Trust Wallet CDN URL or null
  lastUpdated: number;    // Timestamp
}
```

**Step 2: Update fetchEthBalance to include new fields**

```typescript
export async function fetchEthBalance(address: string): Promise<TokenBalance> {
  try {
    const rpcProvider = getProvider();
    const balanceWei = await Promise.race([
      rpcProvider.getBalance(address),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), 15000)
      ),
    ]);
    const balance = formatEther(balanceWei);

    return {
      token: 'ETH',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: parseFloat(balance).toFixed(6),
      balanceRaw: balanceWei.toString(),
      decimals: 18,
      iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    // ... existing error handling
  }
}
```

**Step 3: Verify app still compiles**

Run: `cd apps/mobile && npx expo start --clear`
Expected: App starts without TypeScript errors

**Step 4: Commit**

```bash
git add apps/mobile/src/services/balance-service.ts
git commit -m "feat(balance): extend TokenBalance interface for ERC-20 support"
```

---

## Task 2: Add Alchemy Token Balances API

**Files:**
- Modify: `apps/mobile/src/services/balance-service.ts`

**Step 1: Add Alchemy API types**

Add after the TokenBalance interface:

```typescript
// Alchemy API response types
interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string; // hex string
}

interface AlchemyTokenBalancesResponse {
  jsonrpc: string;
  id: number;
  result: {
    address: string;
    tokenBalances: AlchemyTokenBalance[];
  };
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

interface AlchemyTokenMetadataResponse {
  jsonrpc: string;
  id: number;
  result: AlchemyTokenMetadata;
}
```

**Step 2: Add Alchemy URL helper**

```typescript
const getAlchemyUrl = (): string => {
  return `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
};
```

**Step 3: Implement fetchAllTokenBalances function**

```typescript
/**
 * Fetch all ERC-20 token balances for an address using Alchemy API
 */
export async function fetchAllTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(getAlchemyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Alchemy API error:', response.status);
      return [];
    }

    const data: AlchemyTokenBalancesResponse = await response.json();

    // Filter out zero balances
    return data.result.tokenBalances.filter(
      (token) => token.tokenBalance !== '0x0' && token.tokenBalance !== '0x'
    );
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error fetching token balances:', error);
    return [];
  }
}
```

**Step 4: Commit**

```bash
git add apps/mobile/src/services/balance-service.ts
git commit -m "feat(balance): add Alchemy token balances API integration"
```

---

## Task 3: Add Token Metadata Fetching with Caching

**Files:**
- Modify: `apps/mobile/src/services/balance-service.ts`

**Step 1: Add AsyncStorage import**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Step 2: Add metadata cache key and helpers**

```typescript
const TOKEN_METADATA_CACHE_KEY = 'token_metadata_cache';

interface CachedTokenMetadata {
  [contractAddress: string]: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Get cached token metadata
 */
async function getCachedMetadata(): Promise<CachedTokenMetadata> {
  try {
    const cached = await AsyncStorage.getItem(TOKEN_METADATA_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.warn('Error reading metadata cache:', error);
    return {};
  }
}

/**
 * Save token metadata to cache
 */
async function setCachedMetadata(metadata: CachedTokenMetadata): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_METADATA_CACHE_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.warn('Error caching metadata:', error);
  }
}
```

**Step 3: Implement fetchTokenMetadata function**

```typescript
/**
 * Fetch token metadata from Alchemy API
 */
export async function fetchTokenMetadata(
  contractAddress: string
): Promise<{ name: string; symbol: string; decimals: number } | null> {
  // Check cache first
  const cache = await getCachedMetadata();
  if (cache[contractAddress.toLowerCase()]) {
    return cache[contractAddress.toLowerCase()];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(getAlchemyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Alchemy metadata API error:', response.status);
      return null;
    }

    const data: AlchemyTokenMetadataResponse = await response.json();
    const { name, symbol, decimals } = data.result;

    // Cache the metadata (immutable)
    const updatedCache = { ...cache, [contractAddress.toLowerCase()]: { name, symbol, decimals } };
    await setCachedMetadata(updatedCache);

    return { name, symbol, decimals };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error fetching token metadata:', error);
    return null;
  }
}
```

**Step 4: Add Trust Wallet icon URL helper**

```typescript
/**
 * Get token icon URL from Trust Wallet Assets
 */
export function getTokenIconUrl(contractAddress: string): string {
  const checksumAddress = contractAddress; // Could add checksum conversion if needed
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`;
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/services/balance-service.ts
git commit -m "feat(balance): add token metadata fetching with caching"
```

---

## Task 4: Add Multi-Token Price Fetching

**Files:**
- Modify: `apps/mobile/src/services/balance-service.ts`

**Step 1: Add price cache for multiple tokens**

```typescript
const TOKEN_PRICES_CACHE_KEY = 'token_prices_cache';

interface CachedTokenPrices {
  prices: { [contractAddress: string]: number };
  ethPrice: number;
  timestamp: number;
}

/**
 * Get cached token prices
 */
async function getCachedTokenPrices(): Promise<CachedTokenPrices | null> {
  try {
    const cached = await SecureStore.getItemAsync(TOKEN_PRICES_CACHE_KEY);
    if (!cached) return null;

    const data: CachedTokenPrices = JSON.parse(cached);
    if (Date.now() - data.timestamp < ETH_PRICE_CACHE_DURATION) {
      return data;
    }
    return null;
  } catch (error) {
    console.warn('Error reading token prices cache:', error);
    return null;
  }
}

/**
 * Save token prices to cache
 */
async function setCachedTokenPrices(prices: CachedTokenPrices): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_PRICES_CACHE_KEY, JSON.stringify(prices));
  } catch (error) {
    console.warn('Error caching token prices:', error);
  }
}
```

**Step 2: Implement fetchTokenPrices function**

```typescript
/**
 * Fetch USD prices for ETH and multiple tokens
 * Uses CoinGecko API with caching
 */
export async function fetchTokenPrices(
  contractAddresses: string[]
): Promise<{ ethPrice: number; tokenPrices: { [address: string]: number } }> {
  // Check cache first
  const cached = await getCachedTokenPrices();
  if (cached) {
    return { ethPrice: cached.ethPrice, tokenPrices: cached.prices };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Fetch ETH price
    const ethResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    let ethPrice = 0;
    if (ethResponse.ok) {
      const ethData = await ethResponse.json();
      ethPrice = ethData.ethereum?.usd || 0;
    }

    // Fetch token prices if we have contract addresses
    const tokenPrices: { [address: string]: number } = {};

    if (contractAddresses.length > 0) {
      // CoinGecko supports up to 100 addresses per request
      const addressList = contractAddresses.slice(0, 100).join(',');

      // Note: On testnet (Sepolia), tokens won't have prices on CoinGecko
      // This will work on mainnet
      const tokenResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressList}&vs_currencies=usd`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }
      );

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        for (const [address, priceData] of Object.entries(tokenData)) {
          tokenPrices[address.toLowerCase()] = (priceData as { usd?: number })?.usd || 0;
        }
      }
    }

    clearTimeout(timeoutId);

    // Cache the prices
    await setCachedTokenPrices({
      prices: tokenPrices,
      ethPrice,
      timestamp: Date.now(),
    });

    return { ethPrice, tokenPrices };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error fetching token prices:', error);

    // Try to use cached prices even if expired
    const expiredCache = await getCachedTokenPrices();
    if (expiredCache) {
      return { ethPrice: expiredCache.ethPrice, tokenPrices: expiredCache.prices };
    }

    return { ethPrice: 0, tokenPrices: {} };
  }
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/services/balance-service.ts
git commit -m "feat(balance): add multi-token price fetching via CoinGecko"
```

---

## Task 5: Create Combined Balance Fetcher

**Files:**
- Modify: `apps/mobile/src/services/balance-service.ts`

**Step 1: Add helper to format raw balance**

```typescript
/**
 * Format raw token balance to human-readable string
 */
export function formatTokenBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
    return '0';
  }

  // Convert hex to BigInt
  const balance = BigInt(rawBalance);
  const divisor = BigInt(10 ** decimals);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  // Format fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  // Trim trailing zeros but keep at least 2 decimal places for display
  const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '') || '0';

  if (wholePart === BigInt(0) && balance > BigInt(0)) {
    return `0.${fractionalStr.slice(0, 6)}`;
  }

  return `${wholePart}.${trimmedFractional}`;
}
```

**Step 2: Implement fetchAllBalances combining ETH and ERC-20**

```typescript
/**
 * Fetch all balances (ETH + ERC-20) for an address
 * This is the main function to call from Redux
 */
export async function fetchAllBalances(address: string): Promise<{
  balances: TokenBalance[];
  ethPrice: number;
  totalUsdValue: number;
}> {
  // Fetch ETH balance and ERC-20 balances in parallel
  const [ethBalance, tokenBalances] = await Promise.all([
    fetchEthBalance(address),
    fetchAllTokenBalances(address),
  ]);

  // Get contract addresses for price lookup
  const contractAddresses = tokenBalances.map((t) => t.contractAddress);

  // Fetch prices and metadata in parallel
  const [{ ethPrice, tokenPrices }, ...metadataResults] = await Promise.all([
    fetchTokenPrices(contractAddresses),
    ...tokenBalances.map((t) => fetchTokenMetadata(t.contractAddress)),
  ]);

  // Calculate ETH USD value
  const ethUsdValue = parseFloat(ethBalance.balance) * ethPrice;
  const ethBalanceWithPrice: TokenBalance = {
    ...ethBalance,
    usdValue: ethUsdValue,
  };

  // Process ERC-20 tokens
  const erc20Balances: TokenBalance[] = [];

  for (let i = 0; i < tokenBalances.length; i++) {
    const tokenData = tokenBalances[i];
    const metadata = metadataResults[i];

    if (!metadata) {
      // Skip tokens without metadata
      continue;
    }

    const balance = formatTokenBalance(tokenData.tokenBalance, metadata.decimals);
    const balanceNum = parseFloat(balance);

    // Skip zero balances
    if (balanceNum === 0) continue;

    const price = tokenPrices[tokenData.contractAddress.toLowerCase()] || 0;
    const usdValue = balanceNum * price;

    erc20Balances.push({
      token: tokenData.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance,
      balanceRaw: tokenData.tokenBalance,
      decimals: metadata.decimals,
      usdValue,
      iconUrl: getTokenIconUrl(tokenData.contractAddress),
      lastUpdated: Date.now(),
    });
  }

  // Combine and sort by USD value (highest first)
  const allBalances = [ethBalanceWithPrice, ...erc20Balances].sort(
    (a, b) => (b.usdValue || 0) - (a.usdValue || 0)
  );

  const totalUsdValue = calculateTotalUsdValue(allBalances);

  return {
    balances: allBalances,
    ethPrice,
    totalUsdValue,
  };
}
```

**Step 3: Export new functions**

Ensure all new functions are exported at the end of the file.

**Step 4: Commit**

```bash
git add apps/mobile/src/services/balance-service.ts
git commit -m "feat(balance): add combined balance fetcher for ETH and ERC-20"
```

---

## Task 6: Update Redux Balance Slice

**Files:**
- Modify: `apps/mobile/src/store/slices/balance-slice.ts`

**Step 1: Update import to include new function**

```typescript
import {
  fetchAllBalances,
  calculateTotalUsdValue,
  type TokenBalance
} from '@/src/services/balance-service';
```

**Step 2: Update fetchBalancesThunk to use new fetcher**

```typescript
/**
 * Fetch balances for an address
 * Fetches ETH + all ERC-20 tokens with prices
 */
export const fetchBalancesThunk = createAsyncThunk(
  'balance/fetchBalances',
  async (address: string) => {
    const result = await fetchAllBalances(address);
    return result;
  }
);
```

**Step 3: Update BalanceState to include tokenPrices (optional)**

The existing state structure should work, but verify the fulfilled handler:

```typescript
.addCase(fetchBalancesThunk.fulfilled, (state, action) => {
  state.balances = action.payload.balances;
  state.ethUsdPrice = action.payload.ethPrice;
  state.totalUsdValue = action.payload.totalUsdValue;
  state.status = 'succeeded';
  state.lastUpdated = Date.now();
  state.error = null;
})
```

**Step 4: Verify app compiles and runs**

Run: `cd apps/mobile && npx expo start --clear`
Expected: App starts, home screen shows balances

**Step 5: Commit**

```bash
git add apps/mobile/src/store/slices/balance-slice.ts
git commit -m "feat(balance): update Redux slice to use combined balance fetcher"
```

---

## Task 7: Add Token Icon Images to Home Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/home.tsx`

**Step 1: Add Image import**

```typescript
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Alert, TextInput, RefreshControl, Image } from 'react-native';
```

**Step 2: Add state for icon loading errors**

Add inside the component, after other state:

```typescript
const [iconErrors, setIconErrors] = useState<{ [key: string]: boolean }>({});

const handleIconError = (tokenKey: string) => {
  setIconErrors((prev) => ({ ...prev, [tokenKey]: true }));
};
```

**Step 3: Create TokenIcon component**

Add before the return statement:

```typescript
const TokenIcon = ({ token, size = 48 }: { token: TokenBalance; size?: number }) => {
  const showFallback = iconErrors[token.token] || !token.iconUrl;

  if (showFallback) {
    return (
      <View style={[styles.tokenIcon, size === 32 && styles.tokenIconSmall]}>
        <Text style={[size === 32 ? styles.tokenIconTextSmall : styles.tokenIconText, theme.typography.caption]}>
          {token.symbol.slice(0, 3).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: token.iconUrl }}
      style={[styles.tokenIconImage, { width: size, height: size, borderRadius: size / 4 }]}
      onError={() => handleIconError(token.token)}
    />
  );
};
```

**Step 4: Update large token card to use TokenIcon**

Replace the existing token icon View (around line 207-209):

```typescript
{/* Large Token Card (Primary) */}
{ethBalance && (
  <View style={styles.tokenCardLarge}>
    <View style={styles.tokenCardHeader}>
      <TokenIcon token={ethBalance} size={48} />
      <View style={styles.tokenInfo}>
        <Text style={[styles.tokenName, theme.typography.heading]}>{ethBalance.name || 'Ethereum'}</Text>
        <Text style={[styles.tokenTicker, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          {ethBalance.symbol}
        </Text>
      </View>
    </View>
    <View style={styles.tokenCardBody}>
      <Text style={[styles.tokenBalance, theme.typography.title]}>
        {ethBalance.balance} {ethBalance.symbol}
      </Text>
      <Text style={[styles.tokenValue, theme.typography.caption, { color: theme.colors.textSecondary }]}>
        {ethBalance.usdValue ? formatUsdValue(ethBalance.usdValue) : '$0.00'}
      </Text>
    </View>
  </View>
)}
```

**Step 5: Update token grid to use TokenIcon**

Update the small token cards (around line 233-252):

```typescript
{balance.balances
  .filter((b) => b.token !== 'ETH')
  .map((token) => (
    <View key={token.token} style={styles.tokenCardSmall}>
      <View style={styles.tokenCardHeader}>
        <TokenIcon token={token} size={32} />
        <View style={styles.tokenInfo}>
          <Text style={[styles.tokenName, theme.typography.body]}>{token.name || token.symbol}</Text>
        </View>
      </View>
      <Text style={[styles.tokenBalanceSmall, theme.typography.body]}>
        {token.balance} {token.symbol}
      </Text>
      {token.usdValue !== undefined && token.usdValue > 0 && (
        <Text style={[styles.tokenValueSmall, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          {formatUsdValue(token.usdValue)}
        </Text>
      )}
    </View>
  ))}
```

**Step 6: Add tokenIconImage style**

Add to StyleSheet:

```typescript
tokenIconImage: {
  backgroundColor: theme.colors.surface,
},
```

**Step 7: Import TokenBalance type**

```typescript
import { formatUsdValue, type TokenBalance } from '@/src/services/balance-service';
```

**Step 8: Commit**

```bash
git add apps/mobile/app/\(tabs\)/home.tsx
git commit -m "feat(ui): add token icon images with fallback on home screen"
```

---

## Task 8: Update Token Selection Screen

**Files:**
- Modify: `apps/mobile/app/send/token.tsx`

**Step 1: Add Image import**

```typescript
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
```

**Step 2: Add icon error state and handler**

```typescript
const [iconErrors, setIconErrors] = useState<{ [key: string]: boolean }>({});

const handleIconError = (tokenKey: string) => {
  setIconErrors((prev) => ({ ...prev, [tokenKey]: true }));
};
```

**Step 3: Update token item to show icon**

Replace the token icon rendering (around line 53-55):

```typescript
{balance.balances.map((token) => (
  <TouchableOpacity
    key={token.symbol}
    style={styles.tokenItem}
    onPress={() => handleTokenSelect(token.symbol)}
  >
    <View style={styles.tokenIcon}>
      {token.iconUrl && !iconErrors[token.token] ? (
        <Image
          source={{ uri: token.iconUrl }}
          style={styles.tokenIconImage}
          onError={() => handleIconError(token.token)}
        />
      ) : (
        <View style={styles.tokenIconFallback}>
          <Text style={[styles.tokenIconText, theme.typography.heading]}>
            {token.symbol.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
    <View style={styles.tokenInfo}>
      <Text style={[styles.tokenName, theme.typography.heading]}>
        {token.name || token.symbol}
      </Text>
      <Text style={[styles.tokenSymbol, theme.typography.caption, { color: theme.colors.textSecondary }]}>
        {token.symbol}
      </Text>
    </View>
    <View style={styles.tokenBalance}>
      <Text style={[styles.balance, theme.typography.heading]}>
        {parseFloat(token.balance).toFixed(6)}
      </Text>
      <Text style={[styles.balanceUsd, theme.typography.caption, { color: theme.colors.textSecondary }]}>
        {token.usdValue ? `$${token.usdValue.toFixed(2)}` : '$0.00'}
      </Text>
    </View>
  </TouchableOpacity>
))}
```

**Step 4: Add styles for icon image**

```typescript
tokenIconImage: {
  width: 40,
  height: 40,
  borderRadius: 20,
},
tokenIconFallback: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: theme.colors.buttonPrimary,
  justifyContent: 'center',
  alignItems: 'center',
},
tokenIconText: {
  color: theme.colors.buttonPrimaryText,
  fontSize: 14,
},
```

**Step 5: Add useState import**

```typescript
import { useEffect, useState } from 'react';
```

**Step 6: Commit**

```bash
git add apps/mobile/app/send/token.tsx
git commit -m "feat(ui): add token icons to send token selection screen"
```

---

## Task 9: Install AsyncStorage Dependency (if needed)

**Files:**
- Check: `apps/mobile/package.json`

**Step 1: Check if AsyncStorage is installed**

Run: `cd apps/mobile && grep -i asyncstorage package.json`

If not found, install it:

Run: `cd apps/mobile && npx expo install @react-native-async-storage/async-storage`

**Step 2: Verify installation**

Run: `cd apps/mobile && npx expo start --clear`
Expected: App starts without import errors

**Step 3: Commit if package was added**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore: add @react-native-async-storage/async-storage"
```

---

## Task 10: Test Full Flow

**Step 1: Start the app**

Run: `cd apps/mobile && npx expo start --clear`

**Step 2: Test wallet with ETH only**

- Open app
- Verify ETH balance displays with icon
- Verify USD value shows
- Verify pull-to-refresh works
- Expected: Same behavior as before

**Step 3: Test wallet with ERC-20 tokens**

If you have testnet tokens (Sepolia USDC, etc.):
- Verify all tokens appear in token list
- Verify icons load (or fallback shows)
- Verify USD values (will be $0 on testnet)
- Verify send flow shows all tokens

**Step 4: Test error scenarios**

- Disconnect network and pull-to-refresh
- Verify graceful degradation (shows cached data or error message)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(balance): complete ERC-20 token support implementation

- Add Alchemy Token Balances API integration
- Add token metadata caching (immutable)
- Add multi-token price fetching via CoinGecko
- Add Trust Wallet icon support with fallback
- Update Redux slice for combined balance fetching
- Update home screen with token icons
- Update send token selection with icons

Closes FR-1.4 (E-9)"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extend TokenBalance interface | balance-service.ts |
| 2 | Add Alchemy Token Balances API | balance-service.ts |
| 3 | Add token metadata with caching | balance-service.ts |
| 4 | Add multi-token price fetching | balance-service.ts |
| 5 | Create combined balance fetcher | balance-service.ts |
| 6 | Update Redux slice | balance-slice.ts |
| 7 | Add icons to home screen | home.tsx |
| 8 | Add icons to token selector | token.tsx |
| 9 | Install AsyncStorage (if needed) | package.json |
| 10 | Test full flow | - |

**Total commits:** 9-10
**Estimated tasks:** 10
