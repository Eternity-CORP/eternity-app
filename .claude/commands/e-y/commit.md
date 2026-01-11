---
name: ey-commit
description: Create a properly formatted git commit following E-Y conventions
---

# E-Y Commit Command

Create a git commit following E-Y project conventions.

## Pre-Commit Checks

Before committing, run these checks:

```bash
# 1. Run linter
pnpm lint

# 2. Run type check
pnpm typecheck

# 3. Run tests for changed files
pnpm test --changed
```

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types (MUST use one)
- `feat` — New feature from PRD
- `fix` — Bug fix
- `refactor` — Code restructuring (no behavior change)
- `docs` — Documentation only
- `test` — Adding/updating tests
- `chore` — Build, config, dependencies

### Scopes (use module name)
- `wallet` — Wallet management
- `blik` — BLIK code system
- `send` — Send functionality
- `receive` — Receive functionality
- `security` — Auth & security
- `api` — Backend API
- `shared` — Shared packages
- `crypto` — Crypto package

### Rules
1. First line MAX 72 characters
2. Use imperative mood: "add" not "added"
3. Scope matches architecture module
4. Body explains WHY, not WHAT

## Execution Steps

1. **Check for staged changes:**
   ```bash
   git status
   git diff --staged
   ```

2. **Verify no sensitive data:**
   - No `.env` files
   - No private keys or seeds
   - No API keys

3. **Analyze changes and determine:**
   - Type (feat/fix/refactor/etc.)
   - Scope (which module)
   - Description (what changed)

4. **Create commit:**
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>(<scope>): <description>

   <body if needed>

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

5. **Verify commit:**
   ```bash
   git log -1 --oneline
   ```

## Examples

```bash
# Feature
git commit -m "feat(blik): add 6-digit code generation with 2-min expiry"

# Fix
git commit -m "fix(wallet): correct ERC-20 balance calculation"

# Refactor
git commit -m "refactor(send): extract gas estimation to separate service"

# Multiple files, needs body
git commit -m "$(cat <<'EOF'
feat(security): add biometric authentication option

- Implement FaceID/TouchID using expo-local-authentication
- Add user preference storage in MMKV
- Create BiometricPrompt component

Closes #15

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Forbidden

- NEVER commit `.env` files
- NEVER commit with failing tests
- NEVER commit with lint errors
- NEVER use generic messages like "fix bug" or "update code"
