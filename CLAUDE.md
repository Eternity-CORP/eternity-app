# E-Y Project Instructions for Claude

**IMPORTANT: Read this file and project-context.md before writing ANY code.**

## Quick Reference

### Reference Documents (MUST read before implementing)
- `docs/v1.0/architecture.md` — Technical decisions and structure
- `docs/v1.0/prd.md` — Product requirements
- `docs/v1.0/project-context.md` — Code rules and patterns

### Custom Commands

#### Main Command
| Command | Purpose |
|---------|---------|
| `/ey-flow` | **Full workflow orchestrator** — task → code → done |
| `/ey-flow E-XX` | Start flow with specific task |
| `/ey-flow resume` | Continue where you left off |

#### Development Commands
| Command | Purpose |
|---------|---------|
| `/ey-commit` | Create properly formatted git commit |
| `/ey-push` | Push with pre-push verification |
| `/ey-review` | Code review against documentation |
| `/ey-sync-check` | Verify code matches architecture |
| `/ey-dev` | Start development server |
| `/ey-build` | Build development client or production app |
| `/ey-status` | Show project status (builds, deps, sprint) |

#### Linear Commands (Task Management)
| Command | Purpose |
|---------|---------|
| `/ey-linear-status` | Show sprint progress and active issues |
| `/ey-linear-start [E-XX]` | Start working on issue (→ In Progress + git branch) |
| `/ey-linear-done [E-XX]` | Mark issue as Done |
| `/ey-linear-create` | Create new issue with project/priority selection |

**Recommended Workflow (use `/ey-flow`):**
```
/ey-flow
  │
  ├─ 1. SELECT  → Pick task from Linear
  ├─ 2. START   → Create branch, set In Progress
  ├─ 3. PLAN    → Show acceptance criteria
  ├─ 4. CODE    → Write implementation
  ├─ 5. VERIFY  → Test on device (check each AC)
  ├─ 6. CHECK   → Lint, types, tests
  ├─ 7. COMMIT  → Commit changes
  ├─ 8. PUSH    → Push to remote
  ├─ 9. DONE    → Close Linear issue
  └─ 10. NEXT   → Suggest next task
```

**Manual Workflow (individual commands):**
```
1. /ey-linear-status          — See what's in backlog
2. /ey-linear-start E-7       — Start working (creates branch)
3. ... implement the feature ...
4. /ey-commit                  — Commit changes
5. /ey-linear-done E-7        — Mark as complete
```

## Core Rules

### 1. Documentation First
```
ALWAYS: Code follows documentation
NEVER:  Invent features not in PRD
```

### 2. No Duplication
```
ALWAYS: Check if function/component exists before creating
NEVER:  Copy-paste code between files
```

### 3. Architecture Compliance
```
ALWAYS: Put files where architecture.md says
NEVER:  Create new directories without checking architecture
```

## Before Writing Code

- [ ] Feature exists in `docs/v1.0/prd.md`
- [ ] Technical approach in `docs/v1.0/architecture.md`
- [ ] No duplicate code exists
- [ ] File location matches project structure

## Technology Stack (DO NOT CHANGE)

| Layer | Technology |
|-------|------------|
| Mobile | Expo SDK 54+, TypeScript, Redux Toolkit |
| Backend | NestJS, PostgreSQL, WebSocket |
| Blockchain | ethers.js v6, Alchemy RPC |
| Monorepo | Turborepo + pnpm |

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `wallet-service.ts` |
| Components | PascalCase | `BalanceCard.tsx` |
| Functions | camelCase | `getUserBalance()` |
| Constants | SCREAMING_SNAKE | `MAX_BLIK_AGE` |
| Types | PascalCase | `BlikCode` |

## Error Handling

```typescript
// Use domain-prefixed error codes
'WALLET_NOT_FOUND'
'BLIK_CODE_EXPIRED'
'TX_FAILED'
```

## State Management

```typescript
// Use status enum, NOT isLoading boolean
interface State {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

## Security

**NEVER:**
- Log sensitive data (seeds, keys)
- Store keys in plain AsyncStorage
- Send private keys to server
- Commit `.env` files

**ALWAYS:**
- Use `expo-secure-store` for secrets
- Clear sensitive data from memory
- Validate all external input

---

**For full rules, see:** `docs/v1.0/project-context.md`
