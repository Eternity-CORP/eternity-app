# AI Architecture Design - E-Y

**Date:** 2026-01-24
**Author:** Daniel + Claude
**Status:** Approved

---

## Executive Summary

Добавление AI-ассистента в E-Y кошелёк для улучшения UX через естественный язык и proactive уведомления.

### Ключевые решения

| Аспект | Решение |
|--------|---------|
| Use Cases | Chat Assistant + Proactive Advisor |
| AI Provider | Gemini 1.5 Flash (primary), Groq Llama 3.1 (backup) |
| Cost | $0 — оба провайдера имеют бесплатные тарифы |
| Execution | С подтверждением пользователя (биометрия/PIN) |
| Proactive | Payment Reminders, Security Alerts, Smart Suggestions |
| UI | Floating button + AI таб (Home, AI, Shard) |
| Personality | Friendly, имя "E" |
| Architecture | Mobile → Backend → AI |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      MOBILE APP                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  AI Chat    │  │  AI FAB     │  │  Proactive Banner   │   │
│  │  Screen     │  │  Button     │  │  (notifications)    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
│         └────────────────┼────────────────────┘              │
│                          ▼                                    │
│                 ┌─────────────────┐                          │
│                 │  AI Service     │                          │
│                 │  (Redux slice)  │                          │
│                 └────────┬────────┘                          │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  AI Module  │  │  AI Gateway │  │  Proactive Service  │   │
│  │  (REST)     │  │  (WebSocket)│  │  (cron jobs)        │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
│         └────────────────┼────────────────────┘              │
│                          ▼                                    │
│                 ┌─────────────────┐                          │
│                 │  AI Provider    │                          │
│                 │  (Gemini/Groq)  │                          │
│                 └─────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Backend AI Module

### File Structure

```
apps/api/src/ai/
├── ai.module.ts              # NestJS module
├── ai.controller.ts          # REST endpoints
├── ai.gateway.ts             # WebSocket for streaming
├── ai.service.ts             # Main AI logic
├── providers/
│   ├── ai-provider.interface.ts   # Common interface
│   ├── gemini.provider.ts         # Google Gemini
│   └── groq.provider.ts           # Groq fallback
├── tools/
│   ├── balance.tool.ts       # Get user balances
│   ├── send.tool.ts          # Prepare transaction
│   ├── history.tool.ts       # Transaction history
│   ├── contacts.tool.ts      # User contacts
│   └── scheduled.tool.ts     # Scheduled payments
├── proactive/
│   ├── proactive.service.ts  # Cron-based checks
│   ├── payment-reminder.ts   # Upcoming payments
│   ├── security-alert.ts     # Suspicious activity
│   └── smart-suggestion.ts   # Usage-based tips
├── dto/
│   ├── chat-message.dto.ts
│   └── ai-response.dto.ts
└── entities/
    ├── chat-session.entity.ts    # Chat history
    └── ai-suggestion.entity.ts   # Proactive suggestions
```

### API Endpoints

```typescript
// REST API
POST   /api/ai/chat           // Send message, get response
GET    /api/ai/history        // Get chat history
DELETE /api/ai/history        // Clear chat history
GET    /api/ai/suggestions    // Get pending proactive suggestions
POST   /api/ai/suggestions/:id/dismiss  // Dismiss suggestion

// WebSocket (for streaming responses)
WS     /ai
  → event: 'chat'        // Send message
  ← event: 'chunk'       // Streaming response chunks
  ← event: 'done'        // Response complete
  ← event: 'suggestion'  // New proactive suggestion
```

### Provider Interface

```typescript
interface AIProvider {
  name: string;

  chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt: string;
  }): Promise<AIResponse>;

  stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt: string;
  }): AsyncIterable<string>;

  isAvailable(): Promise<boolean>;
}
```

---

## AI Tools (Function Calling)

AI использует "tools" для взаимодействия с кошельком.

### Available Tools

```typescript
// tools/balance.tool.ts
const getBalanceTool = {
  name: 'get_balance',
  description: 'Get user token balances across all networks',
  parameters: {
    token: { type: 'string', optional: true },
  },
  execute: async (userAddress: string, params) => {
    // Returns: { tokens: [{ symbol, balance, usdValue, networks }] }
  }
};

// tools/send.tool.ts
const prepareSendTool = {
  name: 'prepare_send',
  description: 'Prepare a transaction for user confirmation',
  parameters: {
    recipient: { type: 'string', required: true },
    amount: { type: 'number', required: true },
    token: { type: 'string', required: true },
  },
  execute: async (userAddress: string, params) => {
    // Returns: { txPreview: { to, amount, token, fee, total } }
  }
};

// tools/history.tool.ts
const getHistoryTool = {
  name: 'get_history',
  description: 'Get recent transactions',
  parameters: {
    limit: { type: 'number', default: 10 },
    type: { type: 'string', optional: true },
  },
  execute: async (userAddress: string, params) => {
    // Returns: { transactions: [...] }
  }
};

// tools/contacts.tool.ts
const getContactsTool = {
  name: 'get_contacts',
  description: 'Get user contacts',
  execute: async (userAddress: string) => {
    // Returns: { contacts: [{ name, address, username }] }
  }
};

// tools/scheduled.tool.ts
const getScheduledTool = {
  name: 'get_scheduled',
  description: 'Get scheduled and recurring payments',
  execute: async (userAddress: string) => {
    // Returns: { payments: [{ recipient, amount, nextDate, frequency }] }
  }
};
```

