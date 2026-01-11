---
name: ey-sync-check
description: Verify code implementation matches documentation and architecture
---

# E-Y Sync Check Command

Comprehensive verification that code matches documentation exactly.

## Purpose

This command ensures **100% consistency** between:
- Implementation ↔ PRD (features)
- Implementation ↔ Architecture (technical decisions)
- Implementation ↔ Project Context (patterns)

**Goal:** Code should be a mirror of documentation. No inventions. No deviations.

## Sync Check Process

### Phase 1: Load Reference Documents

Read and understand:
1. `docs/v1.0/prd.md` — What to build
2. `docs/v1.0/architecture.md` — How to build it
3. `_bmad-output/planning-artifacts/project-context.md` — Code rules

### Phase 2: Structure Verification

**Check project structure matches architecture:**

```bash
# Compare actual vs documented structure
ls -la apps/mobile/
ls -la apps/api/
ls -la packages/
```

**Expected (from architecture.md):**
```
e-y/
├── apps/
│   ├── mobile/           # Expo app
│   └── api/              # NestJS backend
├── packages/
│   ├── shared/           # @e-y/shared
│   └── crypto/           # @e-y/crypto
```

**Report deviations:**
- Extra directories not in architecture
- Missing required directories
- Files in wrong locations

### Phase 3: Feature Verification

**For each implemented feature, check:**

| Feature | PRD Reference | Implemented | Matches |
|---------|---------------|-------------|---------|
| Wallet Create | FR-1.1 | `features/wallet/` | ✅/❌ |
| BLIK Codes | FR-4.* | `features/blik/` | ✅/❌ |
| etc. | | | |

**Red flags:**
- Feature exists in code but NOT in PRD → **UNAUTHORIZED**
- Feature in PRD but NOT implemented → **MISSING** (ok if not yet done)
- Feature implementation differs from PRD spec → **DEVIATION**

### Phase 4: Technology Stack Verification

**Check dependencies match architecture:**

```bash
# Mobile dependencies
cat apps/mobile/package.json | grep -E "expo|redux|ethers"

# API dependencies
cat apps/api/package.json | grep -E "nestjs|typeorm|postgres"
```

**Expected (from architecture.md):**
- Mobile: Expo SDK 54+, Redux Toolkit, ethers.js v6
- API: NestJS, PostgreSQL, WebSocket

**Report if:**
- Different version than documented
- Extra major dependency not in architecture
- Missing documented dependency

### Phase 5: Pattern Verification

**Check naming conventions:**
```bash
# Find files with wrong naming
find apps/ packages/ -name "*.ts" -o -name "*.tsx" | grep -v "kebab-case-pattern"
```

**Check state management:**
```typescript
// Verify status enum pattern (not boolean)
grep -r "isLoading:" apps/mobile/store/ # Should find NOTHING
grep -r "status:" apps/mobile/store/    # Should find results
```

**Check API response format:**
```typescript
// All responses should have { success, data } or { success, error }
grep -r "return {" apps/api/src/
```

### Phase 6: Security Verification

```bash
# Check for exposed secrets
grep -rE "(API_KEY|SECRET|PASSWORD|PRIVATE_KEY|SEED)" apps/ packages/

# Check secure storage usage
grep -r "SecureStore" apps/mobile/
grep -r "AsyncStorage" apps/mobile/ # Should NOT store sensitive data
```

## Output Format

```markdown
# E-Y Sync Check Report

**Date:** [date]
**Scope:** [what was checked]

## Summary

| Area | Status | Issues |
|------|--------|--------|
| Structure | ✅/❌ | [count] |
| Features | ✅/❌ | [count] |
| Tech Stack | ✅/❌ | [count] |
| Patterns | ✅/❌ | [count] |
| Security | ✅/❌ | [count] |

## Structure Sync

**Expected:** [from architecture.md]
**Actual:** [from codebase]
**Deviations:**
- [list any differences]

## Feature Sync

### Documented Features (PRD)
| Feature | PRD Ref | Status | Notes |
|---------|---------|--------|-------|
| ... | ... | ... | ... |

### Undocumented Code (INVESTIGATE)
- [any code that doesn't map to PRD]

## Technology Sync

| Technology | Architecture Says | Actual | Match |
|------------|-------------------|--------|-------|
| Expo SDK | 54+ | [version] | ✅/❌ |
| ... | ... | ... | ... |

## Pattern Compliance

| Pattern | Rule | Violations |
|---------|------|------------|
| Naming | kebab-case files | [count] |
| State | status enum | [count] |
| Errors | DOMAIN_CODE | [count] |

## Security Check

- Exposed secrets: [count]
- Insecure storage: [count]
- Console.log leaks: [count]

## Action Items

### Critical (Fix Immediately)
1. [unauthorized feature at location]
2. [security issue]

### Warning (Fix Soon)
1. [pattern violation]

### Info (Consider)
1. [suggestion]

---

**Overall Status:** [IN_SYNC / DRIFT_DETECTED / CRITICAL_DEVIATION]
```

## Automation

Run sync check:
```bash
# Create a script for automated checks
# apps/mobile/scripts/sync-check.ts
```

## When to Run

- Before every PR
- After merging major features
- Weekly audit
- When onboarding new AI agent to codebase

## Handling Deviations

**If deviation found:**

1. **Unauthorized feature** → Remove or document in PRD first
2. **Wrong location** → Move to correct location per architecture
3. **Wrong pattern** → Refactor to match project-context.md
4. **Tech deviation** → Justify and update architecture.md OR revert

**Golden Rule:** Documentation is truth. Code must follow.
