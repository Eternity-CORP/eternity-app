---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['docs/v1.0/prd.md', 'docs/v1.0/product-brief.md', 'docs/research/market-research.md', 'docs/research/brainstorming-session.md']
workflowType: 'architecture'
project_name: 'E-Y'
user_name: 'Daniel'
date: '2026-01-11'
lastUpdated: '2026-02-08'
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

**Implemented Post-MVP Features:**

| Feature | Status | Architectural Implications |
|---------|--------|---------------------------|
| **AI Financial Agent** | IMPLEMENTED | Claude LLM provider, 8 AI tools, intent parser, proactive service, security layer, WebSocket + REST transport |

**Future Features (Architecture Must Support):**

| Feature | Architectural Implications |
|---------|---------------------------|
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

- **Primary domain**: Mobile App (React Native + Expo) + Web App (Next.js 16) + Blockchain/Web3
- **Complexity level**: HIGH
- **Estimated architectural components**:
  - Mobile: 6 core modules + AI (implemented) + SHARD (future)
  - Web App: 23 pages, 11 service modules, AI chat
  - Backend: 11 feature modules including AI service
  - External: Blockchain + Anthropic Claude API + future NFC SDK

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

**Current Dependencies (Implemented):**
- @anthropic-ai/sdk: AI agent intelligence (Claude LLM)
- @supabase/supabase-js: Database and auth
- Next.js 16: Web application

**Future Dependencies (Post-MVP):**
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

