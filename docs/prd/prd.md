# Product Requirements Document: E-Y Crypto Wallet
## MVP Stabilization & Cross-Chain Validation Phase

**Document Version:** 2.0
**Date:** 2025-11-25
**Status:** Active Development - Brownfield Enhancement
**Product Vision:** Web3 for Everyone — Hide the Complexity, Keep the Power

**Document Type:** Brownfield PRD — This document describes enhancements to an existing, in-progress implementation.

---

## Document Organization
    
This PRD is organized into sharded epic files for manageability. The main sections are:

**Current Document (prd.md):** Executive summary, current state analysis, and high-level roadmap

**Epic Files (docs/prd/):**
- `epic-01-crosschain-stabilization.md` — Cross-chain transfer testing and routing validation
- `epic-02-mobile-security.md` — Biometric/PIN authentication and transaction security
- `epic-03-transaction-history-ui.md` — Multi-chain transaction history and filtering
- `epic-04-balance-display.md` — Aggregated and per-chain balance UI
- `epic-05-api-refinements.md` — Backend API improvements for mobile flows
- `epic-06-e2e-workflow-testing.md` — End-to-end testing from onboarding to shards
- `epic-07-design-system.md` — Post-validation design system and UI polish

---

## Executive Summary

### Project Context

**E-Y** is a next-generation self-custody cryptocurrency wallet that abstracts blockchain complexity through three core innovations:

1. **Global Identity System**: Users claim a unique @nickname or EY-ID that maps to wallet addresses across multiple chains
2. **BLIK-for-Crypto**: Temporary payment codes/links for easy receiving without exposing permanent addresses
3. **Intelligent Cross-Chain Routing**: System automatically chooses optimal transaction path (same-chain, bridge, or swap)

### Current Development Phase

**Phase:** MVP Stabilization & Cross-Chain Validation
**Status:** Brownfield enhancement of existing implementation
**Timeline:** 8-12 weeks to production-ready beta

**What Exists Today:**
- ✅ **Backend (NestJS):** Identity resolution, BLIK service, auth, cross-chain routing foundation, shard system
- ✅ **Mobile App (Expo/React Native):** 40+ screens, wallet management, transaction services, basic UI flows
- ✅ **Infrastructure:** PostgreSQL schema, TypeORM migrations, JWT auth, multiple router integrations (LiFi, Rango, Socket)

**What This Phase Delivers:**
1. **Validated cross-chain transfers** with real-world testing across multiple aggregators
2. **Production-grade security** with biometric/PIN authentication on mobile
3. **Complete transaction visibility** through multi-chain history and balance UIs
4. **Polished API layer** supporting all mobile use cases
5. **End-to-end workflow validation** from onboarding through shard earning
6. **Design foundation** for subsequent UI/UX polish phase

### Strategic Priorities (This Phase)

**Primary Goal:** Prove that E-Y's core value proposition works reliably and safely in real-world conditions.

**Non-Goals (Deferred):**
- Finalized visual design system (post-validation phase)
- Marketing website and app store presence
- Large-scale user acquisition
- Advanced features (recurring payments, NFT management, dApp browser)

---

## Part 1: Current State Analysis

### 1.1 Existing Backend Architecture

**Technology Stack:**
- **Framework:** NestJS 11 (TypeScript, modular architecture)
- **Database:** PostgreSQL 16 with TypeORM 0.3
- **Authentication:** JWT with wallet signature (EIP-191)
- **Blockchain:** ethers.js v5.7, Alchemy RPC provider
- **Cross-Chain:** LiFi, Rango, Socket aggregator integrations

**Implemented Backend Modules:**

#### Identity Module
**Status:** 🟢 Functional, needs refinement
**Components:**
- `IdentityResolverService`: Resolves @nickname, EY-ID, or raw addresses to user profiles
- `IdentityController`: REST endpoints for profile management, wallet CRUD, token preferences
- Database entities: `User`, `UserWallet`, `TokenPreference`

**Current Capabilities:**
- ✅ Nickname registration (Latin chars only, unique, case-insensitive)
- ✅ Multi-network wallet address management per user
- ✅ Token preference configuration (e.g., "I accept USDC on Polygon")
- ✅ Identity resolution with optimal address selection
- ✅ Global ID generation (`EY-XXXXXXXX` format from user UUID)

**Known Limitations:**
- ⚠️ No nickname change policy enforced (security risk for scams)
- ⚠️ No typosquatting protection (e.g., @a1ice vs @alice)
- ⚠️ Wallet address derivation not implemented (mobile generates, backend stores)
- ⚠️ No verification badges or trust indicators

