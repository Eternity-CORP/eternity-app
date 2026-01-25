# Network Abstraction Architecture v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hide network complexity from users while giving recipients control over where they receive tokens.

**Architecture:** Single source of truth (address_preferences), auto-sync to backend, priority-based resolution (token override > default > any).

**Tech Stack:** Redux Toolkit, AsyncStorage, Backend API (NestJS), LI.FI for bridging.

---

## 1. Core Principles

- **Zero config by default** — new users don't need to set anything
- **One setting for most users** — default receiving network
- **Token exceptions for power users** — override default for specific tokens
- **Automatic sync** — preferences sync to backend transparently

---

## 2. Data Model

### Frontend (Redux State)

```typescript
interface UserNetworkPreferences {
  // Global default (null = any network, sender chooses)
  defaultNetwork: NetworkId | null;

  // Per-token overrides (only if different from default)
  tokenOverrides: {
    [symbol: string]: NetworkId;
  };

  updatedAt: string;
}
```

### Backend (PostgreSQL)

```sql
-- Preferences stored by address (single source of truth)
CREATE TABLE address_preferences (
  address         VARCHAR(42) PRIMARY KEY,
  default_network VARCHAR(20),
  token_overrides JSONB DEFAULT '{}',
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Username is just an alias to address
CREATE TABLE usernames (
  username   VARCHAR(20) PRIMARY KEY,
  address    VARCHAR(42) NOT NULL REFERENCES address_preferences(address),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Endpoints

### Lookup

```
GET /api/username/:username
→ { username, address, preferences }

GET /api/address/:address/preferences
→ { address, preferences }
```

### Update (authenticated via signature)

```
PUT /api/preferences
Body: { defaultNetwork, tokenOverrides }
Auth: Signature of message "E-Y:preferences:{address}:{timestamp}"
→ Uses signer address as key
```

---

## 4. Priority Resolution

When sender needs to determine recipient's preferred network for a token:

```typescript
function getPreferredNetwork(
  preferences: UserNetworkPreferences | null,
  tokenSymbol: string
): NetworkId | null {
  if (!preferences) return null; // any network

  // 1. Token-specific override (highest priority)
  if (preferences.tokenOverrides[tokenSymbol]) {
    return preferences.tokenOverrides[tokenSymbol];
  }

  // 2. Default network
  return preferences.defaultNetwork; // may be null (any)
}
```

---

## 5. Receiver Settings UI

Minimal, non-overwhelming interface:

```
┌─────────────────────────────────────────────────────────────┐
│  Network Preferences                                        │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Default Receiving Network                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ◉ Any network (sender chooses)                     │   │
│  │  ○ Base (recommended - lowest fees)                 │   │
│  │  ○ Polygon                                          │   │
│  │  ○ Arbitrum                                         │   │
│  │  ○ Optimism                                         │   │
│  │  ○ Ethereum                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Token Exceptions                                   [+ Add] │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  USDC  →  Polygon                            [✕]    │   │
│  │  ETH   →  Ethereum                           [✕]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ Shared when someone sends to you                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Popular Tokens List (for exceptions)

```typescript
const POPULAR_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'DAI', name: 'Dai' },
  { symbol: 'WETH', name: 'Wrapped Ether' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'LINK', name: 'Chainlink' },
];
```

---

## 6. Sender Flow

### Step-by-step

1. **Recipient Input** (`/send/recipient`)
   - User enters @username or 0x address
   - Immediately fetch preferences (debounced 300ms)
   - Store in `send-slice.recipientPreferences`

2. **Token Selection** (`/send/token`)
   - Preferences already loaded
   - Can show indicator if recipient prefers specific network

3. **Amount Input** (`/send/amount`)
   - Standard flow

4. **Confirm** (`/send/confirm`)
   - Resolve preferred network for selected token
   - Calculate route (direct / bridge / consolidation)
   - Show appropriate UI:
     - Direct: simple confirm
     - Bridge: BridgeCostBanner with alternative
     - Consolidation: ConsolidationBanner with options

5. **Execute**
   - Execute based on route type

### Preferences Fetch (with retry)

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) return null;
      await sleep(delay * (i + 1));
    }
  }
  return null;
}
```

If fetch fails after retries: show warning, continue with "any network".

---

## 7. Transaction Execution

### Direct Transfer
```
1 transaction on same network
→ Standard sendTransaction()
```

### Bridge Transfer
```
1 transaction via LI.FI
→ Get tx data from bridge quote
→ Execute bridge transaction
→ LI.FI handles cross-chain delivery
```

### Consolidation Transfer
```
Sequential transactions with progress UI:
  ✓ Polygon → Base (50 USDC)     Done
  ◐ Arbitrum → Base (30 USDC)    Pending...
  ○ Direct on Base (20 USDC)     Waiting

If one fails:
  - Show partial success
  - Option to retry failed
  - Option to complete with partial amount
```

---

## 8. Sync Flow

### On Preference Change (Receiver)

```
1. User changes setting in UI
2. Redux state updates immediately
3. AsyncStorage saves locally
4. Background API call to sync
5. If sync fails: retry on next app open
```

### On Send (Sender)

```
1. Enter recipient
2. Resolve address (if username)
3. GET /api/address/:address/preferences
4. Cache in send-slice for session
5. Use for routing calculation
```

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Preferences fetch fails | Retry 2x, then fallback to "any network" with warning |
| Bridge quote fails | Show error, suggest direct send on available network |
| Bridge execution fails | Show error, funds stay in wallet |
| Consolidation partial fail | Show which succeeded/failed, option to retry |
| Sync to backend fails | Save locally, retry on next change/app open |

---

## 10. Implementation Tasks

1. **Backend API**
   - Add `address_preferences` table
   - Add `GET/PUT /api/preferences` endpoints
   - Update username lookup to include preferences

2. **Frontend State**
   - Update `network-preferences-slice` with new model
   - Add `recipientPreferences` to `send-slice`
   - Add `fetchRecipientPreferencesThunk`

3. **Settings UI**
   - Redesign `/settings/networks` with new UI
   - Add default network selector
   - Add token exceptions manager

4. **Send Flow**
   - Fetch preferences on recipient input
   - Pass preferences to routing service
   - Update confirm screen to use resolved preferences

5. **Execution**
   - Implement bridge execution via LI.FI
   - Implement consolidation with sequential execution
   - Add progress UI for multi-tx operations

---

## 11. Migration

For existing users:
- Per-token preferences migrate to `tokenOverrides`
- No `defaultNetwork` set (remains "any")
- Prompt to set default on first visit to settings
