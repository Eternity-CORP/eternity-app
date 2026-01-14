# BLIK Code System Design

**Goal:** Implement P2P transfers via 6-digit BLIK codes (FR-2.3, FR-3.4, FR-4.1-4.5)

**Features Covered:** FR-2.3, FR-3.4, FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5

**Date:** 2026-01-14

---

## Overview

BLIK codes enable simple P2P crypto transfers without sharing wallet addresses. The receiver creates a code with the desired amount, shares it with the sender, and the sender confirms payment.

**Flow:** Receiver-initiated with pre-set amount
- Receiver creates code (amount + token) → gets 6-digit code
- Sender enters code → sees payment details → confirms → transaction executes

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    RECEIVER     │         │     SERVER      │         │     SENDER      │
│   (Получатель)  │         │   (NestJS API)  │         │  (Отправитель)  │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ 1. Connect WS             │                           │
         │ ─────────────────────────>│                           │
         │                           │                           │
         │ 2. create-code            │                           │
         │ {amount, token, address}  │                           │
         │ ─────────────────────────>│                           │
         │                           │                           │
         │ 3. code-created           │                           │
         │ {code: "847291", ...}     │                           │
         │ <─────────────────────────│                           │
         │                           │                           │
         │      ┌─────────────────────────────────────────────┐  │
         │      │  Receiver shares code "847291" via any app  │  │
         │      └─────────────────────────────────────────────┘  │
         │                           │                           │
         │                           │  4. Connect WS            │
         │                           │ <─────────────────────────│
         │                           │                           │
         │                           │  5. lookup-code           │
         │                           │  {code: "847291"}         │
         │                           │ <─────────────────────────│
         │                           │                           │
         │                           │  6. code-info             │
         │                           │  {amount, token, receiver}│
         │                           │ ─────────────────────────>│
         │                           │                           │
         │                           │  7. confirm-payment       │
         │                           │  {code, network, txHash}  │
         │                           │ <─────────────────────────│
         │                           │                           │
         │ 8. payment-confirmed      │                           │
         │ {txHash, sender, network} │                           │
         │ <─────────────────────────│                           │
```

**Key Points:**
- Code lives 2 minutes, then auto-deleted
- Server only coordinates (matching), never sees private keys
- Transaction (step 7) is signed on sender's device (self-custody)

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Code storage | In-memory Map | Codes live 2 min, no need to persist |
| Communication | WebSocket both sides | Real-time UX critical for BLIK |
| Transaction execution | Sender's device | Self-custody, server never has access |
| Code data | username + address | Show @username if available, fallback to address |
| Network selection | Sender chooses | Chain abstraction - receiver specifies token only |
| Token specification | Symbol only (USDC, ETH) | Sender picks network from their balances |

## Data Structures

### BlikCode (in-memory)

```typescript
interface BlikCode {
  code: string;              // "847291" (6 digits)
  amount: string;            // "10.5"
  tokenSymbol: string;       // "USDC", "ETH"
  receiverAddress: string;   // "0x..."
  receiverUsername?: string; // "@andrey" (if registered)
  receiverSocketId: string;  // For notifications
  status: 'active' | 'pending' | 'completed' | 'expired';
  createdAt: number;         // timestamp
  expiresAt: number;         // createdAt + 2 min
}
```

### WebSocket Events

**Receiver → Server:**
- `create-code` → `{ amount, tokenSymbol }` — create code
- `cancel-code` → `{ code }` — cancel code

**Server → Receiver:**
- `code-created` → `{ code, expiresAt }` — code created
- `code-lookup` → `{ senderAddress }` — someone is viewing code
- `payment-confirmed` → `{ txHash, senderAddress, network }` — payment confirmed
- `code-expired` → `{ code }` — code expired

**Sender → Server:**
- `lookup-code` → `{ code }` — get code info
- `confirm-payment` → `{ code, txHash, network }` — confirm payment

**Server → Sender:**
- `code-info` → `{ amount, tokenSymbol, receiverAddress, receiverUsername }` — code info
- `code-not-found` → `{ code }` — code not found/expired
- `payment-accepted` → `{ }` — receiver notified

### Code Statuses:
- `active` — waiting for sender
- `pending` — sender is viewing (optional)
- `completed` — transaction sent
- `expired` — 2 minutes passed

## Mobile UI Screens

### Receiver: "Request Payment" (create code)

```
┌─────────────────────────────────┐
│  ←  Request Payment             │
├─────────────────────────────────┤
│                                 │
│  Amount                         │
│  ┌───────────────────────────┐  │
│  │ 10.00                     │  │
│  └───────────────────────────┘  │
│                                 │
│  Token                          │
│  ┌───────────────────────────┐  │
│  │ USDC                    ▼ │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │      Generate Code        │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Receiver: "Waiting" (code created)

