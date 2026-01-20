# Network Preferences Design - E-Y

**Author:** Daniel + Claude
**Date:** 2026-01-20
**Status:** APPROVED

---

## Problem Statement

Crypto transfers scare regular users due to network complexity. However, there are two user groups:
- **Newcomers** — don't care which network they receive on
- **Experienced users** — need control (salary on specific network, exchange workflows)

**Goal:** Preserve E-Y's "banking" simplicity while giving control to those who need it — without becoming another complex wallet.

---

## Core Principle

> **"Networks don't exist until they matter"**

Newcomers never see networks. Experienced users see them only when it affects something (fees, preferences).

---

## Architecture: "Network Follows the Money"

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Don't move without need** | No automatic bridges on deposit |
| **No "home" network** | E-Y is not tied to any specific network |
| **Transparency on demand** | UI shows "USDC: 100", but details can be expanded |
| **Preferences are optional** | Not configured = receive where sender sends from |
| **Bridge only with consent** | Always show cost, offer alternatives |

### Supported Networks v1.0

**Tier 1 (full support):**
- Ethereum
- Polygon
- Arbitrum
- Base
- Optimism

**Smart Scanning:**
- Periodic check of Tier 2 networks (BSC, Avalanche, zkSync)
- If balance found → notify user with bridge offer

---

## User Preferences System

### Preference Storage

```typescript
interface NetworkPreferences {
  // Per-token preferences
  tokenPreferences: {
    [tokenSymbol: string]: {
      preferredNetwork: NetworkId | null; // null = no preference
      updatedAt: string;
    }
  };
  // Default behavior when no preference set
  defaultBehavior: 'sender_network' | 'cheapest_gas';
}
```

### Settings UI

```
┌─────────────────────────────────────────────────────┐
│ Network Preferences                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ When I receive tokens, prefer:                       │
│                                                      │
│ ETH    [Any network ▼]                              │
│ USDC   [Arbitrum ▼]      ← user configured          │
│ USDT   [Any network ▼]                              │
│                                                      │
│ ℹ️ "Any network" = you receive on the same network   │
│    the sender uses (no conversion fees)             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Transfer Logic

### Algorithm

```
SEND(@recipient, amount, token):

1. Get @recipient's preference for this token

2. If NO preference:
   - preferred_network = NULL

3. Collect sender's balances across networks

4. If preferred_network exists:
   - Priority: take from preferred_network first
   - If not enough: collect from other networks (bridge)

5. If preferred_network = NULL:
   - Choose network with sufficient balance
   - Priority: cheaper gas > larger balance
   - If none has enough: consolidation needed

6. Calculate fees:
   - gas_fee (network)
   - bridge_fee (if bridge needed)

7. Show summary to user

