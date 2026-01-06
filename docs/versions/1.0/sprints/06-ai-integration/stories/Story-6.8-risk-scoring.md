# Story S-27: Transaction Risk Scoring

**Story ID:** S-27
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P0
**Estimate:** 8 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** to see a risk assessment for each transaction
**So that** I can make informed decisions before signing

---

## Acceptance Criteria

- [ ] Backend service calculates risk score (0-100)
- [ ] Risk maps to 3 levels: Safe (0-33), Caution (34-66), Warning (67-100)
- [ ] Provides human-readable risk reasons
- [ ] Checks: recipient history, contract verification, amount deviation, blacklists
- [ ] Response time <200ms
- [ ] Integrates with Item Card (S-21) color coding

---

## Risk Factors

### Scoring Matrix

| Factor | Weight | Conditions |
|--------|--------|------------|
| **Recipient Known** | -20 | User has sent to this address before |
| **Contract Verified** | -15 | Contract is verified on Etherscan |
| **Amount Normal** | 0 | Within 2x user's average |
| **Amount High** | +20 | 2-5x user's average |
| **Amount Very High** | +40 | >5x user's average |
| **New Recipient** | +15 | First-time interaction |
| **Unverified Contract** | +25 | Contract not verified |
| **Blacklisted Address** | +50 | Address in known scam list |
| **Address Age < 30 days** | +10 | Recently created address |

### Risk Level Mapping

| Score Range | Level | Color | Header |
|-------------|-------|-------|--------|
| 0-33 | Safe | `#22C55E` (green) | "SAFE TRANSACTION" |
| 34-66 | Caution | `#EAB308` (yellow) | "REVIEW CAREFULLY" |
| 67-100 | Warning | `#EF4444` (red) | "HIGH RISK" |

---

## Technical Implementation

### API Endpoint

```typescript
// POST /api/risk/assess
// Request
{
  "recipientAddress": "0x742d...3f4a",
  "amount": "0.5",
  "token": "ETH",
  "chainId": "ethereum",
  "senderAddress": "0x123..."
}

// Response
{
  "score": 25,
  "level": "safe",
  "reasons": [
    { "factor": "known_recipient", "impact": -20, "description": "You've sent to this address 5 times" },
    { "factor": "verified_contract", "impact": -15, "description": "Contract verified on Etherscan" },
    { "factor": "amount_high", "impact": +20, "description": "Amount is 3x your average" }
  ],
  "recipientStats": {
    "previousTransactions": 5,
    "firstInteraction": "2025-06-15T10:30:00Z",
    "isContract": false,
    "addressAge": "2 years"
  }
}
```

### Risk Assessment Service

