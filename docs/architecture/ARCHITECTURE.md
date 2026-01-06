# E-Y Crypto Wallet - Brownfield Architecture Document

**Document Version:** 2.0
**Date:** 2025-11-25
**Status:** MVP Stabilization Phase
**Document Type:** Brownfield Architecture (Current State + Enhancement Plan)

---

## Introduction

This document captures the **CURRENT STATE** of the E-Y Crypto Wallet codebase, including implemented features, technical debt, workarounds, and real-world patterns. It serves as the architectural reference for AI agents and engineers working on the MVP stabilization phase outlined in the PRD.

### Document Scope

**Focus Areas (PRD-Driven):**
This documentation focuses on areas relevant to the 7 epics in `docs/prd.md`:
- **Epic 1:** Cross-chain transfer execution (backend + mobile)
- **Epic 2:** Mobile security (biometric/PIN authentication)
- **Epic 3-4:** Transaction history and balance display (mobile UI)
- **Epic 5:** API refinements (backend)
- **Epic 6:** End-to-end workflow integration
- **Epic 7:** Design system foundation

**Out of Scope:**
- Legacy features (split bills, scheduled payments, fiat on-ramp) — implemented but deprioritized
- Detailed database schema documentation (see entity files directly)
- Deployment infrastructure (covered in ops docs)

### Change Log

| Date       | Version | Description                                     | Author   |
|------------|---------|-------------------------------------------------|----------|
| 2025-11-25 | 2.0     | Brownfield analysis for MVP stabilization phase | Winston  |
| 2025-11-24 | 1.0     | Initial brief and PRD created                   | Mary/John|

---

## Quick Reference - Key Files and Entry Points

### Backend (NestJS)

**Critical Files for Understanding:**
- **Main Entry:** `backend/src/main.ts` — Application bootstrap
- **App Module:** `backend/src/app.module.ts` — Root module, imports all feature modules
- **Configuration:** `backend/src/config/configuration.ts`, `backend/.env`
- **Database Config:** `backend/src/config/database.config.ts`

**Core Business Logic (Epic 1 - Cross-Chain):**
- `backend/src/services/Crosschain.service.ts` — Cross-chain routing orchestration
- `backend/src/services/routers/LifiRouter.service.ts` — LiFi aggregator integration
- `backend/src/services/routers/RangoRouter.service.ts` — Rango aggregator integration
- `backend/src/services/routers/SocketRouter.service.ts` — Socket aggregator integration
- `backend/src/modules/crosschain/crosschain.controller.ts` — Cross-chain REST endpoints

**Identity & BLIK (Epic 1):**
- `backend/src/services/IdentityResolver.service.ts` — @nickname resolution, wallet mappings
- `backend/src/services/Blik.service.ts` — BLIK payment code lifecycle
- `backend/src/modules/identity/identity.controller.ts` — Identity REST endpoints
- `backend/src/controllers/blik.controller.ts` — BLIK REST endpoints

**Database Entities:**
- `backend/database/entities/user.entity.ts` — User model (nickname, wallet address)
- `backend/src/entities/UserWallet.entity.ts` — Multi-chain wallet addresses
- `backend/src/entities/TokenPreference.entity.ts` — Token preferences per chain
- `backend/src/entities/PaymentRequest.entity.ts` — BLIK code storage

**Authentication (Epic 2):**
- `backend/src/modules/auth/auth.service.ts` — JWT auth with wallet signatures
- `backend/src/modules/auth/auth.controller.ts` — Login endpoint
- `backend/src/modules/auth/guards/local.guard.ts` — Route protection

**API Documentation:**
- Endpoints documented inline in controllers
- OpenAPI/Swagger generation TODO (Epic 5)

---

### Mobile App (React Native + Expo)

**Critical Files for Understanding:**
- **Main Entry:** `mobile/index.ts` — App registration
- **Navigation:** `mobile/src/navigation/MainNavigator.tsx` — Stack + tab navigation
- **Config:** `mobile/src/config/env.ts` — Environment variables and RPC endpoints

**Screens by Epic:**

**Epic 1 (Cross-Chain):**
- `mobile/src/screens/UnifiedSendScreen.tsx` — Main send interface
- `mobile/src/screens/SendByIdentifierScreen.tsx` — Send by @nickname
- `mobile/src/screens/CrosschainQuoteScreen.tsx` — Quote display (needs enhancement)
- `mobile/src/screens/CreateBlikCodeScreen.tsx` — Generate BLIK code
- `mobile/src/screens/PayBlikCodeScreen.tsx` — Pay via BLIK code
- **TODO:** `CrosschainExecutionScreen.tsx` (Epic 1.4 - status monitoring)

**Epic 2 (Security):**
- `mobile/src/screens/BiometricAuthScreen.tsx` — Biometric setup/auth
- `mobile/src/screens/PinAuthScreen.tsx` — PIN entry/setup
- `mobile/src/screens/SecuritySettingsScreen.tsx` — Security preferences
- `mobile/src/screens/CreateWalletScreen.tsx` — HD wallet generation
- `mobile/src/screens/ImportWalletScreen.tsx` — Seed phrase import

**Epic 3 (Transaction History):**
- `mobile/src/screens/wallet/TransactionHistoryScreen.tsx` — Transaction list (needs enhancement)
- `mobile/src/screens/TransactionDetailsScreen.tsx` — Individual transaction view

**Epic 4 (Balance Display):**
- `mobile/src/screens/HomeScreen.tsx` — Main balance display (needs aggregation)
- `mobile/src/screens/wallet/ManageAccountsScreen.tsx` — Multi-wallet management
- `mobile/src/screens/wallet/ManageTokensScreen.tsx` — Token visibility settings

**Services by Epic:**

**Epic 1 (Cross-Chain):**
- `mobile/src/services/api/crosschainService.ts` — Cross-chain API client
- `mobile/src/services/api/blikService.ts` — BLIK API client
- `mobile/src/services/api/identityService.ts` — Identity API client
- `mobile/src/services/blockchain/transactionService.ts` — Transaction signing/broadcasting
- `mobile/src/services/blockchain/gasEstimatorService.ts` — Gas estimation

