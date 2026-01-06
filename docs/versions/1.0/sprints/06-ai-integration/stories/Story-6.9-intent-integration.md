# Story S-28: Intent Commands Integration

**Story ID:** S-28
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P1
**Estimate:** 10 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** all 5 intent commands to work end-to-end
**So that** I can manage my wallet entirely through natural language

---

## Acceptance Criteria

- [ ] `balance` command shows multi-chain balance
- [ ] `send` command creates transaction with Item Card confirmation
- [ ] `swap` command shows swap quote with Item Card
- [ ] `fees` command shows gas spending summary
- [ ] `price` command shows token price with chart
- [ ] Unknown commands show helpful suggestions
- [ ] All commands work in EN and RU

---

## Command Specifications

### 1. Balance Command

**Triggers:** "What's my balance?", "Сколько у меня денег?", "Show balance"

```typescript
// Intent
{ type: 'balance' }

// Response
{
  "total": "$12,450.00",
  "breakdown": [
    { "network": "Ethereum", "balance": "$11,200", "tokens": ["3.5 ETH", "1000 USDC"] },
    { "network": "Arbitrum", "balance": "$1,000", "tokens": ["500 ARB", "500 USDC"] },
    { "network": "Polygon", "balance": "$250", "tokens": ["250 MATIC"] }
  ]
}
```

### 2. Send Command

**Triggers:** "Send 0.5 ETH to @alice", "Отправь 100 USDC на 0x123..."

```typescript
// Intent
{
  type: 'send',
  amount: '0.5',
  token: 'ETH',
  recipient: '@alice'
}

// Flow
1. Resolve @alice to address
2. Calculate risk score
3. Display Item Card with swipe confirmation
4. Execute transaction on swipe right
```

### 3. Swap Command

**Triggers:** "Swap 100 USDC for ETH", "Обменяй весь USDC на ETH"

```typescript
// Intent
{
  type: 'swap',
  fromToken: 'USDC',
  toToken: 'ETH',
  amount: '100'  // or 'all'
}

// Flow
1. Fetch swap quote from LiFi/Socket
2. Display Item Card with swap details
3. Show rate, slippage, fee
4. Execute swap on swipe right
```

### 4. Fees Command

**Triggers:** "How much did I spend on fees?", "Сколько потратил на газ?"

```typescript
// Intent
{
  type: 'fees',
  period: 'month'  // default
}

// Response
{
  "total": "$45.30",
  "period": "Last 30 days",
  "breakdown": [
    { "network": "Ethereum", "spent": "$35.00", "txCount": 12 },
    { "network": "Arbitrum", "spent": "$8.30", "txCount": 25 },
    { "network": "Polygon", "spent": "$2.00", "txCount": 50 }
  ],
  "insight": "You saved $120 by using L2s for 75 transactions"
}
```

### 5. Price Command

**Triggers:** "What's ETH price?", "Сколько стоит Bitcoin?"

```typescript
// Intent
{
  type: 'price',
  token: 'ETH'
}

// Response
{
  "token": "ETH",
  "price": "$3,200.00",
  "change24h": "+2.5%",
  "change7d": "-1.2%",
  "sparkline": [...24 hour price points for mini chart...]
}
```

---

## Technical Implementation

### AI Service (Mobile)