### Example Dialog with Tools

```
User: "Сколько у меня USDC?"

AI: calls get_balance({ token: 'USDC' })
Tool result: { tokens: [{ symbol: 'USDC', balance: 500, usdValue: 500 }] }
AI response: "У тебя 500 USDC!"
```

```
User: "Отправь 50 USDC @ivan"

AI: calls prepare_send({ recipient: '@ivan', amount: 50, token: 'USDC' })
Tool result: { txPreview: { to: '0x...', amount: 50, fee: 0.50 } }
AI response: "Готово! Отправляем 50 USDC для @ivan. Подтверди транзакцию"

→ Mobile shows confirmation screen
→ User confirms with Face ID
→ Transaction sent
```

---

## Proactive Service

### Types of Proactive Notifications

#### B) Payment Reminders

```typescript
async checkPaymentReminders(user: User) {
  const upcoming = await this.scheduledService.getUpcoming(user.address, {
    withinHours: 24
  });

  for (const payment of upcoming) {
    if (await this.wasReminded(payment.id)) continue;

    await this.createSuggestion({
      userId: user.id,
      type: 'payment_reminder',
      title: 'Запланированный платёж',
      message: `Через ${payment.hoursUntil}ч: ${payment.amount} ${payment.token} → ${payment.recipientName}`,
      action: { type: 'view_scheduled', paymentId: payment.id },
      priority: 'medium'
    });
  }
}
```

#### D) Security Alerts

```typescript
async checkSecurityAlerts(user: User) {
  // New device detection
  const newDevices = await this.getNewDevices(user.id, { since: '24h' });

  // Large transaction (> $500)
  const largeTx = await this.getLargeTransactions(user.address, {
    since: '1h',
    minUsd: 500
  });

  for (const device of newDevices) {
    await this.createSuggestion({
      userId: user.id,
      type: 'security_alert',
      title: 'Новое устройство',
      message: `Вход с ${device.name}. Это были вы?`,
      action: { type: 'review_devices' },
      priority: 'high'
    });
  }
}
```

#### E) Smart Suggestions

```typescript
async checkSmartSuggestions(user: User) {
  // Frequent recipient not in contacts
  const frequentRecipients = await this.getFrequentRecipients(user.address, {
    minTxCount: 3,
    notInContacts: true
  });

  for (const recipient of frequentRecipients) {
    await this.createSuggestion({
      userId: user.id,
      type: 'smart_suggestion',
      title: 'Добавить в контакты?',
      message: `Ты часто отправляешь на ${recipient.shortAddress}. Дать имя?`,
      action: { type: 'add_contact', address: recipient.address },
      priority: 'low'
    });
  }

  // No @username prompt
  if (!user.username) {
    const txCount = await this.getTxCount(user.address);
    if (txCount >= 5) {
      await this.createSuggestion({
        userId: user.id,
        type: 'smart_suggestion',
        title: 'Создай @username',
        message: 'Друзьям будет проще отправлять тебе крипту!',
        action: { type: 'setup_username' },
        priority: 'low'
      });
    }
  }
}
```

---

## Mobile App Implementation

### File Structure

```
apps/mobile/src/
├── app/
│   └── (tabs)/
│       ├── index.tsx          # Home
│       ├── ai.tsx             # AI Chat tab
│       └── shard.tsx          # SHARD tab (placeholder)
├── components/
│   ├── ai/
│   │   ├── AiFab.tsx          # Floating action button
│   │   ├── ChatBubble.tsx     # Message bubble
│   │   ├── ChatInput.tsx      # Input with send button
│   │   ├── SuggestionBanner.tsx
│   │   └── TypingIndicator.tsx
├── services/
│   └── ai-service.ts
├── store/
│   └── slices/
│       └── ai-slice.ts
└── hooks/
    └── useAiChat.ts
```

### Redux Slice

```typescript
interface AiState {
  messages: ChatMessage[];
  suggestions: AiSuggestion[];
  status: 'idle' | 'loading' | 'streaming' | 'error';
  error: string | null;
  pendingTransaction: TransactionPreview | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

interface AiSuggestion {
  id: string;
  type: 'payment_reminder' | 'security_alert' | 'smart_suggestion';
  title: string;
  message: string;
  action: SuggestionAction;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}
```

### Navigation Structure