**Epic 2 (Security):**
- `mobile/src/services/biometricService.ts` — Biometric authentication
- `mobile/src/services/pinService.ts` — PIN storage/verification
- `mobile/src/services/walletService.ts` — HD wallet and key management
- `mobile/src/services/cryptoService.ts` — Encryption utilities

**Epic 3-4 (Transaction History & Balance):**
- `mobile/src/services/blockchain/transactionHistoryService.ts` — Fetch transaction history
- `mobile/src/services/blockchain/balanceService.ts` — Multi-chain balance fetching
- `mobile/src/services/priceService.ts` — Fiat price feeds
- `mobile/src/services/blockchain/tokenService.ts` — ERC-20 interactions

**Epic 5 (API Integration):**
- `mobile/src/services/authService.ts` — Backend authentication
- `mobile/src/services/networkLogger.ts` — HTTP request logging

---

## Enhancement Impact Areas (PRD-Driven)

Based on the PRD epics, these are the areas requiring modification or completion:

### Epic 1: Cross-Chain Stabilization
**Files Requiring Changes:**
- ✅ **Backend:**
  - `Crosschain.service.ts` — Add `executeTransaction()` method
  - `LifiRouter.service.ts`, `RangoRouter.service.ts`, `SocketRouter.service.ts` — Complete execution logic
  - `Blik.service.ts` — Integrate cross-chain execution
  - `crosschain.controller.ts` — Add `/execute` endpoint
  - `webhooks.controller.ts` — Add webhook handlers for aggregators
- ✅ **Mobile:**
  - `api/crosschainService.ts` — Add `executeTransaction()` API call
  - **NEW FILE:** `CrosschainExecutionScreen.tsx` — Status monitoring UI
  - `UnifiedSendScreen.tsx` — Integrate cross-chain flow

**New Database Columns:**
- `payment_requests.crosschain_execution_id` (VARCHAR) — Track cross-chain execution
- `payment_requests.bridge_provider` (VARCHAR) — Which aggregator used

---

### Epic 2: Mobile Security
**Files Requiring Changes:**
- ✅ **Mobile:**
  - `biometricService.ts` — Enhance with re-authentication tracking
  - `pinService.ts` — Add lockout mechanism
  - `BiometricAuthScreen.tsx`, `PinAuthScreen.tsx` — UX polish
  - `SecuritySettingsScreen.tsx` — Add new settings toggles
  - `walletService.ts` — Integrate auth checks before key access
  - **App-wide:** Add auth prompts to transaction confirmation, seed phrase export

**New AsyncStorage Keys:**
- `lastAuthenticatedAt` (timestamp) — Grace period tracking
- `failedPinAttempts` (number) — Lockout tracking
- `lockoutUntil` (timestamp) — Lockout expiry

---

### Epic 3-4: Transaction History & Balance UI
**Files Requiring Changes:**
- ✅ **Mobile:**
  - `TransactionHistoryScreen.tsx` — Add filtering, search, pagination
  - `TransactionDetailsScreen.tsx` — Enhance with cross-chain details
  - `HomeScreen.tsx` — Implement balance aggregation logic
  - `balanceService.ts` — Optimize multi-chain fetching
  - `transactionHistoryService.ts` — Add caching, parallel fetching

**New Features:**
- Transaction filtering chips UI component
- Search bar with debounce
- Skeleton loading states
- Pull-to-refresh refresh logic

---

### Epic 5: API Refinements
**Files Requiring Changes:**
- ✅ **Backend:**
  - All controllers — Standardize error response format
  - **NEW FILE:** `dto/ErrorResponse.dto.ts` — Standard error shape
  - **NEW FILE:** `dto/PaginatedResponse.dto.ts` — Pagination wrapper
  - Add pagination to relevant endpoints (transactions, wallets)
  - Add filtering query params
  - Implement rate limiting middleware

**New Endpoints:**
- `POST /api/transactions/search` — Search transactions
- `GET /api/transactions?page=1&limit=20&chainId=polygon` — Paginated list

---

### Epic 6: E2E Workflow Testing
**Files Requiring Changes:**
- ✅ **Testing:**
  - **NEW FILES:** Detox E2E test suites for critical paths
  - `backend/test/e2e/` — Backend integration tests
  - `mobile/__tests__/` — Expand test coverage

---

### Epic 7: Design System Foundation
**Files for Audit:**
- All `mobile/src/screens/*.tsx` files — Review for inconsistencies
- **NEW FILE:** `mobile/src/design/DesignAudit.md` — Document findings
- **NEW FILE:** `mobile/src/design/StyleGuide.md` — Define standards

---

## High Level Architecture

### Technical Summary

**E-Y** is a full-stack self-custody cryptocurrency wallet with a **NestJS backend** providing identity resolution, BLIK payment codes, and cross-chain routing orchestration, and a **React Native mobile app** (via Expo) handling wallet management, transaction signing, and user interface.

**Architecture Pattern:** Modular monolith (backend), feature-based organization (mobile)

**Key Design Decisions:**
1. **Backend as orchestrator, mobile as signer:** Backend never touches private keys. Mobile signs transactions locally, backend prepares and monitors.
2. **Multi-aggregator strategy:** Three cross-chain aggregators (LiFi, Rango, Socket) for redundancy and route optimization.
3. **Global identity abstraction:** Users identified by @nickname or EY-ID, mapped to multiple wallet addresses via backend.
4. **Temporary payment codes (BLIK):** Inspired by Poland's BLIK system, 6-digit codes for receiving payments without exposing addresses.

---

### Actual Tech Stack

#### Backend

| Category            | Technology       | Version | Notes                                      |
|---------------------|------------------|---------|-------------------------------------------|
| Runtime             | Node.js          | 18+     | LTS version required                      |
| Framework           | NestJS           | 11.x    | TypeScript, modular architecture          |
| Language            | TypeScript       | 5.9.x   | Strict mode enabled                       |
| Database            | PostgreSQL       | 16      | Primary data store                        |
| ORM                 | TypeORM          | 0.3.27  | Entity-based, migration support           |
| Authentication      | Passport + JWT   | Latest  | EIP-191 wallet signature auth             |
| Queue System        | BullMQ + Redis   | Latest  | Async jobs (webhook processing, cron)     |
| HTTP Client         | Axios            | 1.12.x  | For aggregator API calls                  |
| Validation          | class-validator  | 0.14.x  | DTO validation                            |
| Testing             | Jest             | 30.x    | Unit + integration tests                  |
| Monitoring          | prom-client      | 15.x    | Prometheus metrics                        |
| Rate Limiting       | @nestjs/throttler| 6.4.x   | API rate limiting                         |

