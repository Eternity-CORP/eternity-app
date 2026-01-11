# E-Y Project Instructions for Claude

**IMPORTANT: Read this file and project-context.md before writing ANY code.**

## Quick Reference

### Reference Documents (MUST read before implementing)
- `docs/v1.0/architecture.md` — Technical decisions and structure
- `docs/v1.0/prd.md` — Product requirements
- `docs/v1.0/project-context.md` — Code rules and patterns

### Custom Commands

| Command | Purpose |
|---------|---------|
| `/ey-commit` | Create properly formatted git commit |
| `/ey-push` | Push with pre-push verification |
| `/ey-review` | Code review against documentation |
| `/ey-sync-check` | Verify code matches architecture |

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
