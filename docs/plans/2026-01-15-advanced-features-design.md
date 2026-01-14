# Advanced Features Design: Split Bill, Scheduled Payments, Transaction & Token Details

**Date:** 2026-01-15
**Author:** Claude + Daniel
**Status:** Ready for Implementation

---

## Overview

Four interconnected features to enhance the E-Y wallet experience:

1. **Split Bill** — Share expenses with multiple participants
2. **Scheduled Payments** — Plan future payments with reminders
3. **Transaction Details** — Detailed view of any transaction
4. **Token Details** — Token page with chart and contextual actions

---

## Feature 1: Split Bill (E-32)

### User Flow

**Creator Flow:**
1. Home → "Split Bill" button
2. Enter total amount and select token
3. Add participants (contacts / @username / address)
4. Choose split mode (equal / custom)
5. Optionally change recipient address
6. Add description
7. Create → participants receive push notification

**Participant Flow:**
1. Receive push notification: "Alice requested 25 USDC"
2. Open app → see warning block on Home screen
3. Tap "Pay now" → confirm payment screen
4. Pay → block disappears, creator notified

### Data Model

```typescript
interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress: string; // where payments go (default: creator)
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed' | 'cancelled';
}

interface SplitParticipant {
  address: string;
  username?: string;
  name?: string; // from contacts
  amount: string;
  status: 'pending' | 'paid';
  paidTxHash?: string;
  paidAt?: number;
  notifiedAt?: number;
}
```

### Backend API

```
POST   /api/split              - Create split bill
GET    /api/split/:id          - Get split bill details
GET    /api/split/my/created   - List splits I created
GET    /api/split/my/pending   - List splits I need to pay
PUT    /api/split/:id/cancel   - Cancel split bill
POST   /api/split/:id/pay      - Mark participant as paid (with txHash)
```

### Push Notifications

- **On create:** All participants receive "X requested Y USDC from you"
- **On payment:** Creator receives "X paid their share (Y USDC)"
- **On complete:** Creator receives "Split bill complete! All paid."

### UI Components

**Home Screen Warning Block:**
```
┌─────────────────────────────────────┐
│ ⚠️ Payment Request                   │
│ Alice requested 25 USDC             │
│ "Dinner at Restaurant"              │
│                                     │
│ [Pay Now]              [View Details]│
└─────────────────────────────────────┘
```

---

## Feature 2: Scheduled Payments (E-31)

### User Flow

**Create:**
1. Send flow → toggle "Schedule for later"
2. Pick date/time
3. Optional: set as recurring (daily/weekly/monthly)
4. Create → saved locally + synced to backend

**Execute:**
1. At scheduled time → push notification
2. Open app → confirmation screen pre-filled
3. Confirm → transaction sent
4. If recurring → next occurrence scheduled

**Manage:**
1. Home → "Scheduled" section shows upcoming
2. Tap → view/edit/cancel options

### Data Model

```typescript
interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string; // from contacts
  amount: string;
  tokenSymbol: string;
  scheduledAt: number; // timestamp
  recurring?: {
    interval: 'daily' | 'weekly' | 'monthly';
    endDate?: number; // optional end date
  };
  description?: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  executedTxHash?: string;
  executedAt?: number;
  createdAt: number;
  updatedAt: number;
  syncedToBackend: boolean;
}
```

### Storage Strategy

**Local (AsyncStorage):**
- Primary storage for all scheduled payments
- Works offline
- Local notifications scheduled via expo-notifications

**Backend (PostgreSQL):**
- Backup sync for recovery
- Push notifications when app is killed
- Cross-device sync (future)

### Backend API

```
POST   /api/scheduled              - Sync scheduled payment
GET    /api/scheduled/my           - Get my scheduled payments
PUT    /api/scheduled/:id          - Update scheduled payment
DELETE /api/scheduled/:id          - Delete scheduled payment
POST   /api/scheduled/:id/executed - Mark as executed
```

### UI Components

**Home Screen Scheduled Section:**
```
┌─────────────────────────────────────┐
│ 📅 Upcoming Payments                │
├─────────────────────────────────────┤
│ 💰 50 USDC → @bob                   │
│    Tomorrow at 10:00 AM             │
│    🔄 Monthly                       │
├─────────────────────────────────────┤
│ 💰 0.1 ETH → 0x1234...              │
│    Jan 20, 2026 at 3:00 PM          │
└─────────────────────────────────────┘
```

---

## Feature 3: Transaction Details

### User Flow

1. History → tap any transaction
2. Opens detail screen with full info
3. "Show details" expands technical data

### Data Display

**Basic Info (always visible):**
- Amount and token (large)
- Direction icon (sent/received)
- Status badge (confirmed/pending/failed)
- From/To with @username if known
- Date and time
- Gas fee (in ETH and USD)

**Technical Details (expandable):**
- Transaction hash (full, copyable)
- Block number
- Nonce
- Gas price / Gas limit / Gas used
- Confirmations count
- Link to block explorer