8. After confirmation: execute transaction(s)
```

### All Transfer Cases

#### Recipient WITHOUT preference

| # | Sender Situation | Solution | UI |
|---|------------------|----------|-----|
| 1 | 100 USDC on Polygon | Send on Polygon | Just "Send" button |
| 2 | 50 Polygon + 50 Arbitrum, sends 30 | Choose network with balance (cheaper gas) | Just "Send" button |
| 3 | 50 Polygon + 50 Arbitrum, sends 70 | Consolidation needed | Ask user |

#### Recipient WITH preference (e.g., Arbitrum)

| # | Sender Situation | Solution | UI |
|---|------------------|----------|-----|
| 4 | 100 USDC on Arbitrum | Perfect match | Just "Send" |
| 5 | 100 USDC on Polygon | Bridge Polygon→Arbitrum | Show bridge cost |
| 6 | 50 Polygon + 50 Arbitrum, sends 30 | Take from Arbitrum (matches) | Just "Send" |
| 7 | 50 Polygon + 50 Arbitrum, sends 70 | 50 from Arbitrum + bridge 20 from Polygon | Show cost |
| 8 | 50 Polygon + 50 Base, sends 30 | Bridge from one | Show cost, pick cheaper |
| 9 | 50 Polygon + 50 Base, sends 70 | Bridge from both | Show total cost |

### Edge Cases

| # | Situation | Solution |
|---|-----------|----------|
| 10 | Not enough for bridge fee | "Insufficient funds for fee" |
| 11 | Bridge temporarily unavailable | "Conversion unavailable. Try later or send to [sender's network]" |
| 12 | Recipient is E-Y user, no preference + external sender | Receive on sender's network |
| 13 | Sender wants to send more than available | "Insufficient funds" |
| 14 | Expensive bridge (e.g., $5 for $10 transfer) | Show warning + offer alternative |

### BLIK Cases

| # | Situation | Solution |
|---|-----------|----------|
| 15 | Recipient generates BLIK, NO preference | Receives on sender's network |
| 16 | Recipient generates BLIK, WITH preference | Preference encoded in BLIK, sender sees bridge cost |
| 17 | Sender enters BLIK, different network | Show bridge cost before confirmation |

---

## UI Specifications

### Balance Display

**Collapsed (default):**
```
USDC: 100
```

**Expanded (tap to reveal):**
```
USDC: 100
├── 50 Polygon
├── 30 Arbitrum
└── 20 Base
```

### Send Flow - Bridge Needed

```
┌─────────────────────────────────────┐
│ Send @daniel 100 USDC               │
│                                     │
│ ✨ Daniel receives on Arbitrum       │
│                                     │
│ Your USDC is on Polygon             │
│ 🔄 Conversion: ~$0.35, ~2 min       │
│                                     │
│ Amount to send: 100 USDC            │
│ Network fee: ~$0.02                 │
│ Conversion fee: ~$0.35              │
│ ─────────────────────────           │
│ Total fees: ~$0.37                  │
│                                     │
│ [Send]                              │
│                                     │
│ 💡 Or send to Polygon without       │
│    conversion fees                  │
└─────────────────────────────────────┘
```

### Send Flow - Consolidation Needed

```
┌─────────────────────────────────────┐
│ Send @daniel 70 USDC                │
│                                     │
│ ⚠️ Your USDC is on different networks: │
│    50 on Polygon                    │
│    50 on Arbitrum                   │
│                                     │
│ Options:                            │
│ ○ Collect from both (~$0.40 fee)   │
│ ○ Send 50 (max from one network)   │
│                                     │
└─────────────────────────────────────┘
```

### Smart Scanning Notification

```
┌─────────────────────────────────────┐
│ 💡 Tokens found on Optimism          │
│    20 USDC                          │
│                                     │
│ E-Y doesn't fully support Optimism  │
│ yet. You can:                       │
│                                     │
│ [Move to Arbitrum]  [Later]         │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### New Components Needed

**Mobile:**
- `src/store/slices/network-preferences-slice.ts` — preferences state
- `src/services/network-service.ts` — multi-network balance fetching
- `src/services/bridge-service.ts` — bridge quotes and execution
- `app/settings/network-preferences.tsx` — settings screen
- `src/components/NetworkBadge.tsx` — network indicator
- `src/components/BalanceBreakdown.tsx` — expandable balance view

**API:**
- Endpoint for storing user network preferences
- Endpoint for bridge quotes (or integrate LI.FI directly on mobile)

### Dependencies

- LI.FI SDK — for bridge quotes and execution
- Multi-RPC setup — Alchemy endpoints for all supported networks

---

## Implementation Phases

### Phase 1: Multi-Network Balance Display
- Fetch balances from all 5 networks
- Show combined balance with expandable breakdown
- No preferences yet, just visibility

### Phase 2: Network Preferences
- Settings screen for preferences
- Store preferences (local + backend sync)
- Show recipient preferences in send flow

### Phase 3: Smart Routing
- Calculate optimal route for transfers
- Show bridge costs when needed
- Offer alternatives for expensive bridges

### Phase 4: Bridge Integration
- Integrate LI.FI for actual bridging
- Execute cross-network transfers
- Handle bridge failures gracefully

### Phase 5: Smart Scanning
- Periodic Tier 2 network scanning
- Notifications for found balances
- One-tap bridge to supported networks

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Users setting preferences | Track adoption rate |
| Bridge usage | Monitor when/why users bridge |
| "Network confusion" support tickets | Should decrease |
| Transfer completion rate | Should stay >99% |

---

## Open Questions (Resolved)

1. ~~What if user doesn't set preferences?~~ → Receive on sender's network
2. ~~Home network?~~ → No home network, stay flexible
3. ~~Non-EVM support?~~ → v1.0 is EVM only, design allows future extension

---

*Document approved: 2026-01-20*