**AI Agent Architecture (IMPLEMENTED):**
```
┌─────────────────────────────────────────────────────────┐
│                AI SYSTEM (LIVE)                           │
│  ┌─────────────┐                                        │
│  │  Chat UI    │ ← Mobile + Web AI chat interfaces      │
│  │  (Default)  │   Default tab on mobile                 │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │  Intent     │ ──► │ 8 AI Tools                  │   │
│  │  Parser     │     │ Balance, Send, History,      │   │
│  │  (NLP)      │     │ Contacts, Scheduled, BLIK,  │   │
│  └─────────────┘     │ Swap                         │   │
│         │            └─────────────────────────────┘   │
│         ▼                                               │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │  Claude LLM │ ──► │ Proactive Service           │   │
│  │  Provider   │     │ Suggestions, reminders,      │   │
│  │  (Anthropic)│     │ contact save prompts         │   │
│  └─────────────┘     └─────────────────────────────┘   │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  Security   │ ← Rate limiter, audit logger,         │
│  │  Layer      │   security validation                  │
│  └─────────────┘                                        │
│                                                          │
│  Transport: REST + WebSocket Gateway                     │
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

**Mobile Project Structure (apps/mobile/):**
```
apps/mobile/
├── app/                 # Expo Router pages
│   ├── (tabs)/         # Tab navigation (ai, home, shard + hidden)
│   ├── (onboarding)/   # First launch flow
│   ├── blik/           # BLIK screens
│   ├── send/           # Send flow
│   ├── _layout.tsx     # Root layout
│   └── +not-found.tsx
├── src/                 # Source code
│   ├── components/     # UI components
│   ├── services/       # API, blockchain, storage
│   ├── store/          # Redux store (17 slices)
│   └── hooks/          # Custom hooks
└── app.json
```

**Mobile Tabs (3 visible + 2 hidden):**
- `ai` -- "AI" (default landing, icon: magic)
- `home` -- "Wallet" (icon: home)
- `shard` -- "Profile" (icon: user)
- `wallet` -- hidden (wallet detail)
- `transactions` -- hidden (transaction list)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Monorepo structure (Turborepo + pnpm)
- Secure storage strategy (expo-secure-store + AsyncStorage on mobile, Web Crypto + IndexedDB on web)
- Database (Supabase -- migrated from TypeORM+PostgreSQL)
- Authentication flow (user-configurable biometrics/PIN)
- RPC provider (Alchemy primary, Infura fallback)

**Important Decisions (Shape Architecture):**
- State management patterns (Redux Toolkit on mobile, React Context on web)
- API communication (REST + WebSocket)
- AI service (Claude via @anthropic-ai/sdk, 8 tools, proactive service)
- Development workflow (EAS + Orbit)

**Deferred Decisions (Post-MVP):**
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
│   ├── mobile/              # Expo React Native (SDK 54, React 19)
│   │   ├── app/            # Expo Router pages (tabs, onboarding, flows)
│   │   ├── src/            # Source (components, services, store, hooks)
│   │   └── app.json
│   ├── api/                 # NestJS Backend
│   │   ├── src/
│   │   │   ├── ai/         # AI module (Claude, tools, proactive, security)
│   │   │   ├── blik/       # BLIK code lifecycle (WebSocket)
│   │   │   ├── transaction/ # Transaction handling (WebSocket)
│   │   │   ├── username/   # Username registry
│   │   │   ├── split/      # Split bill (REST + WebSocket)
│   │   │   ├── scheduled/  # Scheduled payments (REST + WebSocket)
│   │   │   ├── waitlist/   # Waitlist management
│   │   │   ├── notifications/ # Push notifications
│   │   │   ├── preferences/ # User network preferences
│   │   │   ├── health/     # Health check
│   │   │   ├── supabase/   # Supabase client wrapper (global)
│   │   │   ├── common/     # Shared utilities
│   │   │   └── main.ts
│   │   └── Dockerfile
│   ├── web/                 # Next.js 16 Web App (React 19, Tailwind v4)
│   │   ├── src/app/        # App Router (23 pages)
│   │   ├── src/components/ # UI + Chat components
│   │   ├── src/contexts/   # AccountContext, BalanceContext
│   │   ├── src/lib/        # Service layer (11 modules)
│   │   └── src/hooks/      # useAiChat, useAuthGuard
│   └── website/             # Marketing Landing (Next.js 14, Three.js)
│       ├── src/app/        # Pages (home, press-kit, privacy, terms)
│       └── src/components/ # 3D, animations, sections
├── packages/
│   ├── shared/              # @e-y/shared (zero runtime dependencies)
│   │   ├── src/api/        # 4 API clients (username, split, scheduled, preferences)
│   │   ├── src/config/     # Network configs (multi-network)
│   │   ├── src/constants/  # 6 constant files (errors, limits, erc20, swap, coingecko)
│   │   ├── src/services/   # 11 services (balance, blik-socket, ai-socket, bridge, contacts, price-chart, routing, swap, transaction-history, transaction-socket)
│   │   ├── src/types/      # 11 type files (ai, blik, bridge-errors, network-balance, scheduled, split, swap, transaction, user, wallet)
│   │   └── src/utils/      # 9 utils (account, async, debounce, format, send, split, username, validation)
│   ├── crypto/              # @e-y/crypto (wallet generation, derivation, signing, mnemonic validation)
│   ├── storage/             # @e-y/storage (Web Crypto + IndexedDB abstraction)
│   └── ui/                  # @e-y/ui (Button, Card, Input, Loading, FadeIn, GlitchText)
├── supabase/
│   └── migrations/          # Database migrations
├── turbo.json
├── pnpm-workspace.yaml
├── package.json             # pnpm@9.1.0, turbo@2.0.0
├── vercel.json
├── railway.json
├── docker-compose.yml
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

**Database: Supabase**

The project uses Supabase (hosted PostgreSQL + client SDK) instead of self-hosted PostgreSQL with TypeORM. All backend services use `SupabaseService` for database operations. Migrations are managed via `supabase/migrations/`.

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend DB | Supabase (PostgreSQL) | Via `@supabase/supabase-js` |
| Migrations | Supabase CLI | `supabase/migrations/` directory |
| ORM | None (Supabase client) | Direct queries via `SupabaseService` |

**Mobile Storage Strategy:**

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Seed phrase | expo-secure-store | Secure enclave, encrypted |
| Private keys | In-memory only | Never persisted |
| Settings, contacts | AsyncStorage | Persistent key-value storage |
| Transaction cache | AsyncStorage | Persistent cache |
| @username mapping | API + AsyncStorage cache | Server source of truth |

**Web App Storage Strategy:**

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Encrypted wallet data | IndexedDB (via @e-y/storage) | Large binary data, Web Crypto encryption |
| Session keys | Web Crypto API | In-memory, derived from password |
| Settings, preferences | localStorage | Simple key-value |
| Auth state | React Context | In-memory, re-derived on unlock |

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
- expo-local-authentication -- biometrics
- expo-secure-store -- PIN hash storage
- User preferences stored in AsyncStorage

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

**Backend API (NestJS, 11 modules):**
- REST API -- username CRUD, split bill, scheduled payments, waitlist, notifications, preferences, AI, health
- WebSocket Gateways -- BLIK matching, transactions, split bill, scheduled payments, AI chat

**API Modules:**

| Module | Type | Purpose |
|--------|------|---------|
| SupabaseModule | Global | Supabase client wrapper |
| HealthModule | REST | Health check endpoint |
| UsernameModule | REST | Username registry (lookup, register, update) |
| BlikModule | WebSocket | BLIK code lifecycle (create, redeem, match, expire) |
| TransactionModule | WebSocket | Transaction handling and notifications |
| SplitModule | REST + WS | Split bill creation, joining, settlement |
| ScheduledModule | REST + WS | Scheduled/recurring payments |
| WaitlistModule | REST | Waitlist management |
| NotificationsModule | REST | Push notification registration and sending |
| AiModule | REST + WS | AI chat with Claude LLM, tools, intent parser, proactive service, security |
| PreferencesModule | REST | User network preferences |

**Key REST Endpoints:**
```
GET    /health                  # Health check