#### Mobile

| Category            | Technology            | Version | Notes                                      |
|---------------------|-----------------------|---------|-------------------------------------------|
| Framework           | React Native          | 0.81.5  | Via Expo managed workflow                 |
| SDK                 | Expo                  | 54.0.x  | Managed workflow for OTA updates          |
| Language            | TypeScript            | 5.9.x   | Strict mode                               |
| Navigation          | React Navigation      | 7.x     | Stack + bottom tabs                       |
| State Management    | Zustand               | 5.0.x   | Lightweight global state                  |
| Local Storage       | AsyncStorage          | 2.2.x   | Persistence                               |
| Secure Storage      | expo-secure-store     | 15.0.x  | Encrypted key storage                     |
| Biometrics          | expo-local-authentication | 17.0.x | Face ID, Touch ID, Fingerprint         |
| Blockchain          | ethers.js             | 5.7.x   | Transaction signing, wallet generation    |
| HTTP Client         | fetch (native)        | -       | API calls to backend                      |
| Animations          | react-native-reanimated | 4.1.x | Smooth UI animations                     |
| QR Codes            | react-native-qrcode-svg | 6.3.x | BLIK code/link generation                |
| Testing             | Jest + Detox (TODO)   | Latest  | Unit tests exist, E2E tests TODO         |

#### Infrastructure & External Services

| Service             | Purpose                     | Provider         | Notes                        |
|---------------------|-----------------------------|------------------|------------------------------|
| RPC Provider        | Blockchain data             | Alchemy          | Multi-chain support          |
| Cross-Chain         | Route aggregation           | LiFi/Rango/Socket| Three aggregators for redundancy |
| Price Feed          | Fiat conversion             | CoinGecko        | Free tier                    |
| Push Notifications  | Mobile notifications        | Expo Push        | Built into Expo              |
| Error Tracking      | Crash reporting (TODO)      | Sentry           | Planned                      |
| Analytics (TODO)    | User behavior tracking      | PostHog          | Planned                      |
| Hosting (Backend)   | API deployment              | Render/Railway   | TBD based on budget          |
| Database (Prod)     | Managed PostgreSQL          | Render/Supabase  | TBD                          |

---

### Repository Structure

```
E-Y/
├── backend/                  # NestJS API server
│   ├── src/
│   │   ├── main.ts          # Entry point
│   │   ├── app.module.ts    # Root module
│   │   ├── config/          # Configuration (env, database)
│   │   ├── modules/         # Feature modules (auth, identity, blik, crosschain, etc.)
│   │   ├── services/        # Core business logic (Crosschain, Blik, IdentityResolver, routers)
│   │   ├── entities/        # TypeORM entities (UserWallet, TokenPreference, PaymentRequest)
│   │   ├── dto/             # Data Transfer Objects (request/response shapes)
│   │   ├── controllers/     # Additional controllers (payments, blik, crosschain)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── middleware/      # Custom middleware (logging, error handling)
│   │   ├── monitoring/      # Prometheus metrics
│   │   └── health/          # Health check endpoints
│   ├── database/
│   │   ├── entities/        # Additional entities (user, payment, shard)
│   │   ├── migrations/      # TypeORM migrations
│   │   └── data-source.ts   # TypeORM configuration
│   ├── test/                # Integration tests
│   ├── .env.example         # Environment variable template
│   └── package.json
│
├── mobile/                   # React Native + Expo mobile app
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── navigation/      # React Navigation setup
│   │   ├── screens/         # 40+ screens organized by feature
│   │   │   ├── wallet/      # Wallet management screens
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── UnifiedSendScreen.tsx
│   │   │   ├── CreateBlikCodeScreen.tsx
│   │   │   └── ... (see Quick Reference above)
│   │   ├── services/        # Service layer (API clients, blockchain, auth, security)
│   │   │   ├── api/         # Backend API clients (crosschain, blik, identity)
│   │   │   ├── blockchain/  # Blockchain services (transaction, balance, gas, history)
│   │   │   ├── walletService.ts
│   │   │   ├── biometricService.ts
│   │   │   ├── pinService.ts
│   │   │   └── ... (see Quick Reference above)
│   │   ├── components/      # Reusable UI components
│   │   │   └── common/      # Common components (Button, Card, Input, etc.)
│   │   ├── config/          # Environment and network configuration
│   │   ├── features/        # Feature-specific components (send, receive, shards)
│   │   └── utils/           # Utility functions
│   ├── __tests__/           # Unit tests (Jest)
│   ├── .env.example         # Environment variable template
│   └── package.json
│
├── shared/                   # Shared types and constants (future)
├── docs/                     # Documentation
│   ├── brief.md             # Strategic product brief (Mary)
│   ├── prd.md               # Main PRD (John)
│   ├── prd/                 # Sharded epic files
│   ├── architecture.md      # This file (Winston)
│   └── architecture/        # Additional architecture docs (TBD)
│
├── .bmad-core/              # BMAD agent configuration
├── .windsurf/               # Windsurf IDE config
└── package.json             # Root workspace config
```

**Repository Type:** Monorepo (npm workspaces)
**Package Manager:** npm
**Version Control:** Git

---

## Source Tree and Module Organization

### Backend Module Organization

**NestJS Module Structure:**

