# E-Y Growth Agents — Design Document

> Created: 2026-01-30
> Status: Approved

## Overview

Virtual team of 3 AI agents to help with E-Y launch, marketing, and fundraising.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Growth Lead                    │ ← Координатор + стратег
│  (план недели, метрики, приоритеты)        │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌───────────┐      ┌─────────────┐
   │  Content  │      │ Opportunity │
   │  & Comms  │      │   Hunter    │
   └───────────┘      └─────────────┘
   посты, питчи,      гранты, акселер.,
   outreach тексты    конкурсы, research
```

## Agents

### 1. Growth Lead (`/ey-growth`)

**Role:** Virtual "Growth CEO". Plans, prioritizes, tracks progress.

**Commands:**
- `/ey-growth` — daily/weekly plan
- `/ey-growth status` — current progress
- `/ey-growth priority` — what to do first

**Context files:**
- `docs/growth/status.md`
- `docs/growth/calendar.md`
- `docs/growth/first-users.md`
- `docs/growth/fundraising.md`

**Workflow:**
1. Shows current status and metrics
2. Generates plan for today
3. Asks: "Call Content agent?" → [Yes] [No] [Skip]
4. If Yes → calls agent with context
5. After task done → asks about next task

### 2. Content & Comms (`/ey-content`)

**Role:** Writes all text content — posts, pitches, emails, grant applications.

**Commands:**
- `/ey-content twitter [topic]`
- `/ey-content telegram [topic]`
- `/ey-content pitch`
- `/ey-content email <type>`
- `/ey-content grant <name>`

**Context files:**
- `docs/v1.0/prd.md`
- `docs/growth/templates/`
- `docs/growth/content-log.md`

**Output:** 2-3 variants to choose from.

### 3. Opportunity Hunter (`/ey-opportunities`)

**Role:** Finds grants, accelerators, competitions. Tracks deadlines.

**Commands:**
- `/ey-opportunities` — all active opportunities
- `/ey-opportunities search` — find new ones
- `/ey-opportunities <name>` — details (polygon, base, alliance)
- `/ey-opportunities deadlines` — upcoming deadlines

**Context files:**
- `docs/growth/fundraising.md`
- `docs/growth/opportunities.md`
- `docs/v1.0/prd.md`

## Inter-Agent Communication

When Growth Lead suggests a task:
1. Asks user: "Call [Agent] for this?"
2. If Yes → calls agent with TaskContext
3. Agent executes and returns result
4. Asks: "Return to Growth Lead for next task?"

```typescript
interface TaskContext {
  task: string;
  topic: string;
  goal: string;
  audience: string;
  tone: string;
  references?: string[];
}
```

## File Structure

```
apps/mobile/.claude/skills/e-y/
├── growth.md
├── content.md
├── opportunities.md
└── _shared-context.md

docs/growth/
├── README.md           # exists
├── first-users.md      # exists
├── fundraising.md      # exists
├── status.md           # NEW
├── content-log.md      # NEW
├── opportunities.md    # NEW
├── calendar.md         # NEW
└── templates/          # NEW
    ├── twitter-post.md
    ├── telegram-post.md
    ├── grant-application.md
    └── pitch-email.md
```

## Sync Rules (for CLAUDE.md)

After any changes:
1. Code changed → verify docs/v1.0/ is current
2. Active tasks exist → update their status
3. Code and docs must be consistent

After Growth agent actions:
1. Update `docs/growth/status.md`
2. Log content in `docs/growth/content-log.md`
3. Update `docs/growth/opportunities.md`
4. Check `docs/growth/calendar.md`

## Future: Telegram Bot

```
apps/telegram-bot/
├── src/
│   ├── bot.service.ts
│   ├── claude.service.ts
│   ├── agents/
│   └── context/
└── package.json
```

Bot will use same agent prompts, accessible via Telegram.

## Implementation Plan

1. [x] Design approved
2. [x] Refactor docs/ — verify current, remove stale
3. [x] Code audit — launch readiness
4. [x] Create status files
5. [x] Create 3 agents
6. [x] Update CLAUDE.md with sync rules
7. [x] Add biometric security (App Lock)
8. [ ] Telegram bot (later)