**API Endpoints:**
```
GET    /api/identity/me                    // Get current user profile
PUT    /api/identity/nickname               // Update nickname
GET    /api/identity/wallets                // List user's wallets
POST   /api/identity/wallets                // Add wallet
PUT    /api/identity/wallets/:id            // Update wallet
DELETE /api/identity/wallets/:id            // Remove wallet
GET    /api/identity/token-preferences      // List token preferences
POST   /api/identity/token-preferences      // Set preference
PUT    /api/identity/token-preferences/:id  // Update preference
DELETE /api/identity/token-preferences/:id  // Remove preference
GET    /api/identity/resolve/:identifier    // Resolve any identifier (public)
```

#### BLIK Module
**Status:** 🟢 Functional, needs testing
**Components:**
- `BlikService`: Payment request lifecycle management
- `BlikController`: REST endpoints for code generation and payment execution
- Database entity: `PaymentRequest`

**Current Capabilities:**
- ✅ 6-digit alphanumeric code generation with uniqueness check
- ✅ Configurable TTL (default 5 minutes)
- ✅ Quote retrieval for both same-chain and cross-chain payments
- ✅ Pessimistic locking to prevent race conditions on code redemption
- ✅ Idempotency support for retry scenarios
- ✅ Automatic expiry of old codes via cron job
- ✅ Max 10 active codes per user (anti-abuse)

