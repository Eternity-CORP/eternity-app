---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['docs/v1.0/prd.md', 'docs/v1.0/product-brief.md', 'docs/research/market-research.md', 'docs/research/brainstorming-session.md']
workflowType: 'architecture'
project_name: 'E-Y'
user_name: 'Daniel'
date: '2026-01-11'
status: 'COMPLETED'
completedAt: '2026-01-11'
---

# Architecture Decision Document - E-Y

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

| Group | Count | Architectural Impact |
|-------|-------|---------------------|
| FR-1: Wallet Management | 5 | BIP-39 crypto module, secure storage, multi-account derivation |
| FR-2: Send Functionality | 5 | Transaction service, gas estimation, multi-mode sending |
| FR-3: Receive Functionality | 4 | QR generation, address display, BLIK receive mode |
| FR-4: BLIK Code System | 5 | **Critical**: Real-time WebSocket backend, code generation/matching |
| FR-5: Identity (@username) | 3 | Centralized registry service, lookup API |
| FR-6: Feature Overlays | 3 | Contact storage, scheduler, split-bill request system |

**Total**: 25 functional requirements across 6 domains.

**Post-MVP Features (Architecture Must Support):**

| Feature | Architectural Implications |
|---------|---------------------------|
| **AI Financial Agent** | Chat interface layer, LLM integration points, transaction intent parsing, proactive notification system, personality/context storage |
| **SHARD (NFC Passport)** | NFC module abstraction, identity attestation storage, SDK integration layer (Didit/ReadID), zero-knowledge proof handling |

**Non-Functional Requirements:**

| NFR | Critical Targets | Architectural Decision Driver |
|-----|-----------------|------------------------------|
| NFR-1: Performance | BLIK < 500ms, launch < 2s | Optimized state, lazy loading |
| NFR-2: Reliability | 99% tx success, 99.9% BLIK match | Error handling, retry logic |
| NFR-3: Security | Secure enclave, no server custody | Self-custody architecture |
| NFR-4: Usability | < 3min first transaction | Streamlined flows, clear UX |
| NFR-5: Compatibility | iOS 14+, Android 8+ | React Native + Expo |

### Scale & Complexity

- **Primary domain**: Mobile App (React Native + Expo) + Blockchain/Web3
- **Complexity level**: HIGH
- **Estimated architectural components**:
  - Mobile: 6 core modules + 2 future modules (AI, SHARD)
  - Backend: 2 services + future AI service
  - External: Blockchain + future LLM API + future NFC SDK

### Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| $0 budget | Free-tier services only, solo developer |
| Self-custody | No server-side key storage, all crypto client-side |
| EthCC demo deadline | MVP must be polished and demo-ready |
| Testnet only (MVP) | Ethereum Sepolia, no mainnet complexity |
| React Native + Expo | Cross-platform but some native limitations |

**External Dependencies (MVP):**
- ethers.js v6: blockchain interaction
- Expo SDK: secure storage, camera (QR), haptics
- WebSocket library: BLIK real-time matching

**Future Dependencies (Post-MVP):**
- OpenAI/Anthropic API: AI agent intelligence
- ElevenLabs/Whisper: voice interaction
- Didit/ReadID SDK: NFC passport verification
- react-native-nfc-manager: NFC hardware access

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Resolution Approach |
|---------|--------------------|--------------------|
| **Security** | All modules | Secure enclave, encryption, audit-ready code |
| **Real-time Updates** | BLIK, Balances, AI responses | WebSocket layer, optimistic UI |
| **Network Abstraction** | Send, Receive, Balances | UI layer hides chains, single token view |
| **Error Handling** | All transactions | User-friendly messages, retry mechanisms |
| **Offline Behavior** | Wallet, History | Local cache, graceful degradation |
| **Testnet/Mainnet Switch** | All blockchain calls | Environment config, feature flags |
| **Extensibility** | Core architecture | Plugin-ready design for AI & SHARD modules |

