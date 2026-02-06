# AI-First Wallet Interface — Design Document

**Author:** Daniel
**Date:** 2026-02-06
**Status:** Approved

---

## Concept

Transform E-Y from a traditional crypto wallet with an AI assistant into an **AI-native wallet** where the primary interface is a conversation with an agent. Manual controls remain available via a mode toggle.

**Positioning shift:**
- Was: "Crypto wallet with an AI helper"
- Now: "First AI-native crypto wallet — you don't need to understand crypto"

---

## Architecture Decisions

### LLM Provider
- **Claude** (Anthropic) as sole provider
- **Haiku** — simple commands (balance, history, address, BLIK)
- **Sonnet** — complex queries (explanations, multi-step, unclear intent)
- Routing: first try Haiku, if no clear tool call → retry with Sonnet
- Budget: ~$10/month

### Infrastructure
- **Server-side LLM calls** — existing NestJS backend via WebSocket (Socket.IO)
- Replace Gemini/Groq providers with Claude provider
- Same WebSocket gateway, same protocol, same events
- One backend serves both web and mobile clients

### Platform
- **Both web and mobile** — shared backend, platform-specific UI
- Web: React DOM components in glass-card design system
- Mobile: existing React Native components (already built)

### UI Mode
- **Switchable AI / Classic mode** — toggle in navigation bar
- AI mode: balance panel + chat with rich cards
- Classic mode: current traditional UI (buttons + pages)
- State persisted in localStorage
- Default: 'ai' for new users, 'classic' for existing

---

## UI Layout (AI Mode)

```
┌──────────────────────────────────┐
│  Navigation  [AI ⟷ Classic]  🔒  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  💰 0.0500 ETH            │  │  ← always visible
│  │     ≈ $125.00             │  │
│  │     Sepolia Testnet 🟢    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  Chat area                │  │  ← scrollable
│  │  Rich cards inline        │  │
│  │  Editable fields          │  │
│  └────────────────────────────┘  │
│  [Отправить] [Баланс] [BLIK]    │  ← suggestion chips
│  ┌────────────────────────────┐  │
│  │  Message input...       ➤ │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## MVP Tools (5)

| Tool | Description |
|------|-------------|
| `get_balance` | Check wallet balance (ETH + tokens) |
| `prepare_send` | Prepare send transaction (resolve @username) |
| `receive_address` | Show wallet address + QR code |
| `blik_generate` | Generate BLIK code for receiving |
| `get_history` | Fetch transaction history |

---

## Intent Parser (Local, No LLM)

Lives on backend: `apps/api/src/ai/intent-parser.ts`

| Pattern | Tool |
|---------|------|
| "баланс", "balance", "сколько" | get_balance |
| "история", "history", "транзакции" | get_history |
| "получить", "receive", "мой адрес" | receive_address |
| "blik", "блик", "код" | blik_generate |
| "отправь {amount} {token} {recipient}" | prepare_send |

Expected savings: ~60-70% of requests handled without LLM.

If intent is unclear → forward to Claude.

---

## Confirmation Flow (Two-Step with Editing)

### Step 1: Editable Preview Card (inline in chat)

```
┌─────────────────────────────┐
│  Отправка ETH               │
│  Кому:    [@masha  ✏️]      │  ← clickable, editable
│  Сумма:   [0.1 ETH  ✏️]     │  ← clickable, editable
│  Сеть:    Sepolia            │
│  Gas:     ~$0.12             │
│  [Отправить]   [Отменить]    │
└─────────────────────────────┘
```

- Click field → becomes input
- Changes are local (no LLM re-call)
- Gas recalculates on amount change

### Step 2: Confirm Modal (after "Send" click)

```
┌─────────────────────────────┐
│  Подтвердите транзакцию      │
│  0.1 ETH → @masha           │
│  Gas: ~$0.12                 │
│  Введите пароль: [••••••••]  │
│  [Подтвердить]  [Отмена]     │
└─────────────────────────────┘
```

- Password always required for financial operations
- 60 second timeout → auto-cancel

---

## Language

Multilingual automatic — Claude detects user language and responds accordingly. No language settings needed.

---

## Code Reuse from Mobile

| Mobile Component | Web Approach |
|---|---|
| `ai-service.ts` (Socket.IO) | Reuse 1:1 |
| `useAiChat.ts` hook | Adapt (React context instead of Redux) |
| `TransactionCard.tsx` | Same flow, web glass-card UI |
| `BlikCard.tsx` | Same flow, web glass-card UI |
| `ChatBubble.tsx` | Concept only, own UI |
| `ChatInput.tsx` | Concept only, own UI |
| `SuggestionCard.tsx` | Adapt to chips |
| Shared types (`packages/shared`) | Extend with EditableField, CardAction |

---

## New/Modified Files

### Backend (apps/api/)
```
src/ai/providers/claude.provider.ts    ← NEW (replace gemini + groq)
src/ai/providers/gemini.provider.ts    ← DELETE
src/ai/providers/groq.provider.ts      ← DELETE
src/ai/intent-parser.ts                ← NEW
src/ai/ai.service.ts                   ← MODIFY (new provider)
src/ai/prompts/system.ts               ← MODIFY (Claude format)
```

### Web (apps/web/)
```
src/components/chat/ChatContainer.tsx      ← NEW
src/components/chat/MessageBubble.tsx      ← NEW
src/components/chat/InputBar.tsx           ← NEW
src/components/chat/SuggestionChips.tsx    ← NEW
src/components/chat/cards/SendPreviewCard.tsx   ← NEW
src/components/chat/cards/ReceiveCard.tsx       ← NEW
src/components/chat/cards/BlikCard.tsx          ← NEW
src/components/chat/cards/HistoryCard.tsx       ← NEW
src/components/chat/cards/ConfirmModal.tsx      ← NEW
src/hooks/useAiChat.ts                    ← NEW
src/services/ai-service.ts               ← NEW
src/components/Navigation.tsx             ← MODIFY (add toggle)
src/contexts/account-context.tsx          ← MODIFY (add uiMode)
src/app/wallet/page.tsx                   ← MODIFY (conditional render)
```

### Shared (packages/shared/)
```
src/types/ai.ts                           ← MODIFY (add EditableField, CardAction)
```

---

## Implementation Phases

### Phase 1 — Backend (Claude Provider)
- Write claude.provider.ts (Haiku + Sonnet routing)
- Remove gemini.provider.ts and groq.provider.ts
- Update ai.service.ts
- Write intent-parser.ts
- Adapt system prompt for Claude
- Verify mobile still works

### Phase 2 — Web: Chat UI
- ChatContainer, MessageBubble, InputBar, SuggestionChips
- useAiChat hook (adapt from mobile)
- Connect ai-service.ts (Socket.IO client)

### Phase 3 — Web: Rich Cards
- SendPreviewCard with editable fields
- ReceiveCard (QR + address)
- BlikCard (generate + timer)
- HistoryCard (transaction list)
- ConfirmModal (password confirmation)

### Phase 4 — Mode Toggle
- AI/Classic toggle in Navigation
- uiMode in AccountContext + localStorage
- Conditional rendering on /wallet
- WebSocket fallback banner

### Phase 5 — Testing & Polish
- End-to-end flows
- Edge cases (no internet, API timeout, invalid address)
- Responsive design

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI costs exceed $10/mo | Intent parser handles 60-70% locally |
| AI makes wrong transaction | Two-step confirmation + editable preview |
| WebSocket unavailable | Fallback banner + Classic mode |
| Latency (1-3s for LLM) | Streaming responses + typing indicator |
| User doesn't know what to ask | Suggestion chips + welcome message with examples |