GET    /api/username/:name      # Lookup @username -> address
POST   /api/username            # Register @username
PUT    /api/username            # Update @username

POST   /api/split              # Create split bill
GET    /api/split/:id          # Get split details
POST   /api/split/:id/join     # Join a split

POST   /api/scheduled          # Create scheduled payment
GET    /api/scheduled/:address # Get user scheduled payments
DELETE /api/scheduled/:id      # Cancel scheduled payment

POST   /api/waitlist           # Join waitlist

POST   /api/notifications/register  # Register push token

POST   /api/ai/chat            # AI chat (REST fallback)
GET    /api/ai/suggestions     # Get proactive suggestions

POST   /api/preferences        # Save network preferences
GET    /api/preferences/:address # Get network preferences
```

**WebSocket Gateways:**
```
WS     /blik                   # BLIK code coordination
  -> emit: 'create-code'       # Generate code
  -> emit: 'redeem-code'       # Enter code
  -> on: 'code-matched'        # Both parties notified
  -> on: 'code-expired'        # 2 min timeout

WS     /transactions           # Transaction notifications
  -> emit: 'subscribe'         # Subscribe to address
  -> on: 'transaction-update'  # Real-time tx status

WS     /split                  # Split bill real-time
  -> emit: 'join-split'        # Join split room
  -> on: 'split-updated'       # Participant updates

WS     /scheduled              # Scheduled payment notifications
  -> on: 'payment-due'         # Payment reminder

WS     /ai                     # AI chat real-time
  -> emit: 'message'           # Send message to AI
  -> on: 'response'            # AI response stream
  -> on: 'tool-result'         # Tool execution result
  -> on: 'suggestion'          # Proactive suggestion
```

### Frontend Architecture

**Mobile State Management (Redux Toolkit, 17 slices):**

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
    ├── networkSlice.ts      # Connection status, selected network
    ├── aiSlice.ts           # AI chat state, messages, suggestions
    ├── splitSlice.ts        # Split bill state
    ├── scheduledSlice.ts    # Scheduled payments
    ├── swapSlice.ts         # Token swap state
    └── ...                  # Additional feature slices (17 total)
```

**Mobile API Layer:**
- RTK Query -- backend API calls with caching
- Custom hooks -- blockchain calls (ethers.js)
- @e-y/shared services -- shared business logic (balance, swap, bridge, etc.)

**Web App State Management (React Context):**

```
contexts/
├── AccountContext.tsx        # Wallet, accounts, selected network, derivation
└── BalanceContext.tsx        # Balances per network, refresh, loading state
```

**Web App Service Layer (src/lib/, 11 modules):**

```
lib/
├── account-storage.ts       # Encrypted wallet persistence (via @e-y/storage)
├── api.ts                   # API client for backend calls
├── bridge-service.ts        # Cross-chain bridge operations
├── contacts-service.ts      # Contact management
├── markdown.ts              # Markdown rendering for AI chat
├── multi-network.ts         # Multi-network balance aggregation
├── network.ts               # Network configuration and switching
├── routing-service.ts       # Transaction routing logic
├── send-service.ts          # Send transaction flow
├── session-crypto.ts        # Session encryption (Web Crypto API)
└── swap.ts                  # Token swap service
```