### Future-Ready Architecture Considerations

**AI Agent Preparation:**
```
┌─────────────────────────────────────────────────────────┐
│                    MVP ARCHITECTURE                      │
│  ┌─────────────┐                                        │
│  │  Chat UI    │ ← Interface ready for AI responses     │
│  │  (Shell)    │                                        │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │  Intent     │ ──► │ Transaction Service         │   │
│  │  Parser     │     │ (Same as manual flows)      │   │
│  │  (Simple)   │     └─────────────────────────────┘   │
│  └─────────────┘                                        │
│         │                                               │
│         ▼ POST-MVP                                      │
│  ┌─────────────┐                                        │
│  │  LLM API    │ ← Plug in GPT-4o/Claude               │
│  │  + Context  │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

**SHARD NFC Preparation:**
```
┌─────────────────────────────────────────────────────────┐
│                    MVP ARCHITECTURE                      │
│  ┌─────────────┐                                        │
│  │  Identity   │ ← @username system                     │
│  │  Module     │                                        │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼ POST-MVP                                      │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │  NFC        │ ──► │ Passport SDK (Didit)        │   │
│  │  Scanner    │     │ Zero-knowledge attestation   │   │
│  └─────────────┘     └─────────────────────────────┘   │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  SHARD      │ ← Unique human badge on profile       │
│  │  Badge      │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

**Key Principle:** MVP modules designed as interfaces/abstractions that can be extended without breaking changes.

## Starter Template Evaluation

### Primary Technology Domain

Mobile App (React Native + Expo) — cross-platform iOS/Android application with blockchain integration.

### Starter Options Considered

| Option | Technology | Status |
|--------|------------|--------|
| create-expo-app (official) | Expo SDK 54+, TypeScript | ✅ Recommended |
| wataru-maeda/react-native-boilerplate | Redux Toolkit, Expo Router | Alternative |
| Obytes Starter | Professional setup, Zod | Considered |

### Selected Starter: create-expo-app (official)

**Rationale:**
- Official Expo template ensures compatibility and latest SDK
- Clean slate allows precise configuration for crypto wallet requirements
- Solo developer benefits from understanding every dependency
- Secure storage and crypto modules need careful integration

**Initialization Command:**

```bash
npx create-expo-app@latest e-y --template tabs
cd e-y
```

**Post-initialization Setup:**

```bash
# TypeScript (included in tabs template)
# Redux Toolkit
npx expo install @reduxjs/toolkit react-redux

# Blockchain
npx expo install ethers

# Secure Storage
npx expo install expo-secure-store

# Development Build support
npx expo install expo-dev-client

# Additional Expo modules
npx expo install expo-camera expo-haptics expo-clipboard expo-local-authentication
```

### Development Workflow

**Approach:** Development Builds (not Expo Go)

**Rationale:**
- E-Y requires native modules not available in Expo Go
- Secure storage for seed phrases (expo-secure-store)
- Remote push notifications for BLIK matching
- Biometric authentication (FaceID/TouchID)
- Future: NFC for SHARD passport verification

**Setup:**

```bash
# Configure EAS
eas build:configure

# Create development builds
eas build --profile development --platform all

# Start development (after build installed)
npx expo start --dev-client
```

**Build Frequency:**
- Initial: One-time build for iOS + Android
- Rebuild: Only when adding native dependencies
- Daily work: Hot reload like Expo Go

### Architectural Decisions from Starter

**Language & Runtime:**
- TypeScript strict mode
- Expo SDK 54+ (managed workflow)

**Navigation:**
- Expo Router (file-based routing)
- Tab navigation for main screens
- Stack navigation for flows

**Styling:**
- StyleSheet (React Native default)
- Consider NativeWind later for consistency

**State Management:**
- Redux Toolkit (manual setup)
- RTK Query for API calls

