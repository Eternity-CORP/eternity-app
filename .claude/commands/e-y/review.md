---
name: ey-review
description: Review code for consistency with documentation and architecture
---

# E-Y Code Review Command

Perform comprehensive code review checking consistency with documentation.

## Review Scope

This command reviews:
1. **Documentation Consistency** — Code matches PRD and Architecture
2. **Code Quality** — Clean, no duplicates, follows patterns
3. **Security** — No vulnerabilities or exposed secrets
4. **Testing** — Adequate test coverage

## Pre-Review: Load Reference Documents

Before reviewing, load these documents:

```
docs/v1.0/architecture.md      # Technical decisions
docs/v1.0/prd.md               # Feature requirements
_bmad-output/planning-artifacts/project-context.md  # Code rules
```

## Review Checklist

### 1. Documentation Alignment

**PRD Check:**
- [ ] Feature is documented in PRD
- [ ] Implementation matches PRD requirements
- [ ] No features added that aren't in PRD
- [ ] User flows match PRD descriptions

**Architecture Check:**
- [ ] Technology stack matches architecture.md
- [ ] File locations follow project structure
- [ ] Patterns match Implementation Patterns section
- [ ] API format follows documented standard

**Red Flags:**
```
❌ "I added this feature because it seemed useful"
❌ "I used X library instead of Y because..."
❌ "I put this file here because it made sense"
```

### 2. Code Quality

**Duplication Check:**
```bash
# Search for similar code patterns
grep -r "pattern" apps/ packages/

# Check if utility exists
ls packages/shared/src/utils/
```

**File Length:**
- Components: MAX 200 lines
- Services: MAX 300 lines
- Functions: MAX 30 lines

**Naming Conventions:**
| Element | Convention | Valid |
|---------|------------|-------|
| Files | kebab-case | `wallet-service.ts` |
| Components | PascalCase | `BalanceCard.tsx` |
| Functions | camelCase | `getUserBalance` |
| Constants | SCREAMING_SNAKE | `MAX_BLIK_AGE` |

### 3. Security Review

**Check for exposed secrets:**
```bash
# Search for potential leaks
grep -rE "(password|secret|key|token|seed|private)" --include="*.ts" --include="*.tsx"

# Check console.log statements
grep -r "console.log" apps/ --include="*.ts" --include="*.tsx"
```

**Verify secure storage usage:**
```typescript
// ❌ WRONG
AsyncStorage.setItem('seed', seed);

// ✅ CORRECT
SecureStore.setItemAsync('seed', encryptedSeed);
```

### 4. Import Structure

Verify import order:
```typescript
// 1. React/RN
// 2. Third-party
// 3. @e-y/* packages
// 4. Relative imports
// 5. Types
```

### 5. Error Handling

Check error patterns:
```typescript
// ✅ Proper error format
throw new AppError('DOMAIN_ERROR_CODE', 'User message');

// ✅ Proper catch handling
catch (error) {
  if (error.code === 'KNOWN_ERROR') {
    // Handle specifically
  }
  // Log and show generic message
}
```

### 6. Testing

- [ ] Tests exist for new code
- [ ] Tests are co-located with source
- [ ] Test naming follows convention
- [ ] Critical paths have tests

## Review Output Format

After review, provide:

```markdown
## Code Review: [Feature/File Name]

### Summary
[Brief overview of what was reviewed]

### Documentation Alignment
✅ Matches PRD: [yes/no with details]
✅ Follows Architecture: [yes/no with details]

### Issues Found

#### Critical (Must Fix)
1. [Issue description]
   - Location: `file:line`
   - Problem: [what's wrong]
   - Fix: [how to fix]

#### Warnings (Should Fix)
1. [Issue description]

#### Suggestions (Nice to Have)
1. [Suggestion]

### Code Quality Score
- Documentation Match: [1-5]
- Clean Code: [1-5]
- Security: [1-5]
- Testing: [1-5]

**Overall: [PASS/NEEDS_CHANGES/FAIL]**
```

## Quick Commands

```bash
# Check file for issues
pnpm lint <file>

# Run tests for file
pnpm test <file>

# Check types
pnpm typecheck
```

## When to Reject

**REJECT immediately if:**
- Feature not in PRD and not approved
- Security vulnerability found
- Hardcoded secrets
- No tests for critical code
- Major deviation from architecture