```
backend/src/
├── app.module.ts                    # Root module, imports all feature modules
├── main.ts                          # Bootstrap, sets up CORS, validation pipes, Swagger
│
├── modules/                         # Feature modules (NestJS pattern)
│   ├── auth/                        # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts          # JWT issuance, wallet signature verification
│   │   ├── auth.controller.ts       # POST /api/auth/login
│   │   └── guards/                  # Route guards (JwtAuthGuard)
│   │
│   ├── identity/                    # Global identity management
│   │   ├── identity.module.ts
│   │   ├── identity.service.ts      # Profile CRUD, wallet CRUD, token preferences
│   │   └── identity.controller.ts   # REST endpoints for identity
│   │
│   ├── blik/                        # BLIK payment codes (NEW as of Nov 2025)
│   │   ├── blik.module.ts
│   │   ├── blik.service.ts          # Code generation, quote, execution (partial)
│   │   └── blik.controller.ts       # POST /api/blik/create, /execute, etc.
│   │
│   ├── crosschain/                  # Cross-chain routing (NEW as of Nov 2025)
│   │   ├── crosschain.module.ts
│   │   ├── crosschain.service.ts    # Orchestrates aggregators (partial)
│   │   └── crosschain.controller.ts # POST /api/crosschain/quote, /prepare
│   │
│   ├── payments/                    # Same-chain payments
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts      # Send by identifier (same-chain only)
│   │   └── payments.controller.ts   # POST /api/payments/send-by-identifier
│   │
│   ├── shard/                       # Gamification (shard points)
│   │   ├── shard.module.ts
│   │   ├── shard.service.ts         # Shard balance, transactions
│   │   ├── shard-integration.service.ts  # Integration with actions
│   │   └── shard-actions.controller.ts   # POST /api/shards/actions
│   │
│   ├── user/                        # User management
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   └── user.controller.ts
│   │
│   ├── webhooks/                    # Webhook handlers
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.service.ts
│   │   └── webhooks.controller.ts   # POST /api/webhooks/lifi, /rango, /socket
│   │
│   ├── split-bill/                  # Split bills (LEGACY, out of MVP scope)
│   ├── scheduled-payment/           # Scheduled payments (LEGACY, out of MVP scope)
│   └── ... (other modules)
│
├── services/                        # Core business logic services (not NestJS modules)
│   ├── IdentityResolver.service.ts  # Resolve @nickname, EY-ID to wallet addresses
│   ├── Payment.service.ts           # Same-chain payment execution
│   ├── Blik.service.ts              # BLIK lifecycle (code gen, quote, execute)
│   ├── Crosschain.service.ts        # Cross-chain orchestration
│   └── routers/                     # Aggregator-specific implementations
│       ├── LifiRouter.service.ts    # LiFi integration (INCOMPLETE: execution TODO)
│       ├── RangoRouter.service.ts   # Rango integration (INCOMPLETE: execution TODO)
│       └── SocketRouter.service.ts  # Socket integration (INCOMPLETE: execution TODO)
│
├── controllers/                     # Standalone controllers (not in modules)
│   ├── payments.controller.ts       # Payment endpoints
│   ├── blik.controller.ts           # BLIK endpoints
│   └── crosschain.controller.ts     # Cross-chain endpoints
│
├── entities/                        # TypeORM entities (NEW entities, not in database/entities)
│   ├── UserWallet.entity.ts         # Multi-chain wallet addresses per user
│   ├── TokenPreference.entity.ts    # User token preferences (e.g., "I accept USDC on Polygon")
│   └── PaymentRequest.entity.ts     # BLIK code storage
│
├── dto/                             # Data Transfer Objects
│   ├── blik.types.ts                # BLIK-related DTOs
│   ├── resolver.types.ts            # Identity resolver types
│   └── ... (other DTOs)
│
├── config/                          # Configuration
│   ├── configuration.ts             # Environment variable schema (Joi)
│   └── database.config.ts           # TypeORM configuration
│
├── monitoring/                      # Metrics and monitoring
│   ├── metrics.module.ts
│   ├── metrics.service.ts           # Prometheus metrics
│   └── metrics.controller.ts        # GET /metrics
│
└── health/                          # Health checks
    ├── health.module.ts
    └── health.controller.ts         # GET /health
```

**Key Architectural Patterns:**

1. **Module-per-Feature:** Each major feature (auth, identity, blik, crosschain) is a NestJS module.
2. **Service Layer Separation:** Business logic in `services/` directory for reusability across modules.
3. **DTO Validation:** All controller endpoints use class-validator DTOs for request validation.
4. **Guard-Based Auth:** `JwtAuthGuard` decorator protects authenticated routes.

**Technical Debt & Inconsistencies:**

⚠️ **Inconsistent Service Location:** Some services in `modules/*/` (NestJS pattern), others in `services/` (standalone). This happened organically as project grew.

⚠️ **Partial Cross-Chain Implementation:** `Crosschain.service.ts` and router services have `prepareTransaction()` but not `executeTransaction()`. This is **CRITICAL** blocker for Epic 1.

⚠️ **BLIK Cross-Chain TODO:** `Blik.service.ts` has TODO comment for cross-chain execution. Currently only handles same-chain BLIK payments.

---

### Mobile App Organization

**React Native Feature-Based Structure:**

