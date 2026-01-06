# Sprint 06: AI Integration — Thinking Wallet

**Sprint ID:** SPRINT-06
**Status:** 🚧 In Progress
**Priority:** HIGH
**Duration:** 2-4 weeks
**Source:** [Brainstorming Session](../../../../_bmad-output/analysis/brainstorming-session-2026-01-04.md)

---

## Goal

Transform Eternity from a traditional crypto wallet into a **"Thinking Wallet"** — an AI-powered assistant that understands natural language commands and provides intelligent transaction confirmation through gamified UX.

## Killer Features

| # | Feature | Description | Competitor Gap |
|---|---------|-------------|----------------|
| 1 | **Item Card Transactions** | TX as RPG card with color-coded risk (🟢🟡🔴) | Metamask = boring modal |
| 2 | **Reply-to-Pay** | Natural language confirmation via swipe/text | Competitors = form fields |
| 3 | **Ghost Mode + Duress PIN** | Privacy mode + fake wallet under duress | No competitor has this |

## Stories

| ID | Title | Priority | Status | Estimate |
|----|-------|----------|--------|----------|
| [Story-6.1](./stories/Story-6.1-ai-intent-parser.md) | AI Intent Parser | P0 | ✅ Done | 8h |
| [Story-6.2](./stories/Story-6.2-item-card.md) | Item Card Component | P0 | 🎯 Next | 6h |
| [Story-6.3](./stories/Story-6.3-reply-to-pay.md) | Reply-to-Pay Confirmation | P0 | 📋 Planned | 8h |
| [Story-6.4](./stories/Story-6.4-ghost-mode.md) | Ghost Mode | P1 | 📋 Planned | 6h |
| [Story-6.5](./stories/Story-6.5-duress-pin.md) | Duress PIN | P1 | 📋 Planned | 8h |
| [Story-6.6](./stories/Story-6.6-seed-word-gate.md) | Seed Word Gate | P0 | 📋 Planned | 6h |
| [Story-6.7](./stories/Story-6.7-chat-screen.md) | Chat Screen UI | P1 | 📋 Planned | 10h |
| [Story-6.8](./stories/Story-6.8-risk-scoring.md) | Transaction Risk Scoring | P0 | 📋 Planned | 8h |
| [Story-6.9](./stories/Story-6.9-intent-integration.md) | Intent Commands Integration | P1 | 📋 Planned | 10h |

**Total Estimate:** ~70 hours

## Implementation Phases

### Phase 1: Core AI (Week 1-2)
- Story-6.1: AI Intent Parser
- Story-6.2: Item Card Component
- Story-6.8: Risk Scoring

### Phase 2: Confirmation Flow (Week 2-3)
- Story-6.3: Reply-to-Pay
- Story-6.7: Chat Screen UI
- Story-6.9: Intent Integration

### Phase 3: Security Features (Week 3-4)
- Story-6.4: Ghost Mode
- Story-6.5: Duress PIN
- Story-6.6: Seed Word Gate

## Technical Requirements

### New Dependencies

| Package | Purpose |
|---------|---------|
| `groq-sdk` | LLM inference (fast, cheap) |
| `langchain` | Agent orchestration |

### Success Metrics

| Metric | Target |
|--------|--------|
| Intent parsing accuracy | >95% |
| Transaction confirmation time | <3 seconds |
| Ghost Mode adoption | >30% |

## Definition of Done

- [ ] All 9 stories completed
- [ ] Unit tests for intent parser (>90% accuracy)
- [ ] E2E test: command → execution
- [ ] Security audit: Duress PIN and Seed Gate
- [ ] UX testing: 5 users can send without help
