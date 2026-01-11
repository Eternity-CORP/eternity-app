# E-Y Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### 2026-01-11 - Project Foundation

#### Story 1.1: Initialize Monorepo Structure ✅
- Created monorepo with Turborepo + pnpm
- Setup `apps/mobile/` - Expo React Native app
- Setup `apps/api/` - NestJS backend
- Setup `packages/shared/` - @e-y/shared (types, utils)
- Setup `packages/crypto/` - @e-y/crypto (wallet, signing with ethers.js v6)
- Configured `turbo.json`, `pnpm-workspace.yaml`, `.npmrc`

#### Story 1.2: Setup Expo Mobile App ✅
- Configured Expo SDK 52+ with TypeScript strict mode
- Setup Expo Router with tabs (Home, Wallet, Shard)
- Configured Redux Toolkit store
- Added expo-dev-client for development builds
- Created EAS Build configuration (eas.json)
- Added design system theme constants (`src/constants/theme.ts`)
- Setup metro.config.js for monorepo support

#### Design System
- Analyzed World App reference design (10 screenshots)
- Created `docs/design/DESIGN_SYSTEM.md` with:
  - Color palette
  - Typography scale
  - Spacing system
  - Component patterns
  - Screen reference map

### Project Structure
```
e-y/
├── apps/
│   ├── mobile/           # Expo React Native
│   │   ├── app/          # Expo Router pages
│   │   │   └── (tabs)/   # Tab navigation
│   │   └── src/          # Source code
│   └── api/              # NestJS backend
├── packages/
│   ├── shared/           # @e-y/shared
│   └── crypto/           # @e-y/crypto
└── docs/
    ├── v1.0/             # Documentation
    └── design/           # Design assets
```

---

## Upcoming

### Story 1.3: Setup NestJS Backend
- WebSocket gateway for BLIK
- Health check endpoint
- Environment configuration

### Story 1.4: Create Shared Packages
- Complete types (BlikCode, etc.)
- Validation utilities
- Error codes