```typescript
// backend/src/services/RiskAssessment.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EtherscanService } from './Etherscan.service';
import { TransactionHistoryService } from './TransactionHistory.service';
import { BlacklistService } from './Blacklist.service';

interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

interface RiskAssessment {
  score: number;
  level: 'safe' | 'caution' | 'warning';
  reasons: RiskFactor[];
  recipientStats: RecipientStats;
}

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(
    private etherscanService: EtherscanService,
    private txHistoryService: TransactionHistoryService,
    private blacklistService: BlacklistService,
  ) {}

  async assessRisk(params: {
    recipientAddress: string;
    amount: string;
    token: string;
    chainId: string;
    senderAddress: string;
  }): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let score = 50; // Start at neutral

    // 1. Check previous interactions
    const history = await this.txHistoryService.getInteractionHistory(
      params.senderAddress,
      params.recipientAddress,
    );

    if (history.count > 0) {
      factors.push({
        factor: 'known_recipient',
        impact: -20,
        description: `You've sent to this address ${history.count} times`,
      });
      score -= 20;
    } else {
      factors.push({
        factor: 'new_recipient',
        impact: +15,
        description: 'First-time interaction with this address',
      });
      score += 15;
    }

    // 2. Check contract verification
    const contractInfo = await this.etherscanService.getContractInfo(
      params.recipientAddress,
      params.chainId,
    );

    if (contractInfo.isContract) {
      if (contractInfo.verified) {
        factors.push({
          factor: 'verified_contract',
          impact: -15,
          description: 'Contract verified on Etherscan',
        });
        score -= 15;
      } else {
        factors.push({
          factor: 'unverified_contract',
          impact: +25,
          description: 'Contract is NOT verified - proceed with caution',
        });
        score += 25;
      }
    }

    // 3. Check amount deviation
    const userAverage = await this.txHistoryService.getUserAverageAmount(
      params.senderAddress,
      params.token,
    );

    const amountNum = parseFloat(params.amount);
    const deviation = amountNum / userAverage;

    if (deviation > 5) {
      factors.push({
        factor: 'amount_very_high',
        impact: +40,
        description: `Amount is ${deviation.toFixed(1)}x your average`,
      });
      score += 40;
    } else if (deviation > 2) {
      factors.push({
        factor: 'amount_high',
        impact: +20,
        description: `Amount is ${deviation.toFixed(1)}x your average`,
      });
      score += 20;
    }

    // 4. Check blacklist
    const isBlacklisted = await this.blacklistService.isBlacklisted(
      params.recipientAddress,
    );

    if (isBlacklisted) {
      factors.push({
        factor: 'blacklisted',
        impact: +50,
        description: 'Address is on known scam/phishing list',
      });
      score += 50;
    }

    // 5. Check address age
    const addressAge = await this.etherscanService.getAddressAge(
      params.recipientAddress,
      params.chainId,
    );

    if (addressAge < 30) {
      factors.push({
        factor: 'new_address',
        impact: +10,
        description: `Address created ${addressAge} days ago`,
      });
      score += 10;
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine level
    const level = score <= 33 ? 'safe' : score <= 66 ? 'caution' : 'warning';

    return {
      score,
      level,
      reasons: factors,
      recipientStats: {
        previousTransactions: history.count,
        firstInteraction: history.firstDate,
        isContract: contractInfo.isContract,
        addressAge: `${addressAge} days`,
      },
    };
  }
}
```

### Blacklist Service

```typescript
// backend/src/services/Blacklist.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);
  private blacklist: Set<string> = new Set();
  private lastUpdate: Date | null = null;

  constructor(private httpService: HttpService) {
    this.loadBlacklist();
  }

  async loadBlacklist(): Promise<void> {
    try {
      // Load from multiple sources
      const sources = [
        'https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/src/addresses/addresses-darklist.json',
        // Add more sources
      ];

      for (const source of sources) {
        const response = await this.httpService.axiosRef.get(source);
        const addresses = response.data.map((item: any) =>
          item.address.toLowerCase()
        );
        addresses.forEach((addr: string) => this.blacklist.add(addr));
      }

      this.lastUpdate = new Date();
      this.logger.log(`Loaded ${this.blacklist.size} blacklisted addresses`);
    } catch (error) {
      this.logger.error('Failed to load blacklist', error);
    }
  }

  async isBlacklisted(address: string): Promise<boolean> {
    // Refresh if older than 24 hours
    if (!this.lastUpdate || Date.now() - this.lastUpdate.getTime() > 86400000) {
      await this.loadBlacklist();
    }

    return this.blacklist.has(address.toLowerCase());
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/src/services/RiskAssessment.service.ts` | CREATE | Risk scoring logic |
| `backend/src/services/Blacklist.service.ts` | CREATE | Scam address list |
| `backend/src/modules/risk/risk.module.ts` | CREATE | Risk module |
| `backend/src/modules/risk/risk.controller.ts` | CREATE | REST endpoint |
| `backend/src/dto/risk-assessment.dto.ts` | CREATE | DTOs |
| `mobile/src/services/riskService.ts` | CREATE | Mobile API client |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Known recipient, normal amount | score < 33, level = 'safe' |
| 2 | New recipient | score increased by +15 |
| 3 | Unverified contract | score increased by +25 |
| 4 | Amount 10x average | score increased by +40 |
| 5 | Blacklisted address | score >= 67, level = 'warning' |
| 6 | Response time | < 200ms |

---

## Definition of Done

- [ ] Risk scoring endpoint works
- [ ] All risk factors calculated correctly
- [ ] Blacklist integration works
- [ ] Response time < 200ms
- [ ] Integrates with Item Card color coding
- [ ] Unit tests pass
- [ ] API documentation updated