**Web App AI Chat:**
- Full chat interface with Claude LLM
- Tool calling (inline cards for BLIK, Send, Swap, ContactSave)
- Suggestion chips for quick actions
- WebSocket transport for real-time streaming

### Web App Architecture (Next.js 16)

**Technology Stack:**
- Next.js 16 with App Router (React 19)
- Tailwind CSS v4
- Dark theme with glass morphism design system
- TypeScript strict mode

**Routes (23 pages):**

| Route | Purpose |
|-------|---------|
| `/` | Landing/entry page |
| `/create` | Wallet creation |
| `/create/password` | Set wallet password |
| `/import` | Wallet import |
| `/import/password` | Set import password |
| `/unlock` | Unlock existing wallet |
| `/pay/:recipient` | Direct payment link |
| `/wallet` | Main dashboard |
| `/wallet/blik` | BLIK code generation |
| `/wallet/blik/received` | BLIK received confirmation |
| `/wallet/contacts` | Contact management |
| `/wallet/history` | Transaction history |
| `/wallet/receive` | Receive tokens (QR, address) |
| `/wallet/scheduled` | Scheduled payments |
| `/wallet/send` | Send flow |
| `/wallet/send/success` | Send success confirmation |
| `/wallet/settings` | Settings overview |
| `/wallet/settings/networks` | Network configuration |
| `/wallet/settings/privacy` | Privacy settings |
| `/wallet/split` | Split bill |
| `/wallet/swap` | Token swap |
| `/wallet/token/:symbol` | Token detail view |
| `/wallet/username` | Username management |

**State Management:**
- `AccountContext` -- wallet state, accounts list, selected network, account derivation
- `BalanceContext` -- token balances per network, refresh mechanism, loading state
- No Redux -- uses React Context for simpler architecture suited to web

**Security Model:**
- Wallet encrypted at rest using Web Crypto API (AES-GCM)
- Stored in IndexedDB via `@e-y/storage` package
- Session key derived from user password (PBKDF2)
- No private keys sent to server -- all signing client-side via `@e-y/crypto`
- Auth guard hook (`useAuthGuard`) redirects unauthenticated users