```
mobile/src/
├── navigation/                      # Navigation setup
│   └── MainNavigator.tsx            # Stack + bottom tab navigation
│
├── screens/                         # All screens (40+)
│   ├── HomeScreen.tsx               # Main balance display, quick actions
│   ├── UnifiedSendScreen.tsx        # Main send interface
│   ├── UnifiedReceiveScreen.tsx     # Main receive interface
│   ├── SendByIdentifierScreen.tsx   # Send by @nickname
│   ├── CrosschainQuoteScreen.tsx    # Quote display (needs enhancement)
│   ├── CreateBlikCodeScreen.tsx     # Generate BLIK code
│   ├── PayBlikCodeScreen.tsx        # Pay via BLIK code
│   ├── BiometricAuthScreen.tsx      # Biometric setup/auth
│   ├── PinAuthScreen.tsx            # PIN entry/setup
│   ├── SecuritySettingsScreen.tsx   # Security preferences
│   ├── CreateWalletScreen.tsx       # HD wallet generation
│   ├── ImportWalletScreen.tsx       # Seed phrase import
│   ├── TransactionDetailsScreen.tsx # Individual transaction view
│   ├── wallet/                      # Wallet management screens
│   │   ├── TransactionHistoryScreen.tsx  # Transaction list (needs enhancement)
│   │   ├── ManageAccountsScreen.tsx      # Multi-wallet management
│   │   └── ManageTokensScreen.tsx        # Token visibility settings
│   └── ... (30+ other screens, see Quick Reference)
│
├── services/                        # Service layer
│   ├── api/                         # Backend API clients
│   │   ├── crosschainService.ts     # Cross-chain API client (needs `executeTransaction`)
│   │   ├── blikService.ts           # BLIK API client
│   │   └── identityService.ts       # Identity API client
│   │
│   ├── blockchain/                  # Blockchain interaction services
│   │   ├── transactionService.ts    # Transaction signing, broadcasting
│   │   ├── balanceService.ts        # Multi-chain balance fetching (needs optimization)
│   │   ├── tokenService.ts          # ERC-20 interactions
│   │   ├── gasEstimatorService.ts   # Gas price estimation
│   │   ├── nonceManagerService.ts   # Nonce management
│   │   ├── transactionHistoryService.ts  # Transaction history (needs caching)
│   │   └── etherscanService.ts      # Block explorer integration
│   │
│   ├── walletService.ts             # HD wallet generation, key management
│   ├── biometricService.ts          # Biometric authentication (needs enhancement)
│   ├── pinService.ts                # PIN storage/verification (needs lockout logic)
│   ├── authService.ts               # Backend authentication
│   ├── cryptoService.ts             # Encryption utilities
│   ├── priceService.ts              # Fiat price feeds
│   ├── shardsService.ts             # Shard tracking
│   ├── networkLogger.ts             # HTTP request logging
│   └── ... (20+ other services)
│
├── components/                      # Reusable UI components
│   └── common/                      # Common components
│       ├── ShardBadge.tsx           # Shard display component
│       ├── KeyboardAwareScreen.tsx  # Keyboard-aware wrapper
│       └── ... (need audit for Epic 7)
│
├── features/                        # Feature-specific components
│   ├── send/                        # Send flow components
│   │   ├── SendByBlikMode.tsx
│   │   ├── SendByIdentifierMode.tsx
│   │   └── SendByWalletMode.tsx
│   ├── receive/                     # Receive flow components
│   ├── shards/                      # Shard system components
│   │   └── ShardAnimationProvider.tsx
│   └── schedule/                    # Scheduled payments (LEGACY)
│
├── config/                          # Configuration
│   └── env.ts                       # Environment variables, RPC endpoints
│
└── utils/                           # Utility functions
```

**Key Architectural Patterns:**

1. **Feature-Based Organization:** Screens organized by feature area (wallet, security, payments).
2. **Service Layer Pattern:** Business logic extracted into services (similar to backend).
3. **API Client Separation:** Backend integration in `services/api/` directory.
4. **Blockchain Abstraction:** All blockchain interactions via `services/blockchain/`.

**Technical Debt & Inconsistencies:**

⚠️ **No Unified Design System:** UI components built ad-hoc, inconsistent button styles, colors, spacing. **Epic 7 will audit this.**

⚠️ **Cross-Chain Execution Incomplete:** `api/crosschainService.ts` has quote fetching but no `executeTransaction()` method. **Epic 1 blocker.**

⚠️ **Transaction History Performance:** `transactionHistoryService.ts` fetches from chains serially, no caching. **Epic 3 optimization.**

⚠️ **Balance Aggregation Bugs:** Race conditions when fetching balances, stale data. **Epic 4 fix.**

⚠️ **Security Not Consistently Enforced:** Biometric/PIN setup exists but not required on all sensitive actions. **Epic 2 hardening.**

---

## Technical Debt and Known Issues

### Critical Technical Debt (Blocking MVP)

#### 1. Cross-Chain Execution Incomplete ⚠️ CRITICAL
**Location:** `backend/src/services/Crosschain.service.ts`, router services, `mobile/src/services/api/crosschainService.ts`

**Problem:**
- Backend services have `prepareTransaction()` but not `executeTransaction()`.
- Mobile app can fetch quotes but cannot execute cross-chain transactions.
- BLIK cross-chain payment has TODO comment, not functional.

**Impact:** Users cannot complete cross-chain transfers. Core MVP value proposition blocked.

**Epic:** Epic 1 (Stories 1.1-1.5)

**Workaround:** None. This must be implemented.

---

#### 2. No End-to-End Testing ⚠️ HIGH
**Location:** Entire codebase

**Problem:**
- Cross-chain flows never tested with real funds on testnets.
- No automated E2E tests (Detox planned but not implemented).
- Manual testing only, coverage gaps.

**Impact:** High risk of production bugs, low confidence in cross-chain flows.

**Epic:** Epic 6

**Workaround:** Extensive manual testing planned for Epic 1 completion.

---

#### 3. Security Enforcement Gaps ⚠️ HIGH
**Location:** `mobile/src/services/biometricService.ts`, various screens

**Problem:**
- Biometric/PIN required on setup but not consistently enforced.
- Transactions can be sent after initial app authentication (no re-auth).
- Seed phrase can be viewed without re-authentication (if implemented).

**Impact:** Security vulnerability if device left unlocked or stolen.

**Epic:** Epic 2 (Stories 2.1-2.5)

**Workaround:** Educate users to lock devices. Not sufficient for production.

---

### High Priority Technical Debt

#### 4. Transaction History Performance ⚠️ MEDIUM
**Location:** `mobile/src/services/blockchain/transactionHistoryService.ts`

**Problem:**
- Fetches transactions from multiple chains serially (slow).
- No caching (re-fetches on every screen open).
- No pagination (loads all transactions, can be 100+).

**Impact:** Slow UI, excessive RPC calls, poor UX.

**Epic:** Epic 3 (Story 3.7)

**Workaround:** Users tolerate slow loading. Not acceptable for production.

---

#### 5. Balance Aggregation Bugs ⚠️ MEDIUM
**Location:** `mobile/src/services/blockchain/balanceService.ts`, `HomeScreen.tsx`

**Problem:**
- Race conditions when fetching balances from multiple chains.
- Stale data displayed (no auto-refresh).
- No loading states (blank screen while fetching).

**Impact:** Users see incorrect balances, loss of trust.

**Epic:** Epic 4 (Stories 4.1-4.4)

**Workaround:** Manual refresh via pull-to-refresh. Poor UX.

---

#### 6. API Error Handling Inconsistent ⚠️ MEDIUM
**Location:** All backend controllers, mobile API clients

**Problem:**
- Backend errors not properly mapped to user-friendly messages.
- Inconsistent error response shapes (some return `{ error }`, others `{ message }`).
- Mobile shows raw error messages ("INSUFFICIENT_FUNDS" instead of "You don't have enough USDC").

**Impact:** Poor UX, users confused by technical errors.

**Epic:** Epic 5 (Story 5.3)

