---
name: ey-push
description: Push changes with pre-push verification checks
---

# E-Y Push Command

Push changes to remote with all required verifications.

## Pre-Push Checklist

Before pushing, verify ALL of the following:

### 1. Code Quality
```bash
# Lint check
pnpm lint

# Type check
pnpm typecheck

# Tests
pnpm test
```

### 2. Documentation Sync
Verify that pushed code matches documentation:

- [ ] All implemented features exist in PRD
- [ ] Implementation follows architecture.md patterns
- [ ] No undocumented features added
- [ ] No deviation from architectural decisions

### 3. Security Check
- [ ] No `.env` files in commit
- [ ] No hardcoded secrets
- [ ] No console.log with sensitive data
- [ ] Secure storage used for keys

### 4. Branch State
```bash
# Check branch is up to date
git fetch origin
git status

# If behind, rebase first
git pull --rebase origin main
```

## Execution Steps

1. **Run all checks:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```

2. **Review commits being pushed:**
   ```bash
   git log origin/main..HEAD --oneline
   ```

3. **Check for sensitive data:**
   ```bash
   git diff origin/main..HEAD | grep -E "(API_KEY|SECRET|PASSWORD|SEED|PRIVATE)"
   ```

4. **Push to remote:**
   ```bash
   git push origin <branch-name>
   ```

5. **Verify push:**
   ```bash
   git log origin/<branch-name> -1 --oneline
   ```

## Branch Naming

```
feat/<feature-name>    # New features
fix/<bug-description>  # Bug fixes
refactor/<area>        # Refactoring
docs/<what>            # Documentation
```

### Examples
```
feat/blik-code-generation
fix/wallet-balance-display
refactor/send-service-cleanup
docs/api-documentation
```

## Push Rules

### ALLOWED
- Push to feature branches: `feat/*`, `fix/*`, etc.
- Push to `develop` after PR review
- Push docs changes directly if no code changes

### FORBIDDEN
- NEVER force push to `main`
- NEVER push with failing tests
- NEVER push with lint errors
- NEVER push without running type check

## Troubleshooting

### Push rejected (non-fast-forward)
```bash
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git push origin <branch-name>
```

### Large files rejected
```bash
# Check for large files
find . -size +10M -type f

# If accidentally committed, remove from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch <file>' HEAD
```

## After Push

1. Create PR if ready for review
2. Ensure CI passes
3. Request code review
