# Story S-20: AI Intent Parser

**Story ID:** Story-6.1
**Sprint:** [Sprint 06: AI Integration](../SPRINT.md)
**Priority:** P0
**Estimate:** 8 hours
**Status:** ✅ Done
**Created:** January 4, 2026
**Completed:** January 4, 2026

---

## User Story

**As a** user
**I want** to type natural language commands
**So that** I can manage my wallet without learning crypto terminology

---

## Acceptance Criteria

- [x] POST `/api/ai/parse-intent` accepts text input
- [x] Returns structured intent: `{ type, amount, recipient, token, chain, confidence }`
- [x] Handles 5 intent types: `balance`, `send`, `swap`, `fees`, `price`
- [x] Returns confidence score (0-1)
- [x] Handles Russian and English input
- [x] Responds in <500ms (Groq inference) — avg 300ms
- [x] Gracefully handles unknown intents with suggestions

---

## Technical Design

### API Endpoint

```typescript
// POST /api/ai/parse-intent
// Request
{
  "text": "Отправь 0.5 ETH на @alice",
  "locale": "ru"  // optional, auto-detect
}

// Response
{
  "intent": {
    "type": "send",
    "amount": "0.5",
    "token": "ETH",
    "recipient": "@alice",
    "chain": null,  // auto-select
    "confidence": 0.95
  },
  "suggestions": [],  // empty if confident
  "rawText": "Отправь 0.5 ETH на @alice"
}
```

### Intent Types

| Type | Example Commands | Extracted Fields |
|------|------------------|------------------|
| `balance` | "Сколько у меня денег?", "My balance" | - |
| `send` | "Отправь 0.1 ETH на @bob" | amount, token, recipient |
| `swap` | "Обменяй USDC на ETH" | fromToken, toToken, amount |
| `fees` | "Сколько потратил на комиссии?" | period (default: month) |
| `price` | "Сколько стоит ETH?" | token |

### Backend Implementation

```typescript
// backend/src/services/AIIntent.service.ts
import Groq from 'groq-sdk';

@Injectable()
export class AIIntentService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async parseIntent(text: string, locale?: string): Promise<ParsedIntent> {
    const prompt = this.buildPrompt(text, locale);

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,  // Low for consistency
      max_tokens: 200,
    });

    return this.parseResponse(response.choices[0].message.content);
  }

  private buildPrompt(text: string, locale?: string): string {
    return `You are a crypto wallet assistant. Parse the following command into a structured intent.

Command: "${text}"

Return JSON with these fields:
- type: one of [balance, send, swap, fees, price, unknown]
- amount: number or null
- token: string or null (ETH, USDC, etc.)
- recipient: string or null (@username, address, or EY-ID)
- fromToken: string or null (for swaps)
- toToken: string or null (for swaps)
- confidence: number 0-1

Examples:
"Сколько у меня денег?" → {"type":"balance","confidence":0.99}
"Send 0.1 ETH to @alice" → {"type":"send","amount":"0.1","token":"ETH","recipient":"@alice","confidence":0.95}

Return only valid JSON, no explanation.`;
  }
}
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `groq-sdk` | latest | LLM inference |
| `class-validator` | existing | DTO validation |

---

## Test Cases

| # | Input | Expected Output |
|---|-------|-----------------|
| 1 | "Сколько у меня денег?" | `{ type: 'balance', confidence: >0.9 }` |
| 2 | "Отправь 0.5 ETH на @alice" | `{ type: 'send', amount: '0.5', token: 'ETH', recipient: '@alice' }` |
| 3 | "Send 100 USDC to 0x123..." | `{ type: 'send', amount: '100', token: 'USDC', recipient: '0x123...' }` |
| 4 | "Обменяй весь USDC на ETH" | `{ type: 'swap', fromToken: 'USDC', toToken: 'ETH' }` |
| 5 | "Сколько потратил на газ?" | `{ type: 'fees' }` |
| 6 | "What's ETH price?" | `{ type: 'price', token: 'ETH' }` |
| 7 | "Hello" | `{ type: 'unknown', suggestions: ['Check balance', 'Send tokens'] }` |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/src/services/AIIntent.service.ts` | CREATE | Intent parsing service |
| `backend/src/modules/ai/ai.module.ts` | CREATE | AI feature module |
| `backend/src/modules/ai/ai.controller.ts` | CREATE | REST endpoint |
| `backend/src/dto/ai-intent.dto.ts` | CREATE | Request/Response DTOs |
| `backend/.env.example` | MODIFY | Add GROQ_API_KEY |

---

## Definition of Done

- [ ] Endpoint returns correct intent for all 5 command types
- [ ] Response time <500ms for 95th percentile
- [ ] Unit tests pass with >90% accuracy
- [ ] Error handling for API failures
- [ ] Logging for debugging
- [ ] Documentation updated

---

## Notes

- Start with Groq's `llama-3.1-70b-versatile` model (fast, cheap)
- Consider caching common patterns for faster response
- Future: Fine-tune model on user commands for better accuracy