```
┌─────────────────────────────────┐
│  ←  Request Payment             │
├─────────────────────────────────┤
│                                 │
│        Share this code          │
│                                 │
│     ┌─────────────────────┐     │
│     │      8 4 7 2 9 1    │     │
│     └─────────────────────┘     │
│                                 │
│        10.00 USDC               │
│                                 │
│     ⏱ Expires in 1:45           │
│                                 │
│  ┌───────────────────────────┐  │
│  │     Copy Code             │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │        Cancel             │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Sender: "Enter Code"

```
┌─────────────────────────────────┐
│  ←  Pay with BLIK               │
├─────────────────────────────────┤
│                                 │
│     Enter 6-digit code          │
│                                 │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│   │8 │ │4 │ │7 │ │2 │ │9 │ │1 │ │
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│                                 │
│     ✓ Code found                │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Send 10.00 USDC          │  │
│  │  to @andrey               │  │
│  │                           │  │
│  │  Network: [Sepolia    ▼]  │  │
│  │  Fee: ~$0.12              │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │      Confirm & Send       │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Navigation:**
- Receiver: Home → Receive → BLIK tab → Request Payment
- Sender: Home → Send → BLIK tab → Enter Code

## Error Handling

### Timeouts and Expiration

| Situation | Behavior |
|-----------|----------|
| Code expired (2 min) | Server deletes code, sends `code-expired` to receiver, `code-not-found` to sender |
| Receiver closed app | Code stays active, on reconnect check for active code |
| Sender entered code but didn't confirm | Nothing happens, code stays active for others |
| WebSocket disconnect | Auto-reconnect on client, code linked to address not socket |

### Transaction Errors

| Situation | Behavior |
|-----------|----------|
| Insufficient balance | UI shows before confirm — "Insufficient USDC balance" |
| Insufficient gas | UI shows before confirm — "Insufficient ETH for gas" |
| Transaction failed | Sender sees error, code NOT marked completed, can retry |
| Transaction pending long | UI shows status, receiver sees "Payment pending..." |

### Abuse Protection

| Threat | Protection |
|--------|------------|
| Brute-force codes | Rate limit: 10 lookup attempts per minute per IP |
| Code spam | Rate limit: 5 active codes per address |
| Replay attack | Code marked `completed` immediately after confirm, reuse impossible |

### Edge Cases

1. **Double confirm** — Second confirm ignored (code already completed)
2. **Receiver cancelled during confirm** — Sender gets `code-cancelled`, transaction not sent
3. **Different tokens for sender** — UI shows only networks where sender has the required token with sufficient balance

## File Structure

### Backend (NestJS)

```
apps/api/src/blik/
├── blik.module.ts          # Module (exists)
├── blik.gateway.ts         # WebSocket gateway (update)
├── blik.service.ts         # NEW: Business logic, in-memory storage
├── blik.types.ts           # NEW: Server types
└── blik.guard.ts           # NEW: Rate limiting guard
```

### Mobile (React Native)

```
apps/mobile/
├── app/
│   ├── blik/
│   │   ├── _layout.tsx       # NEW: Layout for BLIK flow
│   │   ├── request.tsx       # NEW: Create code (receiver)
│   │   ├── waiting.tsx       # NEW: Wait for payment
│   │   ├── enter-code.tsx    # NEW: Enter code (sender)
│   │   └── confirm.tsx       # NEW: Confirm payment
├── src/
│   ├── services/
│   │   └── blik-service.ts   # NEW: WebSocket client
│   ├── store/slices/
│   │   └── blik-slice.ts     # NEW: Redux state for BLIK
│   └── components/
│       └── BlikCodeInput.tsx # NEW: 6-digit code input
```

### Shared Types

```typescript
// packages/shared/src/types/blik.ts
export interface BlikCode {
  code: string;
  amount: string;
  tokenSymbol: string;
  receiverAddress: string;
  receiverUsername?: string;
  status: BlikCodeStatus;
  expiresAt: string;
}

export type BlikCodeStatus = 'active' | 'pending' | 'completed' | 'expired';

// WebSocket event payloads
export interface CreateCodePayload { amount: string; tokenSymbol: string; }
export interface CodeCreatedPayload { code: string; expiresAt: string; }
export interface LookupCodePayload { code: string; }
export interface CodeInfoPayload {
  amount: string;
  tokenSymbol: string;
  receiverAddress: string;
  receiverUsername?: string;
}
export interface ConfirmPaymentPayload { code: string; txHash: string; network: string; }
export interface PaymentConfirmedPayload { txHash: string; senderAddress: string; network: string; }
```

## Requirements Coverage

| FR | Description | Implementation |
|----|-------------|----------------|
| FR-2.3 | Send via BLIK | Sender enters code, confirms |
| FR-3.4 | BLIK receive | Receiver creates code with amount |
| FR-4.1 | Code generation | 6-digit unique code |
| FR-4.2 | Code expiration | 2 minutes TTL |
| FR-4.3 | Code redemption | Sender enters code |
| FR-4.4 | Real-time matching | WebSocket notifications |
| FR-4.5 | Single use | Status `completed` blocks reuse |

## Out of Scope (MVP)

- Push notifications (can add later)
- BLIK transaction history (use general history)
- Partial payment (full amount or nothing)