**Design System:**
- Dark theme with glass morphism effects
- CSS classes: `glass-card`, `glass-card-glow`, `gradient-border`, `shimmer`, `text-gradient`
- Ambient glow orbs in layout (3 floating colored orbs)
- Grid background via `bg-grid` class
- Color palette: black base, white/opacity surfaces, accent-blue (#3388FF), accent-cyan (#00E5FF)

### Infrastructure & Deployment

**Mobile (Expo/EAS):**
- Development builds via EAS Build
- Expo Orbit for simulator management
- TestFlight (iOS) / Internal Testing (Android)

**Backend (API):**
- **Platform:** Railway (via `railway up -d` from monorepo root)
- **Dockerfile:** `apps/api/Dockerfile`
- **Database:** Supabase (hosted PostgreSQL, not Railway Postgres)

**Web App:**
- **Platform:** Vercel (deployed from monorepo root)
- **URL:** https://e-y-app.vercel.app
- **Deploy:** `vercel --prod` from monorepo root (not from `apps/web/` due to workspace:* dependencies)

**Website (Marketing Landing):**
- **Platform:** Vercel (deployed from `apps/website/`)
- **URL:** https://eternity-wallet.vercel.app
- **Deploy:** `vercel --prod` from `apps/website/`

**Environment Strategy:**

| Environment | Blockchain | Backend | Web App | Build |
|-------------|------------|---------|---------|-------|
| Local | Sepolia | localhost | localhost:3000 | Dev |
| Staging | Sepolia | Railway (preview) | Vercel (preview) | Preview |
| Production | Mainnet | Railway | Vercel (prod) | Release |

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
# - apps/web: next dev
# - apps/website: next dev
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
- @e-y/shared -> used by mobile + web + api
- @e-y/crypto -> used by mobile + web (client-side signing)
- @e-y/storage -> used by web (IndexedDB + Web Crypto)
- @e-y/ui -> used by web + website (shared UI components)
- Mobile <-> API via REST + WebSocket
- Web <-> API via REST + WebSocket
- Mobile -> Blockchain via ethers.js + Alchemy RPC
- Web -> Blockchain via ethers.js + Alchemy RPC

## Implementation Patterns & Consistency Rules

### Purpose

These patterns ensure consistent code regardless of who writes it (human, AI agent, future developers). Following these prevents conflicts and makes the codebase predictable.

### Naming Patterns

**Database (Supabase / PostgreSQL):**

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
packages/shared/             # @e-y/shared (zero runtime dependencies)
├── src/api/                # 4 API clients (username, split, scheduled, preferences)
├── src/config/             # Network configs (multi-network)
├── src/constants/          # 6 constant files (errors, limits, erc20, swap, coingecko)
├── src/services/           # 11 services (balance, blik-socket, ai-socket, bridge, etc.)
├── src/types/              # 11 type files (ai, blik, network-balance, swap, etc.)
└── src/utils/              # 9 utils (account, async, debounce, format, send, etc.)
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
├── apps/
│   ├── mobile/                       # Expo React Native (SDK 54, React 19)
│   │   ├── app/                      # Expo Router pages
│   │   │   ├── (tabs)/               # Tab navigation (3 visible + 2 hidden)
│   │   │   │   ├── ai.tsx            # AI chat (DEFAULT tab, icon: magic)
│   │   │   │   ├── home.tsx          # Wallet (icon: home)
│   │   │   │   ├── shard.tsx         # Profile (icon: user)
│   │   │   │   ├── wallet.tsx        # Hidden: wallet detail
│   │   │   │   └── transactions.tsx  # Hidden: transaction list
│   │   │   ├── (onboarding)/         # First launch
│   │   │   ├── blik/                 # BLIK flow screens
│   │   │   ├── send/                 # Send flow screens
│   │   │   ├── transaction/          # Transaction details
│   │   │   ├── _layout.tsx           # Root layout
│   │   │   └── +not-found.tsx
│   │   ├── src/                      # Source code
│   │   │   ├── components/           # UI components (wallet, blik, send, etc.)
│   │   │   ├── services/             # App services (api, blockchain, storage)
│   │   │   ├── store/                # Redux store (17 slices)
│   │   │   └── hooks/                # Custom hooks
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── metro.config.js
│   │   └── package.json
│   │
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── supabase/            # Supabase client wrapper (global module)
│   │   │   │   ├── supabase.module.ts
│   │   │   │   └── supabase.service.ts
│   │   │   ├── health/              # Health check
│   │   │   ├── username/            # Username registry
│   │   │   │   ├── username.module.ts
│   │   │   │   ├── username.controller.ts
│   │   │   │   └── username.service.ts
│   │   │   ├── blik/                # BLIK code lifecycle (WebSocket)
│   │   │   │   ├── blik.module.ts
│   │   │   │   ├── blik.gateway.ts
│   │   │   │   └── blik.service.ts
│   │   │   ├── transaction/         # Transaction handling (WebSocket)
│   │   │   ├── split/               # Split bill (REST + WebSocket)
│   │   │   │   ├── split.module.ts
│   │   │   │   ├── split.controller.ts
│   │   │   │   ├── split.service.ts
│   │   │   │   ├── split.gateway.ts
│   │   │   │   ├── dto/
│   │   │   │   └── entities/
│   │   │   ├── scheduled/           # Scheduled payments (REST + WebSocket)
│   │   │   │   ├── scheduled.module.ts
│   │   │   │   ├── scheduled.controller.ts
│   │   │   │   ├── scheduled.service.ts
│   │   │   │   ├── scheduled.gateway.ts
│   │   │   │   ├── dto/
│   │   │   │   └── entities/
│   │   │   ├── waitlist/            # Waitlist management
│   │   │   │   ├── waitlist.module.ts
│   │   │   │   ├── waitlist.controller.ts
│   │   │   │   ├── waitlist.service.ts
│   │   │   │   └── dto/
│   │   │   ├── notifications/       # Push notifications
│   │   │   │   ├── notifications.module.ts
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   └── dto/
│   │   │   ├── ai/                  # AI chat with Claude LLM
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.gateway.ts    # WebSocket for real-time chat
│   │   │   │   ├── services/        # AI service layer
│   │   │   │   ├── providers/       # Claude LLM provider (@anthropic-ai/sdk)
│   │   │   │   ├── tools/           # 8 AI tools (Balance, Send, History, Contacts, Scheduled, BlikGenerate, BlikLookup, Swap)
│   │   │   │   ├── proactive/       # Proactive suggestions, reminders, contact save
│   │   │   │   ├── security/        # Rate limiter, audit logger, security validation
│   │   │   │   ├── dto/
│   │   │   │   └── entities/
│   │   │   ├── preferences/         # User network preferences
│   │   │   │   ├── preferences.module.ts
│   │   │   │   ├── preferences.controller.ts
│   │   │   │   ├── preferences.service.ts
│   │   │   │   ├── dto/
│   │   │   │   └── entities/
│   │   │   └── common/              # Shared utilities
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   └── package.json
│   │
│   ├── web/                          # Next.js 16 Web App (React 19, Tailwind v4)
│   │   ├── src/
│   │   │   ├── app/                  # App Router (23 pages)
│   │   │   │   ├── page.tsx          # Landing/entry
│   │   │   │   ├── create/           # Wallet creation
│   │   │   │   ├── import/           # Wallet import
│   │   │   │   ├── unlock/           # Unlock wallet
│   │   │   │   ├── pay/[recipient]/  # Direct payment link
│   │   │   │   └── wallet/           # Main dashboard
│   │   │   │       ├── page.tsx      # Wallet overview
│   │   │   │       ├── blik/         # BLIK (generate, received)
│   │   │   │       ├── contacts/     # Contacts
│   │   │   │       ├── history/      # Transaction history
│   │   │   │       ├── receive/      # Receive
│   │   │   │       ├── scheduled/    # Scheduled payments
│   │   │   │       ├── send/         # Send flow (+ success)
│   │   │   │       ├── settings/     # Settings (networks, privacy)
│   │   │   │       ├── split/        # Split bill
│   │   │   │       ├── swap/         # Token swap
│   │   │   │       ├── token/[symbol]/ # Token detail
│   │   │   │       └── username/     # Username management
│   │   │   ├── components/           # UI + Chat components
│   │   │   │   ├── chat/            # AI chat (messages, suggestion chips, inline cards)
│   │   │   │   └── ui/              # Shared UI components
│   │   │   ├── contexts/             # React Context state
│   │   │   │   ├── AccountContext.tsx # Wallet, accounts, network
│   │   │   │   └── BalanceContext.tsx # Balances, refresh
│   │   │   ├── lib/                  # Service layer (11 modules)
│   │   │   │   ├── account-storage.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── bridge-service.ts
│   │   │   │   ├── contacts-service.ts
│   │   │   │   ├── markdown.ts
│   │   │   │   ├── multi-network.ts
│   │   │   │   ├── network.ts
│   │   │   │   ├── routing-service.ts
│   │   │   │   ├── send-service.ts
│   │   │   │   ├── session-crypto.ts
│   │   │   │   └── swap.ts
│   │   │   └── hooks/                # Custom hooks
│   │   │       ├── useAiChat.ts
│   │   │       └── useAuthGuard.ts
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── website/                      # Marketing Landing (Next.js 14, Three.js)
│       ├── src/
│       │   ├── app/                  # Pages (home, press-kit, privacy, terms)
│       │   └── components/           # 3D, animations, sections
│       ├── next.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                       # @e-y/shared (zero runtime dependencies)
│   │   ├── src/
│   │   │   ├── api/                 # 4 API clients
│   │   │   │   ├── username-api.ts
│   │   │   │   ├── split-api.ts
│   │   │   │   ├── scheduled-api.ts
│   │   │   │   └── preferences-api.ts
│   │   │   ├── config/              # Network configs
│   │   │   │   ├── multi-network.ts
│   │   │   │   └── networks.ts
│   │   │   ├── constants/           # 6 constant files
│   │   │   │   ├── errors.ts
│   │   │   │   ├── limits.ts
│   │   │   │   ├── erc20.ts
│   │   │   │   ├── swap.ts
│   │   │   │   ├── coingecko.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/            # 11 services
│   │   │   │   ├── balance-service.ts
│   │   │   │   ├── blik-socket.ts
│   │   │   │   ├── ai-socket.ts
│   │   │   │   ├── bridge-service.ts
│   │   │   │   ├── contacts-service.ts
│   │   │   │   ├── price-chart.ts
│   │   │   │   ├── routing-service.ts
│   │   │   │   ├── swap-service.ts
│   │   │   │   ├── transaction-history.ts
│   │   │   │   ├── transaction-socket.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/               # 11 type files
│   │   │   │   ├── ai.ts
│   │   │   │   ├── blik.ts
│   │   │   │   ├── bridge-errors.ts
│   │   │   │   ├── network-balance.ts
│   │   │   │   ├── scheduled.ts
│   │   │   │   ├── split.ts
│   │   │   │   ├── swap.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── wallet.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/               # 9 utility modules
│   │   │   │   ├── account.ts
│   │   │   │   ├── async.ts
│   │   │   │   ├── debounce.ts
│   │   │   │   ├── format.ts
│   │   │   │   ├── send.ts
│   │   │   │   ├── split.ts
│   │   │   │   ├── username.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── crypto/                       # @e-y/crypto
│   │   ├── src/
│   │   │   ├── wallet/              # BIP-39, key derivation
│   │   │   ├── signing/             # Transaction + message signing
│   │   │   ├── encryption/          # Data encryption
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── storage/                      # @e-y/storage
│   │   ├── src/
│   │   │   └── index.ts             # Web Crypto + IndexedDB abstraction
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                           # @e-y/ui
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   ├── Input.tsx
│       │   ├── Loading.tsx
│       │   ├── FadeIn.tsx
│       │   ├── GlitchText.tsx
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── supabase/
│   └── migrations/                   # Database migrations
│
├── .env.example
├── .gitignore
├── .npmrc                            # node-linker=hoisted
├── package.json                      # Root (pnpm@9.1.0, turbo@2.0.0)
├── pnpm-workspace.yaml
├── turbo.json
├── vercel.json
├── railway.json
├── docker-compose.yml
├── tsconfig.base.json                # Shared TS config
└── README.md
```

### Requirements to Structure Mapping

| Feature | Mobile Location | Web Location | API Location | Package |
|---------|-----------------|--------------|--------------|---------|
| Wallet Create/Import | `app/(onboarding)/` | `/create`, `/import` | -- | `@e-y/crypto`, `@e-y/storage` |
| Balances | `app/(tabs)/home.tsx` | `/wallet` | -- | `@e-y/shared` (balance-service) |
| Send to Address | `app/send/` | `/wallet/send` | -- | `@e-y/shared`, `@e-y/crypto` |
| Send to @username | `app/send/` | `/wallet/send` | `username/` | `@e-y/shared` |
| BLIK Codes | `app/blik/` | `/wallet/blik` | `blik/` | `@e-y/shared` (blik-socket) |
| Contacts | `store/slices/contacts` | `/wallet/contacts` | -- | `@e-y/shared` (contacts-service) |
| Split Bill | `app/split/` | `/wallet/split` | `split/` | `@e-y/shared` |
| Scheduled Payments | `app/scheduled/` | `/wallet/scheduled` | `scheduled/` | `@e-y/shared` |
| Token Swap | `app/swap/` | `/wallet/swap` | -- | `@e-y/shared` (swap-service) |
| AI Chat | `app/(tabs)/ai.tsx` | Chat component | `ai/` | `@e-y/shared` (ai-socket) |
| Settings | `app/(tabs)/shard.tsx` | `/wallet/settings` | `preferences/` | `@e-y/shared` |
| Transaction History | `store/slices/transaction` | `/wallet/history` | `transaction/` | `@e-y/shared` (transaction-history) |

### Architectural Boundaries

**Mobile App Layers:**
```
UI (app/) → Hooks (src/hooks/) → Services (src/services/) → Store (store/, 17 slices)
                                       │
                                       ├─▶ @e-y/shared services
                                       ├─▶ API (services/api.ts)
                                       ├─▶ Blockchain (services/blockchain.ts)
                                       └─▶ Storage (expo-secure-store, AsyncStorage)
```

**Web App Layers:**
```
UI (src/app/) → Hooks (src/hooks/) → Services (src/lib/) → Context (src/contexts/)
                                          │
                                          ├─▶ @e-y/shared services
                                          ├─▶ @e-y/storage (IndexedDB + Web Crypto)
                                          ├─▶ @e-y/crypto (wallet ops)
                                          └─▶ ethers.js (blockchain)
```

**Backend Layers:**
```
Controller → Service → SupabaseService → Supabase (PostgreSQL)
     │
     └─▶ Gateway (WebSocket for BLIK, Transactions, Split, Scheduled, AI)
```

**Package Dependencies:**
```
@e-y/shared  ◀── apps/mobile
             ◀── apps/web
             ◀── apps/api

@e-y/crypto  ◀── apps/mobile
             ◀── apps/web

@e-y/storage ◀── apps/web (only)

@e-y/ui      ◀── apps/web
             ◀── apps/website
```

### Integration Points

**Mobile <-> Backend:**
- REST API: `/api/*` endpoints via RTK Query
- WebSocket: `/blik`, `/transactions`, `/split`, `/scheduled`, `/ai` namespaces

**Web App <-> Backend:**
- REST API: `/api/*` endpoints via fetch (src/lib/api.ts)
- WebSocket: `/blik`, `/ai` namespaces via @e-y/shared socket services

**Mobile <-> Blockchain:**
- ethers.js JsonRpcProvider -> Alchemy/Infura RPC
- Direct contract calls for token transfers

**Web App <-> Blockchain:**
- ethers.js BrowserProvider (wallet) + JsonRpcProvider (reads)
- Multi-network support via @e-y/shared config

**Data Flow (Mobile):**
```
User Action -> Component -> Hook -> Service -> Redux Action -> State Update -> UI
                                       │
                                       ├─▶ API Call -> Backend -> Supabase
                                       └─▶ Blockchain Call -> RPC -> Chain
```

**Data Flow (Web App):**
```
User Action -> Component -> Hook -> Service (lib/) -> Context Update -> UI
                                       │
                                       ├─▶ API Call -> Backend -> Supabase
                                       ├─▶ Blockchain Call -> RPC -> Chain
                                       └─▶ Storage -> @e-y/storage -> IndexedDB
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
| NFR-1: Performance | Done | AsyncStorage (mobile), IndexedDB (web), optimistic UI updates |
| NFR-2: Reliability | Done | Error boundaries, retry logic, status tracking |
| NFR-3: Security | Done | expo-secure-store (mobile), Web Crypto (web), biometrics, no server custody |
| NFR-4: Usability | Done | Network abstraction, simplified flows, AI chat for natural language |
| NFR-5: Compatibility | Done | Expo managed workflow (mobile), Next.js (web), iOS 14+/Android 8+ |

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
- [x] Performance considerations addressed (optimistic updates, caching)

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
- SHARD NFC passport verification
- Analytics and monitoring setup
- Mainnet deployment strategy
- Voice interaction (ElevenLabs/Whisper)

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
**Document Location:** `docs/v1.0/architecture.md`

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
- 11 backend modules, 4 apps, 4 shared packages
- 25 functional requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Expo SDK 54+, Next.js 16, TypeScript, Redux Toolkit, React Context, ethers.js v6, NestJS, Supabase, @anthropic-ai/sdk)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries (monorepo: apps + packages)
- Integration patterns and communication standards (REST + WebSocket + RPC)

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing E-Y. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Initialize monorepo structure with Turborepo + pnpm

**Development Sequence (completed):**

1. Initialize monorepo (Turborepo + pnpm + .npmrc with node-linker=hoisted)
2. Create Expo mobile app with Development Build setup
3. Create NestJS backend with WebSocket gateway
4. Set up shared packages (@e-y/shared, @e-y/crypto)
5. Implement core wallet features
6. Implement BLIK code system
7. Add security settings layer
8. Migrate database to Supabase
9. Build AI system (Claude LLM, 8 tools, proactive service)
10. Build Next.js 16 web app (23 pages, full feature parity)
11. Add @e-y/storage and @e-y/ui packages
12. Build marketing website (Next.js 14, Three.js)
13. Add split bill, scheduled payments, token swap, multi-network support

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

**Architecture Status:** IMPLEMENTED AND DEPLOYED

**Current Phase:** Active development -- all core features implemented across mobile, web, and API.

**Document Maintenance:** Update this architecture when major technical decisions are made during development. Last updated: 2026-02-08.