**Workaround:** Support team explains errors manually. Not scalable.

---

#### 7. Gas Estimation Failures ⚠️ MEDIUM
**Location:** `mobile/src/services/blockchain/gasEstimatorService.ts`

**Problem:**
- Gas estimation sometimes fails (Alchemy/ethers.js issues).
- No fallback logic (transaction blocked if estimation fails).
- No user guidance on gas price spikes.

**Impact:** Users blocked from sending, frustration.

**Epic:** Epic 1 (Story 1.8)

**Workaround:** Retry transaction, sometimes works. Unreliable.

---

### Medium Priority Technical Debt

#### 8. UI/UX Inconsistency
**Location:** Entire mobile app

**Problem:**
- No unified design system.
- Button styles, colors, spacing vary across screens.
- Some screens use custom components, others use inline styles.

**Impact:** Unprofessional appearance, harder to maintain.

**Epic:** Epic 7 (Stories 7.1-7.3)

**Workaround:** Functional but ugly. Design phase will address post-MVP.

---

#### 9. Loading States Missing
**Location:** Many mobile screens

**Problem:**
- Many screens lack proper loading/skeleton states.
- Users see blank screens while data fetches.
- No "retry" buttons on errors.

**Impact:** Poor UX, users think app crashed.

**Epic:** Epic 3 (Story 3.6), Epic 4

**Workaround:** Users wait. Not ideal.

---

#### 10. Offline Mode Crashes
**Location:** Mobile app, various services

**Problem:**
- App crashes or shows errors when network unavailable.
- No offline mode (cached data not displayed).

**Impact:** App unusable without internet.

**Epic:** Not prioritized (post-MVP)

**Workaround:** Users must have internet. Acceptable for MVP.

---

#### 11. Deep Linking Not Tested
**Location:** `mobile/src/navigation/MainNavigator.tsx`, BLIK flows

**Problem:**
- BLIK payment links (e.g., `ey://blik/ABC123`) not fully tested.
- Deep linking might not work on all platforms (iOS vs. Android).

**Impact:** BLIK link sharing might fail.

**Epic:** Epic 1 (Story 1.4), Epic 6

**Workaround:** Fallback to code entry. Less convenient.

---

### Workarounds and Gotchas

**Environment Variables:**
- Backend `.env` must have all variables from `.env.example` or app crashes on startup. No graceful degradation.

**Database Connection Pooling:**
- TypeORM connection pool hardcoded to `max: 10`. Changing breaks app (historical reason, unknown why).

**Alchemy RPC Rate Limiting:**
- Alchemy free tier has 300M compute units/month. No rate limit handling in code. If exceeded, all RPC calls fail.

**Mobile AsyncStorage:**
- AsyncStorage has no size limit checks. Large transaction history (1000+ entries) could fill storage.

**Seed Phrase Storage:**
- Seed phrase stored in `expo-secure-store` (encrypted by OS). If OS secure storage fails (rare), wallet unrecoverable.

---

## Integration Points and External Dependencies

### External Services

| Service        | Purpose               | Integration Type | Key Files                                  | Status       | Notes                                      |
|----------------|-----------------------|------------------|--------------------------------------------|--------------|-------------------------------------------|
| **Alchemy**    | Blockchain RPC        | REST API         | `mobile/src/config/env.ts`                 | ✅ Functional | Multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Base) |
| **LiFi**       | Cross-chain routing   | REST API         | `backend/src/services/routers/LifiRouter.service.ts` | ⚠️ Partial   | Quote fetching works, execution incomplete |
| **Rango**      | Cross-chain routing   | REST API         | `backend/src/services/routers/RangoRouter.service.ts` | ⚠️ Partial   | Quote fetching works, execution incomplete |
| **Socket**     | Cross-chain routing   | REST API         | `backend/src/services/routers/SocketRouter.service.ts` | ⚠️ Partial   | Quote fetching works, execution incomplete |
| **CoinGecko**  | Fiat price feeds      | REST API         | `mobile/src/services/priceService.ts`      | ✅ Functional | Free tier, 5-minute cache                 |
| **Expo Push**  | Push notifications    | Expo SDK         | `backend/src/services/push-notification.service.ts` | ✅ Functional | Built into Expo                           |
| **Sentry**     | Error tracking (TODO) | SDK              | TBD                                        | ❌ Planned   | Epic 5                                     |
| **PostHog**    | Analytics (TODO)      | SDK              | TBD                                        | ❌ Planned   | Epic 5                                     |

---

### Internal Integration Points

#### Backend ↔ Mobile Communication

**Authentication Flow:**
1. Mobile generates wallet (HD wallet, ethers.js)
2. Mobile signs authentication message with private key (EIP-191)
3. Mobile sends signature to `POST /api/auth/login`
4. Backend verifies signature, issues JWT token
5. Mobile stores JWT in AsyncStorage
6. Mobile includes JWT in `Authorization: Bearer <token>` header for all subsequent requests

**Transaction Flow (Same-Chain):**
1. Mobile user initiates send via `UnifiedSendScreen`
2. Mobile resolves recipient via `POST /api/identity/resolve/:identifier`
3. Mobile signs transaction locally with ethers.js
4. Mobile broadcasts transaction directly to blockchain (via Alchemy RPC)
5. Mobile logs transaction via `POST /api/payments/send-by-identifier` (optional, for history)

**Transaction Flow (Cross-Chain - Epic 1):**
1. Mobile user initiates cross-chain send
2. Mobile fetches quote via `POST /api/crosschain/quote`
3. Mobile displays quote to user
4. User confirms
5. **TODO:** Mobile calls `POST /api/crosschain/execute` with signed transaction
6. Backend monitors transaction status, updates mobile via polling or webhook
7. Mobile displays status updates on `CrosschainExecutionScreen`

**BLIK Flow:**
1. Recipient generates BLIK code via `POST /api/blik/create`
2. Recipient shares code (clipboard, SMS, QR)
3. Sender enters code via `PayBlikCodeScreen`
4. Mobile fetches quote via `POST /api/blik/:code/quote`
5. User confirms
6. Mobile calls `POST /api/blik/:code/execute`
7. Backend resolves recipient, executes transaction (same-chain or cross-chain)

---

#### Database Schema Overview

**Key Tables (PostgreSQL):**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(64) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE,
  encrypted_device_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_wallet_address ON users(wallet_address);