**Known Limitations:**
- ⚠️ Cross-chain execution incomplete (prepares transaction but doesn't execute)
- ⚠️ No mobile signature integration for cross-chain transactions
- ⚠️ Quote caching not implemented (redundant aggregator calls)
- ⚠️ No notification to recipient when code is used
- ⚠️ Error recovery UX not defined (if bridge fails midway)

**API Endpoints:**
```
POST   /api/blik/create                     // Create payment request
GET    /api/blik/:code                      // Get request info
POST   /api/blik/:code/quote                // Get quote for payment
POST   /api/blik/:code/execute              // Execute payment
DELETE /api/blik/:code                      // Cancel request
```

#### Cross-Chain Module
**Status:** 🟡 Partial, needs validation
**Components:**
- `CrosschainService`: Quote aggregation and routing
- `LiFiRouterService`, `RangoRouterService`, `SocketRouterService`: Individual aggregator integrations
- `CrosschainController`: REST endpoints for quotes and route preparation

**Current Capabilities:**
- ✅ Quote fetching from multiple aggregators
- ✅ Route comparison and "best quote" selection logic
- ✅ Transaction preparation (builds unsigned transaction data)
- ✅ Support for Ethereum, Polygon, Arbitrum, Optimism, Base chains
- ✅ Token address mapping for major stablecoins (USDC, USDT)

**Known Limitations:**
- ⚠️ **CRITICAL:** Cross-chain transaction execution not fully implemented
- ⚠️ No real-world testing with funded wallets
- ⚠️ Quote comparison algorithm not validated (price vs. time trade-offs)
- ⚠️ No bridge failure handling or recovery flows
- ⚠️ No webhook integration for transaction status monitoring
- ⚠️ Gas estimation for cross-chain routes not exposed to mobile

**API Endpoints:**
```
POST   /api/crosschain/quote                // Get best quote
POST   /api/crosschain/prepare/:router      // Prepare transaction
```

#### Payment Module
**Status:** 🟢 Functional for same-chain
**Components:**
- `PaymentService`: Same-chain transfers by identifier
- `PaymentsController`: REST endpoints

**Current Capabilities:**
- ✅ Send by identifier (@nickname or EY-ID) on same chain
- ✅ Balance validation
- ✅ Recipient resolution via IdentityResolver
- ✅ Error handling for edge cases (self-send, no address, insufficient funds)

**Known Limitations:**
- ⚠️ Mobile wallet signs transactions locally (backend only validates)
- ⚠️ No transaction status tracking after submission
- ⚠️ No retry mechanism for failed transactions
- ⚠️ Gas fee estimation delegated to mobile

**API Endpoints:**
```
POST   /api/payments/send-by-identifier     // Send payment by ID
```

#### Auth Module
**Status:** 🟢 Functional
**Components:**
- `AuthService`: Wallet signature verification, JWT issuance
- `AuthController`: Login endpoint
- `JwtAuthGuard`: Protected route middleware

**Current Capabilities:**
- ✅ EIP-191 message signing for authentication
- ✅ JWT token generation with wallet address payload
- ✅ Token expiry (24 hours default)
- ✅ Guard decorator for protected endpoints

**Known Limitations:**
- ⚠️ No refresh token mechanism
- ⚠️ No rate limiting on login attempts
- ⚠️ No device fingerprinting or session management
- ⚠️ Token revocation not implemented

**API Endpoints:**
```
POST   /api/auth/login                      // Authenticate with signature
GET    /api/auth/verify                     // Verify token validity
```

#### Shard Module
**Status:** 🟡 Basic implementation
**Components:**
- `ShardService`: Shard transaction logging and state management
- `ShardActionsController`: Track user actions that earn shards
- Database entities: `UserShardState`, `ShardTransaction`

**Current Capabilities:**
- ✅ Log shard-earning actions
- ✅ Track cumulative shard balance per user
- ✅ Action type categorization (first_transaction, blik_use, identity_claim, etc.)

**Known Limitations:**
- ⚠️ Anti-abuse rules not enforced (rate limits, transaction value minimums)
- ⚠️ No leaderboard or social features
- ⚠️ Sybil detection not implemented
- ⚠️ Shard distribution rate not finalized

**API Endpoints:**
```
GET    /api/shards/me                       // Get user shard balance
POST   /api/shards/actions                  // Log shard-earning action
```

---

### 1.2 Existing Mobile App Structure

**Technology Stack:**
- **Framework:** Expo SDK 54 (React Native 0.81)
- **Navigation:** React Navigation 7 (stack + tabs)
- **State:** Zustand for global state, AsyncStorage for persistence
- **Blockchain:** ethers.js v5.7
- **Security:** expo-local-authentication, expo-secure-store

**Screen Inventory (40+ screens implemented):**

#### Core Wallet Screens
- ✅ `HomeScreen.tsx` — Balance overview, quick actions
- ✅ `SendScreen.tsx`, `SendScreenOld.tsx` — Send flow (legacy + new)
- ✅ `UnifiedSendScreen.tsx` — Unified send interface (in progress)
- ✅ `SendByIdentifierScreen.tsx` — Send by @nickname/EY-ID
- ✅ `ReceiveScreen.tsx`, `UnifiedReceiveScreen.tsx` — Receive flows
- ✅ `TransactionDetailsScreen.tsx` — Individual transaction view
- ✅ `wallet/TransactionHistoryScreen.tsx` — Transaction list
- ✅ `wallet/ManageAccountsScreen.tsx` — Multi-wallet management
- ✅ `wallet/ManageTokensScreen.tsx` — Token visibility settings

#### BLIK Screens
- ✅ `CreateBlikCodeScreen.tsx` — Generate payment code
- ✅ `BlikCodeDisplayScreen.tsx` — Display shareable code
- ✅ `PayBlikCodeScreen.tsx` — Pay via BLIK code

#### Cross-Chain Screens
- ✅ `CrosschainQuoteScreen.tsx` — Route comparison and selection

#### Onboarding & Security
- ✅ `OnboardingScreen.tsx` — First-time user flow
- ✅ `CreateWalletScreen.tsx` — HD wallet generation
- ✅ `ImportWalletScreen.tsx` — Import via seed phrase
- ✅ `BiometricAuthScreen.tsx` — Biometric setup
- ✅ `PinAuthScreen.tsx` — PIN authentication
- ✅ `VerificationScreen.tsx` — Additional verification steps
- ✅ `SecuritySettingsScreen.tsx` — Security preferences

#### Profile & Settings
- ✅ `ProfileScreen.tsx`, `ProfileManagementScreen.tsx`, `AccountAndProfileScreen.tsx` — Profile management
- ✅ `SettingsScreen.tsx` — Main settings hub
- ✅ `PrivacyCenterScreen.tsx` — Privacy controls
- ✅ `NotificationSettingsScreen.tsx` — Push notification preferences
- ✅ `LanguageSettingsScreen.tsx` — i18n language selection
- ✅ `DevSettingsScreen.tsx`, `DiagnosticsScreen.tsx` — Developer tools

#### Legacy Features (Deprioritized)
- ✅ `SplitBillScreen.tsx`, `SplitBillHistoryScreen.tsx`, `PaySplitBillScreen.tsx` — Split bills (out of MVP scope)
- ✅ `SchedulePaymentScreen.tsx`, `ScheduledPaymentsListScreen.tsx` — Scheduled payments (deferred)
- ✅ `AddMoneyScreen.tsx`, `TransakWidgetScreen.tsx` — Fiat on-ramp (deferred)
- ✅ `PendingPaymentsScreen.tsx` — Payment requests (deferred)
- ✅ `IncomingTransactionsScreen.tsx` — Incoming tx monitoring (incomplete)

**Service Layer (Mobile):**

#### Blockchain Services
- ✅ `blockchain/transactionService.ts` — Transaction signing and broadcasting
- ✅ `blockchain/balanceService.ts` — Multi-chain balance fetching
- ✅ `blockchain/tokenService.ts` — ERC-20 token interactions
- ✅ `blockchain/gasEstimatorService.ts` — Gas price estimation
- ✅ `blockchain/nonceManagerService.ts` — Nonce management for concurrent txs
- ✅ `blockchain/transactionHistoryService.ts` — Transaction history fetching
- ✅ `blockchain/etherscanService.ts` — Block explorer integration
- ✅ `blockchain/eip681Service.ts` — EIP-681 payment request parsing

#### Core Services
- ✅ `walletService.ts` — HD wallet generation, key management
- ✅ `authService.ts` — Backend authentication flow
- ✅ `cryptoService.ts` — Encryption/decryption utilities
- ✅ `biometricService.ts` — Biometric authentication
- ✅ `pinService.ts` — PIN storage and verification
- ✅ `accountManagerService.ts` — Multi-account switching
- ✅ `addressRotationService.ts` — Privacy address rotation
- ✅ `priceService.ts` — Fiat price feeds
- ✅ `networkService.ts` — Network configuration and switching
- ✅ `notificationService.ts` — Push notifications
- ✅ `telemetryService.ts` — Analytics and error tracking
- ✅ `devModeService.ts` — Developer mode utilities

#### Backend Integration Services (API Clients)
- ✅ `api/identityService.ts` — Identity API client
- ✅ `api/blikService.ts` — BLIK API client
- ✅ `api/crosschainService.ts` — Cross-chain API client

#### Gamification Services
- ✅ `shardsService.ts`, `shardEventsService.ts` — Shard tracking

#### Legacy Services (Deprioritized)
- ✅ `splitBillService.ts`, `pendingPaymentsService.ts`, `scheduledPaymentService.ts` — Deferred features

**Current State Assessment:**

**Strengths:**
- Comprehensive screen coverage for MVP flows
- Well-structured service layer with separation of concerns
- Security primitives in place (biometrics, PIN, secure storage)
- Multi-chain blockchain interaction foundation solid

**Weaknesses:**
- **UI inconsistency:** No unified design system, components built ad-hoc
- **Cross-chain integration incomplete:** API clients exist but end-to-end flow not tested
- **Transaction history UI basic:** Lacks filtering, multi-chain aggregation, loading states
- **Balance display limited:** No proper multi-chain aggregation, refresh issues
- **Error handling inconsistent:** User-facing error messages not standardized
- **Security flow incomplete:** Biometric/PIN not enforced on all sensitive actions

---

### 1.3 Technical Debt & Known Issues

**Critical (Blocking MVP):**
1. **Cross-chain execution incomplete:** BLIK cross-chain and direct cross-chain sends prepare but don't execute transactions
2. **No end-to-end testing:** Cross-chain flows never tested with real funds on testnets
3. **Security enforcement gaps:** Biometric/PIN required on setup but not consistently enforced

**High Priority:**
4. **Transaction history performance:** Fetching from multiple chains serially, no caching
5. **Balance aggregation bugs:** Race conditions when fetching balances, stale data display
6. **API error handling:** Backend errors not properly mapped to user-friendly messages
7. **Gas estimation failures:** Mobile gas estimation sometimes fails, blocking sends

**Medium Priority:**
8. **UI/UX inconsistency:** Button styles, color usage, spacing vary across screens
9. **Loading states:** Many screens lack proper loading/skeleton states
10. **Offline mode:** App crashes or shows errors when network unavailable
11. **Deep linking:** BLIK payment links not fully tested

**Low Priority (Post-MVP):**
12. **Accessibility:** Screen reader support incomplete
13. **Localization:** i18n infrastructure exists but only English implemented
14. **Analytics:** Telemetry events not comprehensive

---

### 1.4 MVP Scope Clarification

**In Scope for This Phase:**
- ✅ Same-chain transfers by identifier (already works)
- ✅ BLIK code generation and same-chain payment (already works)
- 🔄 **Cross-chain transfers (needs testing & completion)**
- 🔄 **BLIK cross-chain payment (needs completion)**
- 🔄 **Security hardening (biometric/PIN enforcement)**
- 🔄 **Transaction history UI (needs polish)**
- 🔄 **Balance display UI (needs aggregation logic)**
- 🔄 **API refinements (pagination, filtering, error handling)**
- 🔄 **End-to-end workflow testing (onboarding → shard earning)**

**Explicitly Out of Scope:**
- ❌ Finalized visual design system (post-validation phase)
- ❌ Split bills, scheduled payments, fiat on-ramp
- ❌ NFT management, dApp browser, WalletConnect
- ❌ Social features (follow users, activity feed)
- ❌ Merchant integrations, point-of-sale
- ❌ Web app or browser extension
- ❌ Hardware wallet support

---

## Part 2: MVP Requirements

This section defines functional and non-functional requirements for completing the MVP stabilization phase.

### 2.1 Functional Requirements

#### FR-1: Cross-Chain Transfer Execution
**Priority:** CRITICAL
**Status:** Partial (quote fetching works, execution incomplete)

**Requirements:**
- FR-1.1: System shall execute cross-chain transfers via LiFi aggregator for supported routes
- FR-1.2: System shall execute cross-chain transfers via Rango aggregator as fallback
- FR-1.3: System shall execute cross-chain transfers via Socket aggregator for specific pairs
- FR-1.4: Mobile app shall sign and broadcast prepared cross-chain transactions
- FR-1.5: System shall monitor transaction status across source and destination chains
- FR-1.6: System shall notify user of transaction completion or failure
- FR-1.7: System shall handle partial failures (e.g., source tx succeeds but bridge hangs)

**Acceptance Criteria:**
- User can send USDC from Polygon to recipient on Arbitrum via @nickname
- Transaction completes end-to-end within aggregator's estimated time
- User sees intermediate status updates ("Swapping...", "Bridging...", "Confirming...")
- Failed transactions show clear error message and recovery options
- Gas costs displayed upfront match actual costs within 10% margin

#### FR-2: BLIK Cross-Chain Payment
**Priority:** HIGH
**Status:** Partial (quote works, execution incomplete)

**Requirements:**
- FR-2.1: Recipient can generate BLIK code with optional preferred chain
- FR-2.2: Sender can enter BLIK code and see cross-chain quote if chains differ
- FR-2.3: System shall execute cross-chain payment via BLIK code
- FR-2.4: System shall atomically mark BLIK code as used on execution start
- FR-2.5: System shall handle BLIK code expiry during payment flow gracefully
- FR-2.6: Sender shall receive clear confirmation of BLIK payment success

**Acceptance Criteria:**
- Alice generates BLIK code for 100 USDC on Polygon
- Bob enters code, has USDC on Ethereum, sees cross-chain quote
- Bob confirms, transaction executes, Alice receives 100 USDC on Polygon
- Code cannot be reused by another sender (race condition prevented)
- If code expires mid-payment, clear error shown with retry option

#### FR-3: Biometric/PIN Security Enforcement
**Priority:** HIGH
**Status:** Partial (setup works, enforcement inconsistent)

**Requirements:**
- FR-3.1: App shall require biometric or PIN setup on first launch
- FR-3.2: App shall require authentication on launch (after background >5 min)
- FR-3.3: App shall require authentication before displaying seed phrase
- FR-3.4: App shall require authentication before transaction confirmation
- FR-3.5: App shall require authentication before changing security settings
- FR-3.6: App shall allow user to choose biometric + PIN fallback
- FR-3.7: App shall lock after 3 failed PIN attempts (require biometric)

**Acceptance Criteria:**
- Fresh install forces biometric/PIN setup before accessing wallet
- App locked in background reopens with auth prompt
- Seed phrase export requires auth re-prompt even if recently authenticated
- Send transaction confirmation requires auth before signing
- Biometric failure falls back to PIN gracefully
- 3 wrong PINs triggers biometric-only mode for 30 seconds

#### FR-4: Multi-Chain Transaction History
**Priority:** MEDIUM
**Status:** Basic (single-chain fetch works, UI incomplete)

**Requirements:**
- FR-4.1: App shall display transactions from all active chains in unified list
- FR-4.2: App shall sort transactions by timestamp descending (newest first)
- FR-4.3: App shall show transaction status (pending, confirmed, failed)
- FR-4.4: App shall allow filtering by chain, token, or transaction type
- FR-4.5: App shall allow searching by recipient address or nickname
- FR-4.6: App shall cache transaction history for offline viewing
- FR-4.7: App shall link to block explorer for transaction details

**Acceptance Criteria:**
- User sees transactions from Polygon, Ethereum, Arbitrum in one list
- Transactions interleaved correctly by timestamp across chains
- Pending transactions show spinner, confirmed show checkmark, failed show X
- Filter by "Polygon only" shows only Polygon transactions
- Search "@alice" shows all transactions to/from Alice
- Offline mode shows cached transactions (with "may be outdated" warning)
- Tapping transaction opens block explorer (Etherscan, Polygonscan, etc.)

#### FR-5: Aggregated Balance Display
**Priority:** MEDIUM
**Status:** Basic (single-chain balance works, aggregation buggy)

**Requirements:**
- FR-5.1: Home screen shall show total portfolio value in user's fiat currency
- FR-5.2: Home screen shall show breakdown by token (aggregated across chains)
- FR-5.3: Home screen shall show breakdown by chain (all tokens on that chain)
- FR-5.4: Balance shall refresh on pull-to-refresh gesture
- FR-5.5: Balance shall auto-refresh every 30 seconds when app foregrounded
- FR-5.6: Balance fetch shall be parallelized across chains for speed
- FR-5.7: Stale balance shall show "Last updated X ago" warning

**Acceptance Criteria:**
- User with 50 USDC on Polygon + 50 USDC on Ethereum sees "100 USDC ($100)"
- Portfolio total aggregates all tokens converted to USD
- Chain breakdown shows "Polygon: $50" and "Ethereum: $50"
- Pull-to-refresh updates balance within 3 seconds
- Balance automatically refreshes when returning from transaction
- If Polygon RPC slow, Ethereum balance shows immediately (no blocking)
- If balance >5 minutes old, shows "Updated 6m ago" with yellow indicator

#### FR-6: API Error Handling & User Messaging
**Priority:** MEDIUM
**Status:** Inconsistent

**Requirements:**
- FR-6.1: Backend shall return standardized error response format
- FR-6.2: Error responses shall include error code, user message, and details
- FR-6.3: Mobile app shall map error codes to user-friendly messages
- FR-6.4: Network errors shall show retry button
- FR-6.5: Validation errors shall highlight specific fields
- FR-6.6: System errors shall show support contact option

**Acceptance Criteria:**
- Backend returns `{ error: "RECIPIENT_NOT_FOUND", message: "User @alice not found", userMessage: "The person you're trying to send to isn't on E-Y yet." }`
- Mobile shows user-friendly message, not raw error code
- Network timeout shows "Connection lost. Tap to retry."
- Invalid nickname shows error highlight on nickname input field
- Unexpected backend error shows "Something went wrong. Contact support." with error ID

#### FR-7: End-to-End Workflow Validation
**Priority:** HIGH
**Status:** Untested

**Requirements:**
- FR-7.1: Complete onboarding flow shall work without crashes
- FR-7.2: User can complete first same-chain transaction and earn shard
- FR-7.3: User can claim nickname and see it reflected immediately
- FR-7.4: User can generate BLIK code and complete payment
- FR-7.5: User can execute cross-chain transfer and earn multi-chain shard
- FR-7.6: All critical paths shall have automated E2E tests (Detox or similar)

**Acceptance Criteria:**
- New user: install → onboard → generate wallet → set PIN → see 0 balance → claim @nickname → receive testnet funds → send to friend → see shard notification → generate BLIK code → friend pays → see balance update
- No crashes, freezes, or error screens in happy path
- Each step saves state (can background app and resume)
- Shards increment after qualifying actions

---

### 2.2 Non-Functional Requirements

#### NFR-1: Performance
- NFR-1.1: Transaction confirmation screen shall appear within 500ms of "Send" tap
- NFR-1.2: Balance refresh shall complete within 5 seconds for 5 chains
- NFR-1.3: Transaction history shall load first 20 items within 2 seconds
- NFR-1.4: Cross-chain quote fetch shall return within 10 seconds (parallel aggregators)
- NFR-1.5: App launch to home screen shall complete within 3 seconds (warm launch)

#### NFR-2: Security
- NFR-2.1: Private keys shall never leave device secure storage
- NFR-2.2: Seed phrase shall only be shown once after generation
- NFR-2.3: All API requests shall use HTTPS with certificate pinning (future)
- NFR-2.4: Sensitive actions shall require re-authentication within 5 minutes
- NFR-2.5: Backend shall rate-limit API endpoints (100 req/min per user)

#### NFR-3: Reliability
- NFR-3.1: App shall handle network disconnections gracefully (offline mode)
- NFR-3.2: Failed transactions shall not lose user funds (atomic operations)
- NFR-3.3: Backend shall have 99% uptime (measured over 30 days)
- NFR-3.4: Database backups shall occur every 24 hours with 7-day retention
- NFR-3.5: Critical errors shall trigger alerts to engineering team

#### NFR-4: Usability
- NFR-4.1: Error messages shall be in plain language, not technical jargon
- NFR-4.2: Loading states shall show progress indicators, not blank screens
- NFR-4.3: Touch targets shall be minimum 44x44pt per iOS HIG
- NFR-4.4: Color contrast shall meet WCAG AA standards (4.5:1 ratio)
- NFR-4.5: Forms shall show inline validation errors before submission

#### NFR-5: Compatibility
- NFR-5.1: Mobile app shall support iOS 14+ and Android 10+
- NFR-5.2: Backend shall maintain API backward compatibility within major version
- NFR-5.3: Database migrations shall be reversible for rollback scenarios
- NFR-5.4: App shall work on devices with 4GB RAM minimum

---

### 2.3 Compatibility Requirements

**CR-1: Existing API Compatibility**
- New API changes shall be additive (new endpoints, optional fields)
- Existing mobile app versions shall continue working with new backend
- Deprecated endpoints shall show warning headers, removed after 3 months

**CR-2: Database Schema Compatibility**
- Migrations shall not break existing data
- New columns shall have sensible defaults or be nullable
- Foreign key relationships shall be preserved

**CR-3: UI/UX Consistency (Post-Design Phase)**
- New screens shall follow existing navigation patterns (stack, tabs)
- Button placement shall be consistent (primary action bottom-right)
- Color palette shall use existing theme colors until design phase

**CR-4: Integration Compatibility**
- Backend shall remain compatible with existing mobile service layer
- API response shapes shall match existing TypeScript interfaces
- Authentication flow shall not require mobile app changes

---

## Part 3: Implementation Roadmap

### Phase Overview

**Current Phase:** MVP Stabilization & Cross-Chain Validation
**Duration:** 8-12 weeks
**Goal:** Production-ready beta with validated cross-chain transfers, security, and core UX

**Subsequent Phases (Out of Scope for This PRD):**
- **Phase 2:** Design System & UI Polish (4-6 weeks)
- **Phase 3:** Beta Testing & Iteration (4-6 weeks)
- **Phase 4:** Public Launch Preparation (2-4 weeks)

---

### Epic Breakdown for Current Phase

This PRD is organized into 7 epics, each documented in a separate markdown file in `docs/prd/`:

**Epic 1: Cross-Chain Stabilization** (`epic-01-crosschain-stabilization.md`)
**Goal:** Validate and complete cross-chain transfer execution across multiple aggregators
**Stories:** 8 stories covering LiFi/Rango/Socket integration, execution completion, testing, monitoring
**Duration:** 3-4 weeks
**Dependencies:** None (foundational)

**Epic 2: Mobile Security** (`epic-02-mobile-security.md`)
**Goal:** Enforce biometric/PIN authentication on all sensitive actions
**Stories:** 6 stories covering auth enforcement, fallback flows, lockout, recovery
**Duration:** 2-3 weeks
**Dependencies:** None (parallel with Epic 1)

**Epic 3: Transaction History UI** (`epic-03-transaction-history-ui.md`)
**Goal:** Build production-quality multi-chain transaction history with filtering
**Stories:** 7 stories covering aggregation, filtering, search, caching, UI polish
**Duration:** 2-3 weeks
**Dependencies:** Epic 1 (needs cross-chain transactions to display)

**Epic 4: Balance Display** (`epic-04-balance-display.md`)
**Goal:** Implement aggregated and per-chain balance display with auto-refresh
**Stories:** 5 stories covering aggregation logic, UI components, refresh mechanisms
**Duration:** 1-2 weeks
**Dependencies:** Epic 1 (needs accurate cross-chain balances)

**Epic 5: API Refinements** (`epic-05-api-refinements.md`)
**Goal:** Polish backend APIs for pagination, filtering, error handling
**Stories:** 6 stories covering pagination, filtering, standardized errors, webhook integration
**Duration:** 2-3 weeks
**Dependencies:** Epic 3, Epic 4 (driven by mobile needs)

**Epic 6: End-to-End Workflow Testing** (`epic-06-e2e-workflow-testing.md`)
**Goal:** Validate complete user journeys from onboarding to shards
**Stories:** 5 stories covering critical path testing, edge case handling, automation
**Duration:** 2-3 weeks
**Dependencies:** Epic 1-5 (integration testing)

**Epic 7: Design System Foundation** (`epic-07-design-system.md`)
**Goal:** Establish design foundation for subsequent UI polish phase
**Stories:** 4 stories covering design audit, component library planning, style guide draft
**Duration:** 1-2 weeks
**Dependencies:** Epic 6 (after flows validated)
**Note:** Full design implementation is a separate phase, this epic is planning only

---

### Epic Sequencing & Parallelization

**Weeks 1-4: Parallel Track A + B**
- Track A: Epic 1 (Cross-Chain Stabilization) — 2 engineers
- Track B: Epic 2 (Mobile Security) — 1 engineer

**Weeks 5-7: Parallel Track C + D**
- Track C: Epic 3 (Transaction History UI) — 1 engineer
- Track D: Epic 4 (Balance Display) — 1 engineer
- Track E: Epic 5 (API Refinements) — starts week 6, 1 engineer

**Weeks 8-10: Integration & Testing**
- Epic 6 (E2E Workflow Testing) — full team
- Epic 5 (API Refinements) — continues

**Weeks 11-12: Design Foundation & Buffer**
- Epic 7 (Design System Foundation) — designer + 1 engineer
- Bug fixes, polish, documentation

---

### Success Criteria for Phase Completion

**Technical Milestones:**
- ✅ 10 successful cross-chain transfers on testnet (LiFi, Rango, Socket)
- ✅ 100% of sensitive actions require biometric/PIN
- ✅ Transaction history displays 50+ transactions across 3+ chains without lag
- ✅ Balance aggregation handles 10 tokens across 5 chains in <5 seconds
- ✅ All API endpoints have standardized error responses
- ✅ End-to-end workflow automated test suite passes

**User Experience Milestones:**
- ✅ 5 beta testers complete onboarding → first transaction without assistance
- ✅ 0 crashes in critical path (onboarding, send, receive, BLIK)
- ✅ Transaction success rate >95% (excluding user-initiated cancellations)
- ✅ Error messages comprehensible to non-technical users (user testing)

**Readiness Criteria:**
- ✅ Backend deployed to staging environment with monitoring
- ✅ Mobile app passes iOS App Store and Google Play policy review (internal check)
- ✅ Security audit completed (self-audit or external if budget allows)
- ✅ Backup and disaster recovery procedures documented

---

## Next Steps

**Immediate Actions (Week 1):**

1. **Architect Review** — Review this PRD with engineering team, confirm feasibility and timeline
2. **Epic Prioritization** — Confirm epic sequencing aligns with team capacity
3. **Environment Setup** — Ensure staging/testnet environments ready for cross-chain testing
4. **Testnet Funding** — Acquire testnet tokens on Polygon, Ethereum, Arbitrum, Optimism for testing
5. **Telemetry Setup** — Instrument key flows for error tracking (Sentry integration)

**Subsequent Actions (Weeks 2-12):**
- Work through epics sequentially per roadmap
- Weekly progress reviews to adjust priorities
- Bi-weekly demos to stakeholders
- Continuous integration testing as features complete

**Post-Phase Actions (Phase 2):**
- Hand off to design team for UI/UX system design
- Conduct user research sessions with beta testers
- Iterate on flows based on validation phase learnings

---

## Appendices

### A. Reference Documents
- `docs/brief.md` — Project Brief (Mary's strategic vision)
- `docs/architecture/ARCHITECTURE.md` — System architecture overview
- `docs/architecture/SRS.md` — Software requirements specification (legacy)
- `backend/src/README.md` — Backend service documentation
- `mobile/README.md` — Mobile app setup and structure (if exists)

### B. Epic Files (Detailed Stories)
- `docs/prd/epic-01-crosschain-stabilization.md`
- `docs/prd/epic-02-mobile-security.md`
- `docs/prd/epic-03-transaction-history-ui.md`
- `docs/prd/epic-04-balance-display.md`
- `docs/prd/epic-05-api-refinements.md`
- `docs/prd/epic-06-e2e-workflow-testing.md`
- `docs/prd/epic-07-design-system.md`

### C. Glossary
- **BLIK:** Polish mobile payment standard; in E-Y context, temporary payment codes for receiving crypto
- **Cross-Chain:** Transaction involving multiple blockchain networks (e.g., Polygon → Arbitrum)
- **Aggregator:** Service that finds best route across multiple bridge protocols (LiFi, Rango, Socket)
- **Same-Chain:** Transaction within a single blockchain network
- **Shard:** Gamification points earned for specific user actions
- **EY-ID:** Auto-generated global identifier format (e.g., EY-ABC123XYZ)
- **Brownfield:** Enhancement of existing codebase (vs. greenfield = new project)
- **HD Wallet:** Hierarchical Deterministic wallet, generates keys from seed phrase

---

**End of Main PRD Document**

**For detailed user stories and acceptance criteria, see individual epic files in `docs/prd/`.**