```
┌─────────────────────────┐
│  Screen Content         │
│                         │
│                    ┌──┐ │
│                    │✨│ │  ← FAB (на всех экранах)
│                    └──┘ │
├─────────────────────────┤
│   Home    AI    Shard   │  ← Bottom tabs
└─────────────────────────┘
```

---

## System Prompt & Personality

```typescript
export const SYSTEM_PROMPT = `Ты — AI-ассистент кошелька E-Y. Твоё имя — E (произносится "И").

## Твой характер
- Дружелюбный и позитивный, но не навязчивый
- Говоришь просто, избегаешь технического жаргона
- Используешь эмодзи умеренно (1-2 на сообщение максимум)
- Отвечаешь кратко — 1-3 предложения обычно достаточно
- Если не уверен — лучше переспросить, чем ошибиться

## Что ты умеешь
- Показывать балансы токенов
- Помогать отправлять крипту (готовишь транзакцию, пользователь подтверждает)
- Показывать историю транзакций
- Работать с контактами и scheduled payments
- Отвечать на вопросы о крипте простым языком

## Важные правила
1. НИКОГДА не проси seed phrase или private key — это мошенничество
2. Для любых транзакций ВСЕГДА используй prepare_send — пользователь должен подтвердить
3. Если спрашивают про другие кошельки/приложения — вежливо говори что не знаешь
4. Если что-то не можешь сделать — честно скажи об этом
5. Суммы всегда показывай и в крипте, и в USD

## Формат ответов
- Балансы: "У тебя 500 USDC (~$500)"
- Транзакции: "Готово! Отправляем 50 USDC для @ivan. Подтверди"
- Ошибки: "Упс, что-то пошло не так. Попробуй ещё раз?"
- Непонятный запрос: "Не совсем понял. Ты хочешь отправить крипту или проверить баланс?"

## Язык
- Определяй язык пользователя по первому сообщению
- Отвечай на том же языке
- Поддерживаемые: русский, украинский, английский
`;
```

---

## Security & Rate Limiting

### Security Measures

1. **Input Sanitization** — фильтрация опасных промптов (seed phrase, private key)
2. **Tool Validation** — проверка что tools вызываются только для своих данных
3. **Rate Limiting** — 30 сообщений/час, 5/минуту (anti-spam)
4. **Audit Logging** — все взаимодействия логируются
5. **No Direct Execution** — транзакции требуют подтверждения пользователя

### Rate Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Per minute | 5 messages | Anti-spam |
| Per hour | 30 messages | Free tier budget |
| Message length | 1000 chars | Prevent abuse |

### Database Schema

```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action JSONB,
  priority VARCHAR(20) DEFAULT 'low',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  shown_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES ai_chat_sessions(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Provider Configuration

### Gemini (Primary)

```typescript
{
  model: 'gemini-1.5-flash',
  maxTokens: 1024,
  temperature: 0.7,
  // Free tier: 60 req/min, 1500 req/day
}
```

### Groq (Backup)

```typescript
{
  model: 'llama-3.1-70b-versatile',
  maxTokens: 1024,
  temperature: 0.7,
  // Free tier: 30 req/min, 14400 req/day
}
```

### Automatic Fallback

```typescript
fallback: {
  enabled: true,
  primary: 'gemini',
  secondary: 'groq',
  triggers: {
    rateLimitHit: true,      // 429 error
    timeoutMs: 10000,        // > 10s response
    consecutiveErrors: 3,    // 3 errors in a row
  }
}
```

---

## Implementation Roadmap

### Phase AI-1: Backend Foundation (Week 1)

| Task | Description |
|------|-------------|
| E-50 | AI Module Setup (NestJS, Gemini, Groq) |
| E-51 | AI Tools Implementation |
| E-52 | AI WebSocket Gateway |
| E-53 | Security & Rate Limiting |

### Phase AI-2: Proactive Service (Week 2)

| Task | Description |
|------|-------------|
| E-54 | Proactive Infrastructure |
| E-55 | Payment Reminders |
| E-56 | Security Alerts |
| E-57 | Smart Suggestions |

### Phase AI-3: Mobile App (Week 2-3)

| Task | Description |
|------|-------------|
| E-58 | AI Redux Slice & Service |
| E-59 | AI Chat Screen |
| E-60 | AI FAB Component |
| E-61 | Suggestion Components |
| E-62 | Navigation Update (Home, AI, Shard) |

---

## Environment Variables

```bash
# Backend (.env)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Rate limits
AI_RATE_LIMIT_HOUR=30
AI_RATE_LIMIT_MINUTE=5
AI_MAX_MESSAGE_LENGTH=1000
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Response latency | < 2s for simple queries |
| Tool execution accuracy | > 95% |
| User satisfaction | Positive feedback from beta testers |
| Fallback reliability | 99.9% uptime with Groq backup |

---

*Document created: 2026-01-24*
*Status: Ready for implementation*