CREATE INDEX idx_user_nickname ON users(nickname);

-- User wallets (multi-chain addresses)
CREATE TABLE user_wallets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chain_id VARCHAR(20) NOT NULL,  -- e.g., 'ethereum', 'polygon', 'arbitrum'
  address VARCHAR(42) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  label VARCHAR(50),
  added_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_chain_id ON user_wallets(chain_id);

-- Token preferences (e.g., "I accept USDC on Polygon")
CREATE TABLE token_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_symbol VARCHAR(10) NOT NULL,  -- e.g., 'USDC', 'USDT', 'ETH'
  preferred_chain_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_token_prefs_user_id ON token_preferences(user_id);

-- Payment requests (BLIK codes)
CREATE TABLE payment_requests (
  id SERIAL PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,  -- 6-digit alphanumeric
  to_user_id UUID REFERENCES users(id) NOT NULL,
  from_user_id UUID REFERENCES users(id),  -- Set when claimed
  amount VARCHAR(50) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  preferred_chain_id VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, COMPLETED, EXPIRED, CANCELLED
  expires_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  tx_hash VARCHAR(66),
  actual_chain_id VARCHAR(20),
  crosschain_execution_id VARCHAR(100),  -- NEW: Epic 1.5 (migration needed)
  bridge_provider VARCHAR(20),           -- NEW: Epic 1.5 (migration needed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payment_requests_code ON payment_requests(code);
CREATE INDEX idx_payment_requests_to_user ON payment_requests(to_user_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);

-- Shard transactions (gamification)
CREATE TABLE shard_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,  -- e.g., 'FIRST_TRANSACTION', 'BLIK_USE', 'MULTI_CHAIN'
  amount INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User shard state (cumulative balances)
CREATE TABLE user_shard_state (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  total_shards INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Schema Notes:**
- UUIDs for user IDs (better for distributed systems).
- Indexes on foreign keys and frequently queried fields.
- `payment_requests` table will need migration for Epic 1.5 (`crosschain_execution_id`, `bridge_provider`).
- Shard tables exist but anti-abuse logic not fully implemented (Epic 6+).

---

## Development and Deployment

### Local Development Setup

**Backend:**

```bash
# Prerequisites
# - Node.js 18+
# - PostgreSQL 16 running locally
# - Redis running locally (for BullMQ)

cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your PostgreSQL connection string, JWT secret, Alchemy API key

# Run database migrations
npm run migration:run

# Start development server (hot reload)
npm run start:dev

# API will be available at http://localhost:3000
# Health check: GET http://localhost:3000/health
# Swagger docs (TODO): GET http://localhost:3000/api-docs
```

**Mobile:**

```bash
# Prerequisites
# - Node.js 18+
# - Expo CLI (npm install -g expo-cli)
# - iOS Simulator (Xcode on macOS) or Android Emulator

cd mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with backend URL (http://localhost:3000) and Alchemy API keys

# Start Expo dev server
npm start

# Press 'i' for iOS simulator or 'a' for Android emulator
# App will reload on code changes (Fast Refresh)
```

**Known Setup Issues:**
- If PostgreSQL connection fails, check `backend/.env` has correct `DATABASE_URL`.
- If Expo fails to start, clear cache: `npx expo start --clear`.
- On M1/M2 Macs, may need to install Rosetta for iOS Simulator.

---

### Build and Deployment Process

**Backend:**

```bash
# Production build
cd backend
npm run build

# Builds to backend/dist/ directory

# Start production server
npm run start:prod

# Environment variables must be set on hosting platform (Render, Railway, etc.)
```

**Mobile:**

```bash
# Development build (includes dev tools)
cd mobile
npm run build:dev

# Beta build (TestFlight / Google Play internal testing)
npm run build:beta

# Production build (App Store / Google Play)
npm run build:prod

# Builds managed by Expo Application Services (EAS)
# Requires Expo account and eas.json configuration
```

**Deployment Environments:**
- **Development:** Local (backend: localhost:3000, mobile: Expo Go)
- **Staging:** TBD (backend: Render/Railway, mobile: TestFlight/Internal Testing)
- **Production:** TBD (backend: Render/Railway, mobile: App Store/Google Play)

**CI/CD:** GitHub Actions planned (Epic 5) — run tests on push, deploy on merge to `main`.

---

### Testing Reality

**Backend:**
- **Unit Tests:** Exist for some services (`IdentityResolver.service.spec.ts`, etc.)
- **Coverage:** Estimated 30-40% (needs improvement)
- **Integration Tests:** Minimal (planned for Epic 6)
- **E2E Tests:** None

**Mobile:**
- **Unit Tests:** Exist for some services (Jest tests in `__tests__/`)
- **Coverage:** Estimated 20-30% (needs improvement)
- **Component Tests:** None (React Native Testing Library planned)
- **E2E Tests:** None (Detox planned for Epic 6)

**Running Tests:**

```bash
# Backend unit tests
cd backend
npm test

# Mobile unit tests
cd mobile
npm test

# Testnet integration tests (manual)
cd mobile
npm run test:sepolia      # Run all Sepolia testnet tests
npm run test:sepolia:eth  # Test ETH sends
npm run test:sepolia:erc20 # Test ERC-20 sends
```

**Testing Gaps (Epic 6):**
- No automated cross-chain transaction tests
- No BLIK flow E2E tests
- No security flow tests (biometric/PIN)
- Manual testing only, time-consuming and error-prone

---

## Appendix - Useful Commands and Scripts

### Backend Commands

```bash
# Development
npm run start:dev         # Start dev server with hot reload
npm test                  # Run unit tests
npm run lint              # Run ESLint
npm run build             # Production build

# Database migrations
npm run migration:generate # Generate migration from entity changes
npm run migration:run      # Apply pending migrations
npm run migration:revert   # Revert last migration

# Direct TypeORM commands
npx typeorm-ts-node-commonjs -d database/data-source.ts migration:show  # Show migration status
```

### Mobile Commands

```bash
# Development
npm start                 # Start Expo dev server
npm run ios               # Run on iOS simulator
npm run android           # Run on Android emulator
npm test                  # Run unit tests

# Builds
npm run build:dev         # Development build (EAS)
npm run build:preview     # Preview build
npm run build:beta        # Beta build (TestFlight / Internal Testing)
npm run build:prod        # Production build (App Store / Google Play)

# Expo updates (OTA)
npm run update:dev        # Push OTA update to dev channel
npm run update:beta       # Push OTA update to beta channel
npm run update:prod       # Push OTA update to production channel

# Security
npm run security:check    # Run security audit
npm run security:audit    # Run npm audit

# Testnet tests
npm run test:sepolia      # Run all Sepolia testnet tests
npm run test:anvil        # Run local Anvil (Foundry) tests
```

---

### Debugging and Troubleshooting

**Backend Logs:**
- Console output in dev mode (`npm run start:dev`)
- Production logs: TBD (Render/Railway logs)

**Mobile Logs:**
- Expo dev tools: http://localhost:19002
- iOS logs: Xcode Console
- Android logs: `adb logcat`
- React Native debugger: Chrome DevTools or Flipper

**Common Issues:**

**Backend won't start:**
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1;"`
- Check Redis is running: `redis-cli ping`
- Check `.env` has all required variables

**Mobile app crashes on launch:**
- Clear cache: `npx expo start --clear`
- Check `.env` has valid backend URL and Alchemy API keys
- On iOS: Reset simulator (Device → Erase All Content and Settings)

**Cross-chain quote fails:**
- Check aggregator APIs are reachable (LiFi, Rango, Socket)
- Check rate limits not exceeded
- Try different token pair or chain combination

**Transaction fails:**
- Check user has sufficient balance (including gas)
- Check gas estimation didn't fail (Alchemy RPC issue)
- Check nonce not reused (nonce manager issue)

---

## Point A: Thinking Wallet Architecture (NEW - Jan 2026)

### AI Integration Overview

The "Thinking Wallet" feature transforms E-Y from a traditional wallet into an AI-powered assistant that understands natural language commands.

### New Components

#### Backend AI Module

```
backend/src/
├── modules/
│   └── ai/                          # NEW: AI feature module
│       ├── ai.module.ts             # Module definition
│       ├── ai.controller.ts         # REST endpoints
│       └── ai.service.ts            # Orchestration
│
├── services/
│   ├── AIIntent.service.ts          # NEW: Intent parsing (Groq + LangChain)
│   ├── TransactionRisk.service.ts   # NEW: Risk scoring (green/yellow/red)
│   └── GhostMode.service.ts         # NEW: Duress PIN management
```

#### Mobile AI Components

```
mobile/src/
├── screens/
│   └── ChatScreen.tsx               # NEW: Main AI interaction
│
├── components/
│   └── ItemCard/                    # NEW: Transaction card
│       ├── ItemCard.tsx             # Main component
│       ├── ItemCardFront.tsx        # Summary view
│       ├── ItemCardBack.tsx         # Stats view (flip)
│       └── styles.ts
│
├── services/
│   └── aiService.ts                 # NEW: AI API client
│
├── contexts/
│   └── GhostModeContext.tsx         # NEW: Ghost mode state
```

### AI Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│                    "Отправь 0.5 ETH на @alice"                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ ChatScreen  │───▶│ aiService   │───▶│ POST /api/ai/parse  │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│  ┌─────────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ ai.controller   │───▶│ AIIntent    │───▶│ Groq API        │  │
│  │                 │    │ Service     │    │ (LLM inference) │  │
│  └─────────────────┘    └─────────────┘    └─────────────────┘  │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ TransactionRisk │  Returns: { type, amount, recipient,       │
│  │ Service         │            token, confidence, riskLevel }  │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP                                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ ItemCard    │◀───│ Risk-colored    │◀───│ Parsed Intent   │  │
│  │ Component   │    │ (🟢🟡🔴)         │    │                 │  │
│  └─────────────┘    └─────────────────┘    └─────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ USER CONFIRMATION                                           ││
│  │ • Swipe RIGHT → Confirm                                     ││
│  │ • Swipe LEFT → Cancel                                       ││
│  │ • Type modification → Update Intent                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY GATE                                 │
│  IF amount > $500 OR new_address:                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ "Enter seed words #3, #7, #12"                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTION EXECUTION                         │
│  Existing transactionService.ts → sign → broadcast              │
└─────────────────────────────────────────────────────────────────┘
```

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/parse-intent` | POST | Parse natural language to structured intent |
| `/api/ai/risk-score` | POST | Calculate transaction risk level |
| `/api/ai/ghost-mode` | GET/PUT | Get/set ghost mode status |

### External Services (New)

| Service | Purpose | API |
|---------|---------|-----|
| **Groq** | Fast LLM inference | `groq-sdk` |
| **LangChain** | Agent orchestration | `langchain` |

### Security Considerations

1. **Seed Word Gate:** Never log seed word positions in plaintext
2. **Duress PIN:** Store separately from real PIN, implement decoy state
3. **Ghost Mode:** Client-side only, no backend awareness
4. **AI Parsing:** Validate all parsed amounts server-side before execution

---

## Conclusion

This architecture document provides a comprehensive snapshot of the E-Y Crypto Wallet codebase as of the MVP stabilization phase. It reflects the **actual state** of the system, including working features, incomplete implementations, and technical debt that must be addressed in the upcoming 7 epics.

**Key Takeaways:**
1. **Significant progress:** Backend has identity resolution, BLIK codes, and cross-chain routing foundation. Mobile has 40+ screens and comprehensive service layer.
2. **Critical blockers:** Cross-chain execution incomplete (Epic 1), security not enforced (Epic 2).
3. **Focused roadmap:** PRD epics provide clear path to MVP completion over 8-12 weeks.
4. **Technical debt acknowledged:** UI inconsistency, performance issues, error handling gaps documented for future resolution.

**Next Steps:**
- Engineering team starts Epic 1 (cross-chain execution) and Epic 2 (security hardening) in parallel
- This architecture document serves as reference for implementation
- Update this document as epics complete and architecture evolves

---

**For detailed implementation requirements, see:**
- `docs/prd.md` — Main PRD with epic breakdown
- `docs/prd/epic-01-crosschain-stabilization.md` — Cross-chain stories
- `docs/prd/epic-02-mobile-security.md` — Security stories
- `docs/prd/epic-03-to-07-summary.md` — Remaining epics summary

**End of Architecture Document**