**Build Tooling:**
- Expo CLI for development
- EAS Build for development builds and production

**Project Structure:**
```
e-y/
├── app/                 # Expo Router pages
│   ├── (tabs)/         # Tab navigation
│   ├── _layout.tsx     # Root layout
│   └── index.tsx       # Entry point
├── components/         # Reusable components
├── features/           # Feature modules (wallet, send, receive, blik)
├── services/           # API, blockchain, storage services
├── store/              # Redux store, slices
├── utils/              # Helpers, constants
└── types/              # TypeScript types
```

**Note:** Project initialization is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Monorepo structure (Turborepo + pnpm)
- Secure storage strategy (expo-secure-store + MMKV)
- Authentication flow (user-configurable biometrics/PIN)
- RPC provider (Alchemy primary, Infura fallback)

**Important Decisions (Shape Architecture):**
- State management patterns (Redux Toolkit)
- API communication (REST + WebSocket)
- Development workflow (EAS + Orbit)

**Deferred Decisions (Post-MVP):**
- AI service architecture
- NFC SDK integration
- Mainnet RPC strategy

### Monorepo Architecture

**Tool Stack:**
- **Turborepo** — build orchestration, caching
- **pnpm** — package management with workspaces
- **Namespace:** @e-y/*

**Structure:**
```
e-y/
├── apps/
│   ├── mobile/              # Expo React Native
│   │   ├── app/            # Expo Router pages
│   │   ├── components/     # App-specific components
│   │   ├── features/       # Feature modules
│   │   ├── services/       # App services
│   │   ├── store/          # Redux store
│   │   └── app.json
│   └── api/                 # NestJS Backend
│       ├── src/
│       │   ├── modules/    # Feature modules
│       │   ├── common/     # Shared utilities
│       │   └── main.ts
│       └── package.json
├── packages/
│   ├── @e-y/shared/         # Shared code
│   │   ├── types/          # TypeScript types
│   │   ├── constants/      # Shared constants
│   │   └── utils/          # Pure utilities
│   └── @e-y/crypto/         # Crypto utilities
│       ├── wallet/         # BIP-39, key derivation
│       ├── signing/        # Transaction signing
│       └── encryption/     # Data encryption
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .npmrc                   # node-linker=hoisted
```

**Configuration Files:**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```ini
# .npmrc
node-linker=hoisted
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

### Data Architecture

**Mobile Storage Strategy:**

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Seed phrase | expo-secure-store | Secure enclave, encrypted |
| Private keys | In-memory only | Never persisted |
| Settings, contacts | MMKV | Fast, synchronous |
| Transaction cache | MMKV | Performance |
| @username mapping | API + MMKV cache | Server source of truth |

**Why MMKV over AsyncStorage:**
- 30x faster read/write
- Synchronous API (no await needed)
- Battle-tested (WeChat uses it)

### Authentication & Security

**Security Layers:**

```
┌─────────────────────────────────────────────────────────┐
│                    APP LAUNCH                            │
│                                                          │
│  [No auth by default] ──► User can enable:              │
│                           • Biometric (FaceID/TouchID)  │
│                           • PIN code                     │
│                           • Both (PIN + Biometric)      │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  TRANSACTION SIGNING                     │
│                                                          │
│  [User configurable]:                                   │
│  • No confirmation (trust mode)                         │
│  • Biometric for all transactions                       │
│  • PIN for all transactions                             │
│  • Threshold: Biometric > $X, nothing below             │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- expo-local-authentication — biometrics
- expo-secure-store — PIN hash storage
- User preferences stored in MMKV (encrypted)

**Security Settings Interface:**
```typescript
interface SecuritySettings {
  appLockEnabled: boolean;
  appLockMethod: 'biometric' | 'pin' | 'both' | 'none';
  transactionConfirmation: 'always' | 'threshold' | 'never';
  transactionThreshold?: number; // USD value
}
```

### API & Communication

**RPC Provider:**
- **Primary:** Alchemy (300M compute units/month free)
- **Fallback:** Infura
- **Testnet:** Sepolia endpoints

**Backend API:**
- REST API (NestJS) — @username CRUD, user preferences
- WebSocket (NestJS Gateway) — BLIK real-time matching

**API Endpoints:**
```
POST   /api/auth/register      # Device registration
POST   /api/auth/login         # Device auth

GET    /api/username/:name     # Lookup @username → address
POST   /api/username           # Register @username
PUT    /api/username           # Update @username

WS     /blik                   # BLIK code coordination
  → emit: 'create-code'        # Generate code
  → emit: 'redeem-code'        # Enter code
  → on: 'code-matched'         # Both parties notified
  → on: 'code-expired'         # 2 min timeout
```

### Frontend Architecture

**State Management (Redux Toolkit):**

```
store/
├── index.ts                 # Store configuration
├── hooks.ts                 # Typed hooks
└── slices/
    ├── walletSlice.ts       # Accounts, balances, selected account
    ├── transactionSlice.ts  # Pending tx, history, status
    ├── blikSlice.ts         # Active codes, matching state
    ├── contactsSlice.ts     # Saved recipients
    ├── settingsSlice.ts     # App preferences, security settings
    └── networkSlice.ts      # Connection status, selected network
```

**API Layer:**
- RTK Query — backend API calls with caching
- Custom hooks — blockchain calls (ethers.js)

### Infrastructure & Deployment

**Mobile (Expo/EAS):**
- Development builds via EAS Build
- Expo Orbit for simulator management
- TestFlight (iOS) / Internal Testing (Android)

**Backend:**
- **Platform:** Railway (includes PostgreSQL)
- **Why:** Free tier, easy deploy, built-in Postgres

**Environment Strategy:**

| Environment | Blockchain | Backend | Build |
|-------------|------------|---------|-------|
| Local | Sepolia | localhost | Dev |
| Staging | Sepolia | Railway | Preview |
| Production | Mainnet | Railway | Release |

### Development Workflow

**Tools:**
- Expo CLI + expo-dev-client
- Expo Orbit (simulator management)
- EAS Build (development builds)
- Turborepo (monorepo orchestration)

**Daily Development:**
```bash
# Start all services
pnpm dev

# Runs via Turborepo:
# - apps/mobile: npx expo start --dev-client
# - apps/api: nest start --watch
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo setup (Turborepo + pnpm)
2. Mobile app initialization (Expo)
3. Shared packages (@e-y/shared, @e-y/crypto)
4. Backend initialization (NestJS)
5. Core wallet features
6. BLIK system
7. Security settings

**Cross-Component Dependencies:**
- @e-y/shared → used by mobile + api
- @e-y/crypto → used by mobile only (client-side signing)
- Mobile ↔ API via REST + WebSocket
- Mobile → Blockchain via ethers.js + Alchemy RPC

## Implementation Patterns & Consistency Rules

### Purpose

These patterns ensure consistent code regardless of who writes it (human, AI agent, future developers). Following these prevents conflicts and makes the codebase predictable.

### Naming Patterns

**Database (PostgreSQL):**

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `users`, `blik_codes` |
| Columns | snake_case | `user_id`, `created_at` |
| Foreign Keys | `{table}_id` | `user_id`, `transaction_id` |
| Indexes | `idx_{table}_{cols}` | `idx_users_email` |

**API Endpoints:**

| Element | Convention | Example |
|---------|------------|---------|
| Resources | plural, kebab-case | `/api/blik-codes` |
| Parameters | camelCase | `?userId=123` |
| Actions | POST with body | `POST /api/blik-codes { action: 'redeem' }` |

**Code (TypeScript):**

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `wallet-service.ts` |
| Components | PascalCase | `WalletCard.tsx` |
| Functions | camelCase | `getUserBalance()` |
| Variables | camelCase | `walletAddress` |
| Constants | SCREAMING_SNAKE | `MAX_BLIK_AGE` |
| Types/Interfaces | PascalCase | `BlikCode`, `User` |

### Structure Patterns

**Test Location:**
- Unit tests: Co-located with source (`*.test.ts` next to `*.ts`)
- E2E tests: `__tests__/e2e/`

**Feature Organization:**
```
features/{feature-name}/
├── components/      # Feature-specific UI
├── hooks/           # Custom hooks
├── services/        # Business logic
├── types.ts         # Types
└── index.ts         # Public exports
```

**Shared Code:**
```
packages/@e-y/shared/
├── types/           # Shared TypeScript types
├── constants/       # Shared constants
└── utils/           # Pure utility functions
```

### Format Patterns

**API Response Structure:**

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: {
    code: string,      // SCREAMING_SNAKE
    message: string    // Human-readable
  }
}

// Paginated
{
  success: true,
  data: T[],
  pagination: {
    total: number,
    page: number,
    limit: number
  }
}
```

**Date Format:** ISO 8601 strings everywhere
```
"2026-01-11T14:30:00.000Z"
```

**JSON Conventions:**
- API responses: camelCase
- Database: snake_case
- Transform at API boundary

### State Management Patterns

**Slice Structure:**
```typescript
interface FeatureState {
  // Data
  items: Item[];
  selectedId: string | null;

  // Status
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

**Action Naming:** verb + noun
```typescript
setSelectedAccount, clearError, resetState
```

**Async Actions:** entity/action
```typescript
wallet/fetchAccounts, blik/createCode
```

**Selectors:** `select` + description
```typescript
selectAllAccounts, selectIsLoading, selectError
```

### Error Handling Patterns

**Error Codes:** DOMAIN_SPECIFIC_ERROR
```typescript
// By domain
'WALLET_NOT_FOUND'
'WALLET_INSUFFICIENT_BALANCE'
'BLIK_CODE_EXPIRED'
'BLIK_CODE_INVALID'
'TX_FAILED'
'TX_REJECTED_BY_USER'
```

**Error Display:**
- Technical errors → logged, generic message to user
- Business errors → specific message from ERROR_MESSAGES map
- Network errors → "Connection failed. Please try again."

**Error Boundaries:**
- Per-feature error boundaries in React
- Global fallback for unexpected errors

### Loading State Patterns

**Naming:**
```typescript
status: 'idle' | 'loading' | 'succeeded' | 'failed'
```

**UI Patterns:**
- Skeleton loaders for initial load
- Inline spinners for actions
- Disable buttons during pending operations
- Optimistic updates where safe

### Enforcement Guidelines

**All Code MUST:**
1. Follow naming conventions exactly
2. Use the standard API response format
3. Handle errors with proper error codes
4. Include loading states for async operations
5. Co-locate tests with source files

**Linting:**
- ESLint enforces naming conventions
- Prettier handles formatting
- TypeScript strict mode catches type issues

### Anti-Patterns to Avoid

```typescript
// ❌ Wrong file naming
BlikService.ts              // Should be: blik-service.ts

// ❌ Wrong function naming
CreateBlikCode()            // Should be: createBlikCode()

// ❌ Wrong error format
throw new Error('expired')  // Should be: { code: 'BLIK_CODE_EXPIRED', ... }

// ❌ Wrong state shape
isLoading: boolean          // Should be: status: 'idle' | 'loading' | ...
```

## Project Structure & Boundaries

### Complete Monorepo Structure

```
e-y/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, test
│       └── eas-build.yml             # EAS builds trigger
├── .vscode/
│   └── settings.json                 # Shared VS Code settings
├── apps/
│   ├── mobile/                       # Expo React Native App
│   │   ├── app/                      # Expo Router pages
│   │   │   ├── (tabs)/               # Tab navigation
│   │   │   │   ├── index.tsx         # Home (balances)
│   │   │   │   ├── send.tsx          # Send screen
│   │   │   │   ├── receive.tsx       # Receive screen
│   │   │   │   └── settings.tsx      # Settings
│   │   │   ├── (auth)/               # Auth flow (if locked)
│   │   │   │   ├── pin.tsx           # PIN entry
│   │   │   │   └── biometric.tsx     # Biometric prompt
│   │   │   ├── (onboarding)/         # First launch
│   │   │   │   ├── welcome.tsx
│   │   │   │   ├── create-wallet.tsx
│   │   │   │   ├── import-wallet.tsx
│   │   │   │   └── seed-phrase.tsx
│   │   │   ├── blik/
│   │   │   │   ├── create.tsx        # Generate BLIK code
│   │   │   │   ├── enter.tsx         # Enter BLIK code
│   │   │   │   └── status.tsx        # BLIK transaction status
│   │   │   ├── transaction/
│   │   │   │   └── [id].tsx          # Transaction details
│   │   │   ├── _layout.tsx           # Root layout
│   │   │   └── +not-found.tsx
│   │   ├── components/               # App-specific components
│   │   │   ├── ui/                   # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── index.ts
│   │   │   ├── wallet/
│   │   │   │   ├── BalanceCard.tsx
│   │   │   │   ├── TokenList.tsx
│   │   │   │   └── AccountSelector.tsx
│   │   │   ├── blik/
│   │   │   │   ├── BlikCodeDisplay.tsx
│   │   │   │   ├── BlikCodeInput.tsx
│   │   │   │   └── BlikTimer.tsx
│   │   │   └── transaction/
│   │   │       ├── TransactionItem.tsx
│   │   │       └── TransactionList.tsx
│   │   ├── features/                 # Feature modules
│   │   │   ├── wallet/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useWallet.ts
│   │   │   │   │   └── useBalance.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── wallet-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── blik/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useBlik.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── blik-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── send/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useSend.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── send-service.ts
│   │   │   │   └── index.ts
│   │   │   └── security/
│   │   │       ├── hooks/
│   │   │       │   ├── useBiometric.ts
│   │   │       │   └── usePin.ts
│   │   │       ├── services/
│   │   │       │   └── auth-service.ts
│   │   │       └── index.ts
│   │   ├── store/                    # Redux store
│   │   │   ├── index.ts              # Store config
│   │   │   ├── hooks.ts              # Typed hooks
│   │   │   └── slices/
│   │   │       ├── wallet-slice.ts
│   │   │       ├── blik-slice.ts
│   │   │       ├── transaction-slice.ts
│   │   │       ├── contacts-slice.ts
│   │   │       └── settings-slice.ts
│   │   ├── services/                 # Global services
│   │   │   ├── api.ts                # RTK Query setup
│   │   │   ├── storage.ts            # MMKV wrapper
│   │   │   ├── secure-storage.ts     # expo-secure-store wrapper
│   │   │   └── blockchain.ts         # ethers.js provider
│   │   ├── constants/
│   │   │   ├── chains.ts
│   │   │   ├── tokens.ts
│   │   │   └── config.ts
│   │   ├── utils/
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   ├── __tests__/
│   │   │   └── e2e/
│   │   │       ├── onboarding.test.ts
│   │   │       └── blik-flow.test.ts
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── metro.config.js
│   │   ├── babel.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # NestJS Backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   ├── configuration.ts
│       │   │   └── validation.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   └── auth.service.test.ts
│       │   │   ├── username/
│       │   │   │   ├── username.module.ts
│       │   │   │   ├── username.controller.ts
│       │   │   │   ├── username.service.ts
│       │   │   │   └── username.service.test.ts
│       │   │   └── blik/
│       │   │       ├── blik.module.ts
│       │   │       ├── blik.gateway.ts     # WebSocket
│       │   │       ├── blik.service.ts
│       │   │       └── blik.service.test.ts
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── guards/
│       │   │   ├── pipes/
│       │   │   └── interceptors/
│       │   └── database/
│       │       ├── entities/
│       │       │   ├── user.entity.ts
│       │       │   ├── username.entity.ts
│       │       │   └── blik-code.entity.ts
│       │       └── migrations/
│       ├── test/
│       │   └── e2e/
│       │       └── app.e2e-spec.ts
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # @e-y/shared
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── wallet.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   ├── blik.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── errors.ts
│   │   │   │   ├── limits.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── crypto/                       # @e-y/crypto
│       ├── src/
│       │   ├── wallet/
│       │   │   ├── generate.ts       # BIP-39 generation
│       │   │   ├── derive.ts         # Key derivation
│       │   │   ├── generate.test.ts
│       │   │   └── index.ts
│       │   ├── signing/
│       │   │   ├── transaction.ts    # TX signing
│       │   │   ├── message.ts        # Message signing
│       │   │   └── index.ts
│       │   ├── encryption/
│       │   │   ├── aes.ts            # Data encryption
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .npmrc                            # node-linker=hoisted
├── .prettierrc
├── package.json                      # Root package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json                # Shared TS config
└── README.md
```

### Requirements to Structure Mapping

| Feature | Mobile Location | API Location | Package |
|---------|-----------------|--------------|---------|
| Wallet Create/Import | `app/(onboarding)/` | — | `@e-y/crypto` |
| Balances | `app/(tabs)/index.tsx` | — | — |
| Send to Address | `features/send/` | — | `@e-y/crypto` |
| Send to @username | `features/send/` | `modules/username/` | `@e-y/shared` |
| BLIK Codes | `app/blik/`, `features/blik/` | `modules/blik/` | `@e-y/shared` |
| Contacts | `store/slices/contacts-slice.ts` | — | — |
| Security Settings | `features/security/` | — | — |

### Architectural Boundaries

**Mobile App Layers:**
```
UI (app/) → Hooks (features/*/hooks/) → Services (features/*/services/) → Store (store/)
                                              │
                                              ├─▶ API (services/api.ts)
                                              ├─▶ Blockchain (services/blockchain.ts)
                                              └─▶ Storage (services/storage.ts)
```

**Backend Layers:**
```
Controller → Service → Repository → Database
     │
     └─▶ Gateway (WebSocket for BLIK)
```

**Package Dependencies:**
```
@e-y/shared ◀── apps/mobile
           ◀── apps/api

@e-y/crypto ◀── apps/mobile (only)
```

### Integration Points

**Mobile ↔ Backend:**
- REST API: `/api/*` endpoints via RTK Query
- WebSocket: `/blik` namespace for real-time BLIK matching

**Mobile ↔ Blockchain:**
- ethers.js JsonRpcProvider → Alchemy/Infura RPC
- Direct contract calls for token transfers

**Data Flow:**
```
User Action → Component → Hook → Service → Redux Action → State Update → UI
                                    │
                                    ├─▶ API Call → Backend → Database
                                    └─▶ Blockchain Call → RPC → Chain
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts:
- Expo SDK 54+ with managed workflow
- TypeScript strict mode across all packages
- Redux Toolkit with RTK Query for state and API
- ethers.js v6 for blockchain interactions
- NestJS with WebSocket gateway for backend

**Pattern Consistency:**
- Naming conventions consistent (kebab-case files, PascalCase components)
- State management patterns unified (Redux slices with status enum)
- API response format standardized across all endpoints
- Error handling follows DOMAIN_ERROR_CODE pattern

**Structure Alignment:**
- Monorepo structure supports package sharing
- Feature-based organization enables parallel development
- Clear boundaries between mobile, API, and shared packages

### Requirements Coverage ✅

**Functional Requirements:**

| FR | Status | Architectural Support |
|----|--------|----------------------|
| FR-1: Wallet Management | ✅ | `@e-y/crypto` package, `features/wallet/` |
| FR-2: Send Functionality | ✅ | `features/send/`, blockchain service |
| FR-3: Receive Functionality | ✅ | `app/(tabs)/receive.tsx`, QR generation |
| FR-4: BLIK Code System | ✅ | `features/blik/`, `modules/blik/` WebSocket |
| FR-5: Identity (@username) | ✅ | `modules/username/` REST API |
| FR-6: Feature Overlays | ✅ | Redux slices, local storage |

**Non-Functional Requirements:**

| NFR | Status | Implementation Approach |
|-----|--------|------------------------|
| NFR-1: Performance | ✅ | MMKV storage, optimistic UI updates |
| NFR-2: Reliability | ✅ | Error boundaries, retry logic, status tracking |
| NFR-3: Security | ✅ | expo-secure-store, biometrics, no server custody |
| NFR-4: Usability | ✅ | Network abstraction, simplified flows |
| NFR-5: Compatibility | ✅ | Expo managed workflow, iOS 14+/Android 8+ |

### Implementation Readiness ✅

**Decision Completeness:**
- All critical decisions documented with rationale
- Technology versions specified and verified
- Integration patterns clearly defined
- Security architecture comprehensive

**Structure Completeness:**
- Complete monorepo directory tree defined
- All files and directories specified
- Component boundaries established
- Package dependencies mapped

**Pattern Completeness:**
- Naming conventions for all code elements
- State management patterns with examples
- Error handling with error codes
- API response format standardized

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (HIGH)
- [x] Technical constraints identified ($0 budget, solo dev)
- [x] Cross-cutting concerns mapped (security, real-time, network abstraction)
- [x] Post-MVP features considered (AI Agent, SHARD)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST, WebSocket, RPC)
- [x] Performance considerations addressed (MMKV, optimistic updates)

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented (error handling, loading states)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Clear monorepo structure with separation of concerns
- Comprehensive security architecture (self-custody model)
- Future-ready design (AI Agent, SHARD extension points)
- Consistent patterns prevent AI agent conflicts
- Development workflow optimized (EAS Build, Expo Orbit)

**Areas for Future Enhancement:**
- Push notification service configuration
- Price feed integration for USD equivalents
- Analytics and monitoring setup
- Mainnet deployment strategy

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. Refer to this document for all architectural questions
5. Co-locate tests with source files

**First Implementation Priority:**
```bash
# Step 1: Initialize monorepo
mkdir e-y && cd e-y
pnpm init

# Step 2: Configure workspace
# Create pnpm-workspace.yaml, turbo.json, .npmrc

# Step 3: Initialize apps
npx create-expo-app@latest apps/mobile --template tabs
nest new apps/api

# Step 4: Create shared packages
mkdir -p packages/shared packages/crypto

# Step 5: Install dev client and build
cd apps/mobile
npx expo install expo-dev-client
eas build:configure
```

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-11
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 15+ architectural decisions made
- 5 implementation pattern categories defined
- 6 feature modules specified (wallet, blik, send, receive, security, contacts)
- 25 functional requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Expo SDK 54+, TypeScript, Redux Toolkit, ethers.js v6, NestJS)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries (monorepo: apps + packages)
- Integration patterns and communication standards (REST + WebSocket + RPC)

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing E-Y. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Initialize monorepo structure with Turborepo + pnpm

**Development Sequence:**

1. Initialize monorepo (Turborepo + pnpm + .npmrc with node-linker=hoisted)
2. Create Expo mobile app with Development Build setup
3. Create NestJS backend with WebSocket gateway
4. Set up shared packages (@e-y/shared, @e-y/crypto)
5. Implement core wallet features
6. Implement BLIK code system
7. Add security settings layer

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The chosen technology stack and architectural patterns provide a production-ready foundation following current best practices.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