### Screen Layout

```
┌─────────────────────────────────────┐
│ ←  Transaction Details              │
├─────────────────────────────────────┤
│                                     │
│         ↑ RECEIVED                  │
│         +50 USDC                    │
│         ≈ $50.00                    │
│                                     │
│    ✓ Confirmed                      │
│                                     │
├─────────────────────────────────────┤
│ From     @alice                     │
│          0x1234...5678       [copy] │
│                                     │
│ To       My Wallet                  │
│          0xabcd...efgh       [copy] │
│                                     │
│ Date     Jan 15, 2026 at 2:30 PM    │
│                                     │
│ Gas Fee  0.002 ETH ($4.50)          │
├─────────────────────────────────────┤
│ ▼ Technical Details                 │
│                                     │
│ TX Hash  0x9876...  [copy] [explorer]│
│ Block    12345678                   │
│ Nonce    42                         │
│ Gas      21000 / 21000 used         │
│ Confirms 156                        │
└─────────────────────────────────────┘
```

---

## Feature 4: Token Details

### User Flow

1. Home → tap any token in balance list
2. Opens token detail screen
3. Send/Receive buttons are contextual to this token

### Data Display

**Token Info:**
- Large icon and full name
- Balance (amount + USD value)
- Price change indicator (+5.2% or -3.1%)
- Mini price chart (24h/7d/30d toggle)

**Actions:**
- Send (pre-selects this token)
- Receive (shows QR with token context)

**Transaction History:**
- Filtered to only this token's transactions

**Token Details (expandable):**
- Contract address (copyable)
- Network
- Decimals
- Links to Etherscan / CoinGecko

### Screen Layout

```
┌─────────────────────────────────────┐
│ ←  USDC                             │
├─────────────────────────────────────┤
│    [USDC icon]                      │
│    USD Coin                         │
│                                     │
│    1,250.00 USDC                    │
│    ≈ $1,250.00                      │
│    +2.3% (24h)                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  [Price Chart - 24h/7d/30d]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│   [  Send  ]     [  Receive  ]      │
│                                     │
├─────────────────────────────────────┤
│ Transactions                        │
├─────────────────────────────────────┤
│ ↓ -50 USDC    Jan 15    @bob        │
│ ↑ +100 USDC   Jan 14    @alice      │
│ ↓ -25 USDC    Jan 13    0x1234...   │
└─────────────────────────────────────┘
```

### Price Chart

- Use CoinGecko API for historical prices
- Simple line chart (react-native-svg)
- Toggle: 24h / 7d / 30d

---

## Implementation Priority

1. **Transaction Details** — Simple, standalone, high value
2. **Token Details** — Builds on transaction details
3. **Scheduled Payments** — Medium complexity
4. **Split Bill** — Most complex (needs backend + push)

---

## Technical Requirements

### New Backend Modules

- `split` module (controller, service, gateway)
- `scheduled` module (controller, service)
- Push notification service (Firebase Cloud Messaging)

### New Mobile Screens

- `/transaction/[id]` — Transaction details
- `/token/[symbol]` — Token details
- `/split/create` — Create split bill
- `/split/[id]` — Split bill details
- `/split/pay/[id]` — Pay split share
- `/scheduled/create` — Create scheduled payment
- `/scheduled/[id]` — Edit scheduled payment

### New Components

- `PendingSplitBanner` — Warning block on home
- `ScheduledPaymentCard` — Upcoming payment card
- `PriceChart` — Mini price chart for tokens
- `TransactionStatusBadge` — Status indicator

### Dependencies

- `expo-notifications` — Local + push notifications
- `react-native-svg` — For price charts
- Firebase Cloud Messaging — Push notifications

---

## Database Schema (Backend)

```sql
-- Split Bills
CREATE TABLE split_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address VARCHAR(42) NOT NULL,
  creator_username VARCHAR(20),
  recipient_address VARCHAR(42) NOT NULL,
  total_amount VARCHAR(78) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID REFERENCES split_bills(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,
  username VARCHAR(20),
  name VARCHAR(100),
  amount VARCHAR(78) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_tx_hash VARCHAR(66),
  paid_at TIMESTAMP,
  notified_at TIMESTAMP,
  push_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled Payments (backup sync)
CREATE TABLE scheduled_payments (
  id UUID PRIMARY KEY,
  creator_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  recipient_username VARCHAR(20),
  amount VARCHAR(78) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  recurring_interval VARCHAR(20),
  recurring_end_date TIMESTAMP,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  executed_tx_hash VARCHAR(66),
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_split_creator ON split_bills(creator_address);
CREATE INDEX idx_split_participant ON split_participants(address);
CREATE INDEX idx_scheduled_creator ON scheduled_payments(creator_address);
CREATE INDEX idx_scheduled_time ON scheduled_payments(scheduled_at);
```