```typescript
// mobile/src/services/aiService.ts

import { apiClient } from './apiClient';
import { walletService } from './walletService';
import { identityService } from './identityService';
import { crosschainService } from './crosschainService';

interface AIResponse {
  type: 'text' | 'balance' | 'transaction' | 'price' | 'fees';
  content: any;
}

export const aiService = {
  async processCommand(text: string, locale: string = 'en'): Promise<AIResponse> {
    // 1. Parse intent via backend
    const { intent } = await apiClient.post('/api/ai/parse-intent', {
      text,
      locale,
    });

    // 2. Handle each intent type
    switch (intent.type) {
      case 'balance':
        return this.handleBalance();

      case 'send':
        return this.handleSend(intent);

      case 'swap':
        return this.handleSwap(intent);

      case 'fees':
        return this.handleFees(intent.period);

      case 'price':
        return this.handlePrice(intent.token);

      default:
        return {
          type: 'text',
          content: "I'm not sure what you mean. Try asking about your balance, sending tokens, swapping, or checking prices.",
        };
    }
  },

  async handleBalance(): Promise<AIResponse> {
    const balances = await walletService.getAllBalances();
    return {
      type: 'balance',
      content: formatBalanceResponse(balances),
    };
  },

  async handleSend(intent: ParsedIntent): Promise<AIResponse> {
    // Resolve recipient
    let recipientAddress = intent.recipient;
    if (intent.recipient?.startsWith('@')) {
      const resolved = await identityService.resolveNickname(intent.recipient);
      recipientAddress = resolved.address;
    }

    // Get risk assessment
    const senderAddress = await walletService.getCurrentAddress();
    const risk = await apiClient.post('/api/risk/assess', {
      recipientAddress,
      amount: intent.amount,
      token: intent.token,
      chainId: 'ethereum',  // or auto-detect
      senderAddress,
    });

    return {
      type: 'transaction',
      content: {
        intent: {
          ...intent,
          recipientAddress,
        },
        riskLevel: risk.level,
        riskReasons: risk.reasons,
      },
    };
  },

  async handleSwap(intent: ParsedIntent): Promise<AIResponse> {
    // Get swap quote
    const quote = await crosschainService.getSwapQuote({
      fromToken: intent.fromToken,
      toToken: intent.toToken,
      amount: intent.amount === 'all'
        ? await walletService.getTokenBalance(intent.fromToken)
        : intent.amount,
    });

    return {
      type: 'transaction',
      content: {
        intent: {
          type: 'swap',
          ...quote,
        },
        riskLevel: 'safe',
        riskReasons: [],
      },
    };
  },

  async handleFees(period: string = 'month'): Promise<AIResponse> {
    const fees = await apiClient.get(`/api/analytics/fees?period=${period}`);
    return {
      type: 'fees',
      content: fees,
    };
  },

  async handlePrice(token: string): Promise<AIResponse> {
    const price = await apiClient.get(`/api/prices/${token}`);
    return {
      type: 'price',
      content: price,
    };
  },
};
```

### Fees Analytics Endpoint

```typescript
// backend/src/modules/analytics/analytics.controller.ts

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('fees')
  async getFeesSummary(
    @Query('period') period: string,
    @Headers('authorization') auth: string,
  ) {
    const userId = this.extractUserId(auth);
    return this.analyticsService.calculateFeesSummary(userId, period);
  }
}

// backend/src/services/Analytics.service.ts

@Injectable()
export class AnalyticsService {
  async calculateFeesSummary(userId: string, period: string = 'month') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await this.txRepo.find({
      where: {
        userId,
        createdAt: MoreThan(since),
      },
    });

    const breakdown = this.groupByNetwork(transactions);
    const total = breakdown.reduce((sum, b) => sum + b.spent, 0);

    // Calculate L2 savings insight
    const l2TxCount = breakdown
      .filter(b => ['arbitrum', 'polygon', 'optimism'].includes(b.network))
      .reduce((sum, b) => sum + b.txCount, 0);
    const avgL1Fee = 5; // Rough estimate
    const l2Savings = l2TxCount * avgL1Fee;

    return {
      total: `$${total.toFixed(2)}`,
      period: `Last ${days} days`,
      breakdown,
      insight: l2Savings > 0
        ? `You saved ~$${l2Savings} by using L2s for ${l2TxCount} transactions`
        : null,
    };
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/services/aiService.ts` | CREATE | Intent handler |
| `backend/src/modules/analytics/analytics.module.ts` | CREATE | Analytics module |
| `backend/src/modules/analytics/analytics.controller.ts` | CREATE | Fees endpoint |
| `backend/src/services/Analytics.service.ts` | CREATE | Fee calculations |
| `backend/src/modules/prices/prices.controller.ts` | MODIFY | Add sparkline |
| `mobile/src/components/Chat/FeesSummary.tsx` | CREATE | Fees display |
| `mobile/src/components/Chat/PriceCard.tsx` | CREATE | Price display |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | "What's my balance?" | Returns formatted balance across networks |
| 2 | "Send 0.1 ETH to @alice" | Shows Item Card with resolved address |
| 3 | "Swap 100 USDC for ETH" | Shows swap quote in Item Card |
| 4 | "How much did I spend on gas?" | Shows fee summary with insight |
| 5 | "What's ETH price?" | Shows price with 24h change |
| 6 | "Сколько у меня денег?" (RU) | Works in Russian |
| 7 | "Hello" (unknown) | Shows helpful suggestions |

---

## Definition of Done

- [ ] All 5 commands work end-to-end
- [ ] EN and RU localization works
- [ ] Item Card integration for send/swap
- [ ] Fees analytics endpoint works
- [ ] Price with sparkline works
- [ ] Unknown commands handled gracefully
- [ ] Unit tests pass
- [ ] E2E tests pass
