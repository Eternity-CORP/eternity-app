# E-Y Developer Commands

Quick reference for all available Claude Code commands in this project.

## Git & Code Quality

| Command | Description | Usage |
|---------|-------------|-------|
| `/ey-commit` | Create a properly formatted git commit | After making changes |
| `/ey-push` | Push changes with pre-push verification | After committing |
| `/ey-review` | Review code for consistency with docs | Before PR |
| `/ey-sync-check` | Verify implementation matches documentation | Weekly audit |

## Development

| Command | Description | Usage |
|---------|-------------|-------|
| `/ey-dev` | Start Expo development server | Daily development |
| `/ey-refresh` | Clear cache and restart dev server | When seeing stale code |
| `/ey-build` | Build app (iOS/Android, dev/preview/prod) | After native changes |
| `/ey-run` | Run latest build on simulator/emulator | Test builds |
| `/ey-status` | Show project status and sprint progress | Check progress |

## Planning & Documentation

| Command | Description | Usage |
|---------|-------------|-------|
| `/bmad:bmm:workflows:create-product-brief` | Create product brief | Project start |
| `/bmad:bmm:workflows:create-prd` | Create PRD document | After brief |
| `/bmad:bmm:workflows:create-architecture` | Create architecture doc | After PRD |
| `/bmad:bmm:workflows:create-epics-and-stories` | Generate epics & stories | After architecture |
| `/bmad:bmm:workflows:sprint-planning` | Plan sprints | Before implementation |
| `/bmad:bmm:workflows:dev-story` | Execute a story | During implementation |

---

## Command Details

### `/ey-dev`

Start the mobile development server for testing.

```bash
# Basic usage (Expo Go)
/ey-dev

# With options
/ey-dev --clear    # Clear cache first
/ey-dev --tunnel   # For remote access
```

**What happens:**
1. Starts Expo dev server
2. Shows QR code for Expo Go
3. Hot reload enabled for code changes

---

### `/ey-build`

Build the mobile app for different platforms and environments.

```bash
# iOS Simulator (fastest, no Apple Developer needed)
/ey-build ios dev

# Android APK
/ey-build android dev

# Production builds
/ey-build ios prod
/ey-build android prod
```

**Profiles:**
- `dev` — Development client with debugging
- `preview` — Internal testing (Ad-hoc/APK)
- `prod` — App Store / Play Store ready

---

### `/ey-run`

Run the latest cloud build on simulator/emulator.

```bash
/ey-run ios      # iOS Simulator
/ey-run android  # Android Emulator
```

---

### `/ey-refresh`

Clear all caches and restart fresh.

```bash
/ey-refresh
```

**Use when:**
- Hot reload stops working
- Seeing old/cached code
- After installing new packages
- After changing babel/metro config

---

### `/ey-commit`

Create a properly formatted commit following project conventions.

```bash
/ey-commit
```

**Commit format:**
```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

### `/ey-push`

Push changes with pre-push verification.

```bash
/ey-push
```

**Checks before push:**
- TypeScript compilation
- Lint errors
- Tests (if configured)

---

### `/ey-review`

Review code for consistency with documentation and architecture.

```bash
/ey-review
```

**Reviews:**
- Code matches PRD requirements
- Follows architecture patterns
- Adheres to project-context.md rules

---

### `/ey-sync-check`

Comprehensive verification that code matches documentation.

```bash
/ey-sync-check
```

**Checks:**
- Structure matches architecture.md
- Features match PRD
- Naming conventions
- Security rules
- No unauthorized features

---

### `/ey-status`

Show comprehensive project status.

```bash
/ey-status
```

**Shows:**
- Latest EAS builds
- Dependencies status
- TypeScript check
- Sprint progress (X/21 stories)

---

## Terminal Commands (Manual)

For running outside Claude Code:

```bash
# Navigate to project
cd "/Users/daniillogachev/Ma project/E-Y"

# Install dependencies
pnpm install

# Start all services (mobile + API)
pnpm dev

# Mobile only
cd apps/mobile && npx expo start

# Build for simulator
cd apps/mobile && eas build --profile development --platform ios

# Run on simulator
cd apps/mobile && eas build:run --platform ios

# TypeScript check
pnpm typecheck

# Lint
pnpm lint
```

---

## Workflow Examples

### Daily Development
```
1. /ey-dev              # Start dev server
2. Open Expo Go on phone
3. Scan QR code
4. Make changes → auto hot reload
5. /ey-commit           # When done
6. /ey-push             # Push to remote
```

### After Adding Native Module
```
1. pnpm install         # Install package
2. /ey-build ios dev    # Rebuild dev client
3. /ey-run ios          # Install new build
4. /ey-dev              # Start dev server
```

### Weekly Audit
```
1. /ey-sync-check       # Verify code matches docs
2. /ey-status           # Check overall progress
3. /ey-review           # Code quality check
```

### Starting New Story
```
1. /bmad:bmm:workflows:dev-story Story X.X
2. Follow workflow steps
3. /ey-commit
4. /ey-push
```

---

## Project Structure

```
e-y/
├── apps/
│   ├── mobile/         # Expo React Native app
│   └── api/            # NestJS backend
├── packages/
│   ├── shared/         # @e-y/shared (types, utils)
│   └── crypto/         # @e-y/crypto (wallet, signing)
├── docs/
│   ├── v1.0/           # Documentation
│   │   ├── prd.md
│   │   ├── architecture.md
│   │   ├── epics.md
│   │   └── sprint-status.yaml
│   └── design/         # Design assets & system
└── .claude/
    └── commands/e-y/   # Custom commands
```

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/v1.0/prd.md` | Product requirements |
| `docs/v1.0/architecture.md` | Technical decisions |
| `docs/v1.0/epics.md` | Stories and progress |
| `docs/v1.0/project-context.md` | Coding rules |
| `docs/v1.0/sprint-status.yaml` | Sprint tracking |
| `docs/design/DESIGN_SYSTEM.md` | UI patterns |
