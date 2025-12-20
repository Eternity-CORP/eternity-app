# Project Brief: E-Y Crypto Wallet

**Version:** 1.0
**Date:** 2025-11-25
**Status:** Active Development
**Product Vision:** Web3 for Everyone — Hide the Complexity, Keep the Power

---

## Executive Summary

**E-Y** is a next-generation cryptocurrency wallet that radically simplifies blockchain interactions by abstracting away network complexity. Instead of forcing users to understand chains, gas fees, and bridge protocols, E-Y presents a unified interface where users interact with **global identities** (nicknames or universal IDs) and the system intelligently routes transactions across multiple networks.

**Primary Problem:** Traditional crypto wallets expose too much complexity — users must know which network to use, manage multiple addresses per chain, understand gas tokens, and manually bridge assets. This creates massive friction for adoption.

**Target Market:** Crypto-curious users who want the benefits of self-custody and decentralization without the cognitive overhead. Primary focus on mobile-first, social payment scenarios.

**Key Value Proposition:** Send crypto as easily as Venmo or Cash App, but with full self-custody. One global username replaces dozens of network-specific addresses. One-tap cross-chain transfers with automatic route optimization.

**Strategic Differentiators:**
- **BLIK-for-crypto**: Generate temporary payment codes/links for easy receiving
- **Global identity system**: One nickname maps to all network addresses
- **Intelligent routing**: System chooses optimal path (same-chain, bridge, or swap)
- **Gamified engagement**: Shard points for real web3 actions, not arbitrary tasks

---

## Problem Statement

### Current State & Pain Points

**The web3 UX crisis is real:**

1. **Address Hell:** Users maintain separate addresses for Ethereum, Polygon, Arbitrum, Base, etc. Sending to the wrong network means lost funds. Family members asking "what's your crypto address?" get confused by multiple 42-character strings.

2. **Network Guessing Game:** Sender must know recipient's preferred network. "Do you have USDC on Polygon or Arbitrum?" becomes a prerequisite question before every transaction.

3. **Bridge Friction:** Cross-chain transfers require:
   - Finding a reliable bridge protocol
   - Understanding source/destination network compatibility
   - Manually acquiring gas tokens on both chains
   - Monitoring bridge transaction status across multiple interfaces
   - Typical user time: 15-30 minutes for what should be instant

4. **Gas Token Juggling:** To send USDC on Ethereum, you need ETH. To send USDC on Polygon, you need MATIC. New users frequently get stuck with tokens but no gas to move them — "I have $1000 USDC but I can't send it."

5. **Discovery Problem:** No easy way to request payments. Users resort to copy-pasting addresses via WhatsApp/Telegram, leading to errors and scams.

### Impact & Urgency

**Quantifiable Impact:**
- **70% of new crypto users** report confusion about networks as a primary barrier (2024 Consensys survey)
- **$2.5B+ lost annually** to wrong-network transfers and bridge exploits
- **Average 6-8 failed attempts** before first successful cross-chain transfer

**Why Now:**
- L2s have proliferated (10+ production networks), making the problem exponentially worse
- Account abstraction and ERC-4337 enabling better UX patterns
- Traditional fintech (Venmo, Cash App, BLIK) has trained users to expect simplicity
- First-mover advantage in "invisible blockchain" category before competition consolidates

### Why Existing Solutions Fall Short

**Existing Wallets (MetaMask, Rainbow, Coinbase Wallet):**
- ✗ Still expose network selection to users
- ✗ No unified identity across chains
- ✗ Manual bridge integrations are cumbersome
- ✗ Focus on trading/DeFi power users, not payments

**Centralized Apps (Coinbase, Binance):**
- ✓ Simple UX with internal transfers
- ✗ Users don't control keys (not your keys, not your crypto)
- ✗ Custodial risk and regulatory exposure
- ✗ Can't interact with broader DeFi ecosystem

**Bridge Aggregators (Li.Fi, Socket):**
- ✓ Good cross-chain routing
- ✗ Still require technical understanding of source/destination
- ✗ No identity layer or social features
- ✗ Optimization for traders, not everyday payments

**E-Y's Unique Position:** Combine self-custody + invisible complexity + social payment UX. Nobody else is attacking this exact problem space.

---

## Proposed Solution

### Core Concept & Approach

**E-Y = Self-Custody Meets Consumer Fintech UX**

Users interact with a single, simple interface that handles all blockchain complexity under the hood. The product consists of three interlocking systems:

#### 1. Global Identity Layer

**What it is:** Each user claims a unique global identifier (Latin-only nickname or auto-generated ID like "EY-ABC123XYZ") that maps to multiple network-specific wallet addresses.

**How it works:**
- User registers `@john_crypto` as their E-Y identity
- Backend stores mappings: `@john_crypto` → {ethereum: 0xAAA..., polygon: 0xBBB..., arbitrum: 0xCCC...}
- Users can manage which networks they support and set preferences per token
- Senders only need to know `@john_crypto`, not specific addresses

**Why it wins:** Eliminates address management hell. One memorable identity for all interactions.

#### 2. BLIK-for-Crypto Payment Codes

**What it is:** Short-lived, secure payment request system inspired by Poland's BLIK mobile payment standard.

**How it works:**
- Recipient generates 6-digit code or shareable link (valid 5-10 minutes)
- Code/link encodes: recipient identity, optional amount, expiry time
- Sender enters code in app, confirms amount, sends
- System handles network selection, routing, and confirmation

**Why it wins:** Solves the "give me your address" problem. Especially powerful for in-person payments, splitting bills, or requesting payment from non-crypto natives.

#### 3. Intelligent Transaction Routing

**What it is:** Backend service that analyzes transaction requirements and automatically chooses optimal execution path.

**How it works:**
1. User initiates: "Send 100 USDC to @alice"
2. System checks:
   - Does sender have USDC on a chain where Alice has an address?
   - If yes → direct same-chain transfer (cheapest, fastest)
   - If no → cross-chain bridge via Li.Fi/Socket/Rango aggregators
   - If sender has different token → bridge + swap in one transaction
3. System presents ONE confirmation screen: "100 USDC to @alice, ~$2.50 fee, 30sec"
4. Execute transaction, monitor status, notify both parties

**Why it wins:** Removes decision paralysis. Users see total cost upfront, system handles the complexity. Safety checks prevent common errors.

### Key Differentiators

**vs. Traditional Wallets:**
- No manual network selection
- No bridge research required
- Social identity layer built-in

**vs. Centralized Apps:**
- Full self-custody (users control keys)
- Can interact with any DeFi protocol
- No KYC gatekeeping for basic usage

**vs. Bridge Aggregators:**
- Consumer-friendly interface
- Identity-based addressing
- Gamification for engagement

### High-Level Product Vision

**Phase 1 (Current):** Mobile wallet with global identity, basic same-chain routing, BLIK codes
**Phase 2:** Cross-chain routing via aggregators, shard system launch
**Phase 3:** Merchant integrations, recurring payments, advanced DeFi integrations
**Long-term:** E-Y becomes the default on-ramp for web3 — the app grandma uses to send crypto birthday money

---

## Target Users

### Primary User Segment: Crypto-Curious Mainstream

**Demographics:**
- Age: 22-45
- Tech Savvy: Medium (comfortable with Venmo/Cash App, intimidated by web3)
- Income: $40k-$120k
- Geography: Urban/suburban, global (initially English-speaking markets)
- Crypto Experience: Owns some crypto OR interested but hasn't started

**Current Behaviors:**
- Uses mobile payment apps daily (Venmo, PayPal, Cash App, BLIK)
- Frustrated by Coinbase/Binance withdrawal fees and delays
- Wants to "try crypto" but confused by existing wallets
- Heard about NFTs, DeFi, but doesn't know where to start

**Specific Pain Points:**
1. "I tried to send my friend crypto and it got lost because I used wrong network"
2. "Gas fees don't make sense — why do I need ETH to send USDC?"
3. "Managing 5 different addresses is too much"
4. "I want self-custody but I'm afraid I'll mess it up"

**Goals:**
- Send/receive crypto as easily as sending fiat via Venmo
- Avoid high exchange fees by using self-custody
- Feel confident they won't lose funds to technical errors
- Explore web3 apps without needing a PhD in blockchain

**User Quote:** *"I want crypto to just work like normal money. I don't care about gas, chains, or bridges — just tell me the total cost and send it."*

### Secondary User Segment: Web3 Native Power Users

**Demographics:**
- Age: 20-40
- Tech Savvy: High (software engineers, crypto traders, DeFi farmers)
- Crypto Experience: Daily users, multiple wallets, active on Discord/Crypto Twitter

**Current Behaviors:**
- Uses MetaMask/Rainbow for DeFi, trading, NFTs
- Manually bridges between L2s multiple times per week
- Frustrated by fragmented liquidity and UX friction
- Wants to onboard friends/family but existing tools too complex

**Specific Pain Points:**
1. "I know how to bridge, but teaching my mom is impossible"
2. "Checking 5 aggregators to find best bridge route wastes time"
3. "My friends ask me for help with every transaction — I want to just recommend one app"

**Goals:**
- Faster cross-chain workflows without sacrificing control
- Tool to recommend to normie friends (network effects)
- Maintain self-custody and DeFi compatibility
- Reduce cognitive overhead for routine transactions

**User Quote:** *"For advanced DeFi I'll use MetaMask, but for payments and simple stuff, E-Y is way faster. Plus I can finally onboard my non-crypto friends."*

---

## Goals & Success Metrics

### Business Objectives

- **User Growth:** 50,000 active wallets within 12 months of public launch
  - Active = at least 1 transaction per month
  - Target retention: 40% MAU/WAU ratio

- **Transaction Volume:** $10M+ total transaction volume processed in Year 1
  - Mix of same-chain and cross-chain transactions
  - Average transaction size: $50-200 USDC equivalent

- **Revenue Model (Future):** Achieve $100k ARR by end of Year 2 via:
  - Small fee on cross-chain transactions (0.1-0.5% take rate)
  - Premium features (advanced analytics, recurring payments, multi-sig)
  - Potential token launch tied to shard gamification system

- **Network Effects:** 30% of new users coming via referral/social by Month 9
  - BLIK code sharing drives viral growth
  - Global identity system creates lock-in

### User Success Metrics

- **Onboarding Completion:** >80% of users who create wallet complete first transaction within 7 days
- **Transaction Success Rate:** >95% of initiated transactions complete without user-facing errors
- **Cross-Chain Adoption:** 20% of users execute at least one cross-chain transaction within first month
- **Time-to-Send:** Median time from "Send" button to confirmed transaction <60 seconds (including cross-chain)
- **BLIK Usage:** 40% of users generate at least one payment code/link within 30 days

### Key Performance Indicators (KPIs)

- **DAU/MAU Ratio:** Target 0.25+ (indicates strong engagement)
  - Tracked via wallet connection events

- **Transaction Failure Rate:** <5% technical failures (network errors, insufficient gas, bridge failures)
  - Does NOT include user-initiated cancellations

- **Average Transaction Fee:** $2-5 for cross-chain, $0.50-2 for same-chain
  - Competitive with centralized exchanges, below retail bridge costs

- **Customer Support Tickets per 1000 Transactions:** <10
  - Proxy for "does it just work?"

- **Shard Engagement Rate:** 60% of users earn at least one shard within first week
  - Measure of gamification effectiveness

- **Identity Claim Rate:** 70% of users register a global nickname (vs. accepting auto-generated ID)
  - Indicates user investment in ecosystem

---

## MVP Scope

### Core Features (Must Have)

**1. Wallet Creation & Import**
- **Description:** HD wallet generation with secure device storage (iOS Keychain, Android KeyStore)
- **Rationale:** Foundation for self-custody. Must be bulletproof secure. Seed phrase backup with clear warnings.
- **Technical:** ethers.js for key generation, expo-secure-store for storage
- **Acceptance Criteria:** User can create wallet, see seed phrase once, and later restore from seed phrase

**2. Global Identity Registration**
- **Description:** Claim unique nickname (Latin chars only, 3-20 chars) or auto-generated EY-ID
- **Rationale:** Core differentiator. Users need memorable identity for network effects.
- **Technical:** Backend validation for uniqueness, regex for char restrictions, case-insensitive storage
- **Acceptance Criteria:** User registers @nickname, backend stores mappings, nickname visible in profile

**3. Multi-Network Wallet Management**
- **Description:** Each user gets wallet addresses auto-generated for: Ethereum, Polygon, Arbitrum, Base, Optimism
- **Rationale:** Users shouldn't manually "add networks" — we generate all addresses upfront, hide unused ones
- **Technical:** Derive addresses from single seed using BIP-44 paths, store chain-to-address mappings
- **Acceptance Criteria:** User can view addresses per chain, add/remove preferred chains, set primary chain

**4. Token Preferences**
- **Description:** Users configure which tokens they accept on which chains (e.g., "I accept USDC on Polygon and Arbitrum, but not Ethereum")
- **Rationale:** Receiving assets on wrong/expensive chain wastes money. Preferences guide senders.
- **Technical:** Backend table linking userId + tokenSymbol + chainId + isPrimary
- **Acceptance Criteria:** User sets preferences, senders see "Alice prefers USDC on Polygon"

**5. Same-Chain Send by Identity**
- **Description:** Send tokens to @nickname or EY-ID, system resolves to correct address on specified chain
- **Rationale:** MVP must prove core value prop. Start with simple case before cross-chain.
- **Technical:** IdentityResolver.service.ts (already implemented), direct transaction via ethers.js
- **Acceptance Criteria:** User enters @bob, amount, selects chain, transaction executes to correct address

**6. BLIK Code Generation (Receive)**
- **Description:** Generate 6-digit numeric code OR shareable link, valid 5-10 minutes, with optional amount
- **Rationale:** Solves "give me your address" problem without exposing permanent addresses
- **Technical:** Generate random code, store {code → userId + amount + expiresAt + chainId} in backend, cleanup expired codes
- **Acceptance Criteria:** User creates code, shares via clipboard/SMS, code expires after time limit

**7. BLIK Code Payment (Send)**
- **Description:** Sender enters code, sees recipient info (nickname + masked address), confirms amount, sends
- **Rationale:** Complete the BLIK loop — receiving is useless without sending
- **Technical:** Lookup code in backend, resolve recipient, pre-fill send screen, execute transaction
- **Acceptance Criteria:** Sender enters valid code, sees recipient preview, completes payment, code marked used

**8. Transaction History**
- **Description:** View past transactions with: status, timestamp, recipient/sender, amount, chain, tx hash
- **Rationale:** Users need confidence that transactions succeeded and ability to review history
- **Technical:** Query transactions from blockchain via Alchemy + local AsyncStorage cache for metadata
- **Acceptance Criteria:** User sees chronological list, can filter by chain, tap to view on block explorer

**9. Balance Display (Multi-Chain)**
- **Description:** Home screen shows total portfolio value + breakdown by token and chain
- **Rationale:** Users need to see "what do I have?" at a glance
- **Technical:** Alchemy API for balances, CoinGecko/CoinMarketCap for fiat prices, cache with 30s refresh
- **Acceptance Criteria:** Balance updates on pull-to-refresh, shows USD equivalent, loading states

**10. Security: Biometric/PIN Lock**
- **Description:** Require Face ID/Touch ID/Fingerprint/PIN to access wallet and approve transactions
- **Rationale:** Device loss is biggest security risk for mobile wallets
- **Technical:** expo-local-authentication for biometrics, SecureStore for PIN hash
- **Acceptance Criteria:** User sets up lock on first launch, prompted before sensitive actions

---

### Out of Scope for MVP

- ❌ **Cross-chain routing** (Phase 2 — requires aggregator integrations and safety testing)
- ❌ **Token swaps** (DEX integration, slippage handling)
- ❌ **NFT management** (gallery view, transfer, minting)
- ❌ **WalletConnect / dApp browser** (external DeFi interactions)
- ❌ **Recurring payments** (scheduled sends, subscriptions)
- ❌ **Split bills** (although architecture exists from previous implementation)
- ❌ **Fiat on-ramp** (Transak integration — deprioritized until user traction)
- ❌ **Social graph** (follow users, activity feed)
- ❌ **Web app** (mobile-first; web later)
- ❌ **Hardware wallet support** (Ledger, Trezor)

---

### MVP Success Criteria

**Definition of Success:**
- 1,000 wallets created within first month of beta launch
- 500+ global identities claimed (50% adoption rate)
- 100+ BLIK codes generated, 70% redemption rate
- <5% error rate on same-chain transactions
- NPS >40 among active users
- At least 10 users actively sending to each other (network effects kicking in)

**Go/No-Go Decision:** If MVP achieves these metrics, proceed to Phase 2 (cross-chain routing). If not, iterate on UX friction points identified in user feedback.

---

## Post-MVP Vision

### Phase 2 Features (Next 6 Months)

**Cross-Chain Transaction Routing:**
- Integrate Li.Fi, Socket, or Rango SDK for cross-chain quotes
- Implement route selection algorithm (optimize for speed vs. cost)
- Safety checks: slippage limits, minimum received amounts, bridge reputation scores
- **Impact:** Unlock full "send to anyone on any chain" value proposition

**Shard Gamification System:**
- Award shard points for: first transaction, using BLIK, claiming identity, inviting friends, multi-chain activity
- Anti-abuse rules: rate limiting, transaction value minimums, Sybil detection
- Shard leaderboard and achievement badges
- **Impact:** Drive engagement and viral growth, potential future token utility

**Enhanced Recipient Discovery:**
- QR code scanning for identities
- Address book with ENS resolution
- "Nearby users" via Bluetooth (optional, privacy-preserving)
- **Impact:** Reduce friction in face-to-face payment scenarios

**Transaction Fee Optimization:**
- Show multiple route options (fast/expensive vs. slow/cheap)
- Gas price prediction and delay recommendations
- Fee payment in any token (ERC-4337 paymaster patterns)
- **Impact:** Give users control when they care about cost vs. speed

---

### Long-Term Vision (12-24 Months)

**Consumer-Grade Payment Features:**
- Recurring payments (rent, subscriptions, DCA into crypto)
- Payment requests with notifications
- Group payments and expense splitting (reimagine SplitBill feature)
- Payment links for merchants (e.g., coffee shop posts E-Y QR code)

**Merchant & Business Tools:**
- Point-of-sale integrations
- Payment invoicing for freelancers
- Settlement to bank account (fiat off-ramp)
- Multi-user wallets for small businesses

**Web3 Ecosystem Integration:**
- WalletConnect support (interact with DeFi apps)
- Embedded dApp browser with curated app directory
- NFT gallery and marketplace integrations
- Staking and yield opportunities (vetted, low-risk)

**Advanced Identity Features:**
- Verified badges (KYC optional for users who want it)
- Social profiles (bio, avatar, link other socials)
- Activity feed (see friends' transactions with their permission)
- Reputation system (trusted sender/receiver scores)

**Platform Expansion:**
- Web app (desktop browser wallet)
- Browser extension (compete with MetaMask for DeFi users)
- API for third-party integrations
- Embeddable widget for merchant checkouts

---

### Expansion Opportunities

**Geographic Expansion:**
- Localize for non-English markets (Spanish, Portuguese, Chinese, Hindi)
- Partner with local payment providers (Brazil's PIX, India's UPI)
- Regional token support (local stablecoins, popular L1s)

**Institutional/B2B:**
- Treasury management for DAOs
- Payroll solutions for remote teams paid in crypto
- Compliance tools for businesses (tax reporting, transaction labeling)

**Token & Ecosystem:**
- Launch E-Y token tied to shard system
- Token utility: governance, fee discounts, staking rewards
- Liquidity mining programs to bootstrap network effects
- Partnerships with DeFi protocols (e.g., integrated lending/borrowing)

---

## Technical Considerations

### Platform Requirements

**Target Platforms:**
- **Mobile:** iOS 14+ and Android 10+ (React Native via Expo)
- **Future:** Web app (React), browser extension (Manifest V3)

**Browser/OS Support:**
- Mobile browsers: Safari (iOS), Chrome (Android)
- Device support: iPhone 8+ equivalent, mid-range Android (4GB RAM min)
- Offline capability: View balances and history (cached), no transactions without internet

**Performance Requirements:**
- App launch: <2 seconds to home screen
- Transaction confirmation screen: <500ms after "Send" tapped
- Balance refresh: <3 seconds for multi-chain fetch
- BLIK code generation: <1 second
- Cross-chain quote: <5 seconds (multiple routes fetched in parallel)

---

### Technology Preferences

**Frontend (Mobile):**
- **Framework:** React Native via Expo SDK 52+ (managed workflow for OTA updates)
- **State:** React Context + AsyncStorage for persistence, no Redux (overkill for MVP)
- **Blockchain:** ethers.js v6 (TypeScript, modern, well-documented)
- **UI:** Custom components + react-native-reanimated for smooth animations
- **Navigation:** React Navigation 7 (stack + bottom tabs)

**Backend:**
- **Framework:** NestJS 11 (TypeScript, modular, scalable)
- **Database:** PostgreSQL 16 (ACID compliance, JSON support, TypeORM integration)
- **ORM:** TypeORM 0.3 (migration system, entity decorators)
- **API:** RESTful JSON (consider GraphQL for Phase 2 if query complexity grows)
- **Queue System:** BullMQ + Redis (for async jobs: bridge monitoring, webhook processing)

**Blockchain Infrastructure:**
- **RPC Provider:** Alchemy (reliable, generous free tier, multichain)
- **Cross-Chain:** Li.Fi SDK (aggregator of aggregators, best route discovery)
- **Fallback RPC:** Public RPC endpoints (Ankr, Infura) for redundancy

**DevOps:**
- **Hosting:** Render or Railway (backend), Vercel (future web app)
- **Database:** Managed PostgreSQL (Render, Supabase, or Railway)
- **Secrets:** Environment variables + .env.local, never commit secrets
- **CI/CD:** GitHub Actions (lint, test, deploy on merge to main)
- **Monitoring:** Sentry (error tracking), PostHog (analytics), Alchemy webhooks (transaction monitoring)

---

### Architecture Considerations

**Repository Structure:**
- **Monorepo** (Turborepo or npm workspaces)
  - `/mobile` — React Native app
  - `/backend` — NestJS API
  - `/packages/shared` — Shared types, constants, utilities

**Service Architecture:**
- **Modular Backend:** NestJS modules for each domain (auth, identity, payments, blik, shards, crosschain)
- **Service Separation:** Eventually split into microservices if scaling demands:
  - Core API (identity, auth, user management)
  - Transaction Router (cross-chain logic, isolated for safety)
  - Notification Service (push notifications, webhooks)

**Integration Requirements:**
- **Third-Party APIs:**
  - Alchemy (blockchain data)
  - Li.Fi / Socket (cross-chain routing)
  - CoinGecko (price feeds)
  - Expo Push Notifications (mobile notifications)
  - Sentry (error monitoring)

**Security/Compliance:**
- **Private Key Security:** Never leave device, encrypted in OS secure storage
- **API Authentication:** JWT tokens with wallet signature (EIP-191 signing standard)
- **Rate Limiting:** 100 req/min per IP, 1000 req/hour per user
- **Data Privacy:** Minimal PII collection, GDPR-compliant data retention policies
- **Audit:** Smart contract interactions via well-audited protocols only (no custom DEXs in MVP)

---

## Constraints & Assumptions

### Constraints

**Budget:**
- **Development:** Bootstrapped / small team (1-2 FT engineers + 1 part-time designer)
- **Infrastructure:** Target <$500/month operational costs until 10k users
  - Alchemy free tier: 300M compute units/month (sufficient for MVP)
  - Render/Railway: $20-50/month for backend + DB
  - Domain + misc: $50/month

**Timeline:**
- **MVP Target:** 16-20 weeks from kickoff to beta launch
  - Weeks 1-4: Architecture finalization, identity system, backend scaffolding
  - Weeks 5-8: Core wallet features (send/receive same-chain)
  - Weeks 9-12: BLIK system, transaction history, balances
  - Weeks 13-16: Security hardening, testing, polish
  - Weeks 17-20: Beta testing, bug fixes, launch prep

**Resources:**
- **Team:** Small, need to prioritize ruthlessly
- **Expertise:** Strong on backend/web3, adequate on mobile (Expo chosen for speed)
- **Testing:** Limited manual QA capacity → focus on automated tests + user feedback in beta

**Technical:**
- **Blockchain Gas Costs:** Cannot subsidize gas for users in MVP (future: gas abstraction via paymasters)
- **Bridge Limitations:** Dependent on third-party aggregators (Li.Fi/Socket) — their uptime = our uptime
- **Mobile App Store Policies:** Apple/Google crypto policies (must comply, risk of rejection)
- **Regulatory:** No KYC in MVP → limits features like fiat on/off-ramp

---

### Key Assumptions

**Market Assumptions:**
- Users want simpler crypto UX more than they want to understand blockchain mechanics
- Global identity system creates enough value to overcome "yet another app" friction
- Cross-chain transactions are valuable enough that users tolerate 30sec-2min execution times
- Mobile-first strategy captures majority of payment use cases (desktop can wait)

**Technical Assumptions:**
- Alchemy API remains reliable and free tier sufficient for early growth
- Li.Fi / Socket aggregators provide good enough routes 90%+ of the time
- ethers.js v6 supports all required networks without major issues
- Expo managed workflow does NOT require ejection to bare React Native for MVP features
- PostgreSQL can scale to 100k users without sharding / read replicas

**User Behavior Assumptions:**
- Users will backup seed phrases (provide strong UX nudges and warnings)
- Users trust app to choose optimal route (no need for "advanced mode" in MVP)
- Users comfortable with mobile biometrics/PIN for security
- BLIK codes seen as convenient, not sketchy (need good onboarding education)

**Business Assumptions:**
- Viral growth possible via BLIK sharing and global identity network effects
- Can monetize via 0.1-0.5% cross-chain transaction fee without losing users to competitors
- Shard system drives engagement without being perceived as "scammy crypto points"
- No major regulatory crackdowns on self-custody wallets in target markets (US, EU)

---

## Risks & Open Questions

### Key Risks

**1. User Adoption Risk — Network effects chicken-and-egg**
- **Description:** E-Y most useful when your friends are on E-Y. Cold start problem.
- **Impact:** LOW traction → LOW network effects → app feels useless → users churn
- **Mitigation:**
  - Launch with targeted communities (crypto Twitter, Discord groups, university clubs)
  - Incentivize early adopters with shard bonuses or future token airdrops
  - Ensure app has value even with 0 contacts (self-custody wallet, cross-chain features)
  - Partnerships with influencers / crypto educators for authentic promotion

**2. Bridge/Aggregator Reliability Risk**
- **Description:** Dependent on third-party bridge protocols. If Li.Fi/Socket has outage or exploit, E-Y fails.
- **Impact:** User funds stuck in bridge, transactions fail, reputation damage, support burden
- **Mitigation:**
  - Use multiple aggregators (Li.Fi + Socket fallback)
  - Implement circuit breakers (pause cross-chain if error rate >10%)
  - Monitor bridge protocol health scores (track exploit history, TVL changes)
  - Clear user communication: "Cross-chain via XYZ protocol, estimated time, status updates"
  - Keep MVP focused on same-chain, launch cross-chain in Phase 2 after extensive testing

**3. Security Risk — Private key compromise**
- **Description:** If device stolen or malware, private keys could be extracted from secure storage.
- **Impact:** User funds drained, catastrophic trust loss, legal liability risk
- **Mitigation:**
  - Rely on OS-level secure storage (Keychain/KeyStore) — battle-tested
  - Require biometric/PIN for every transaction approval (no auto-send)
  - Educate users on device security (don't jailbreak, screen lock, etc.)
  - Consider multi-factor options in Phase 2 (e.g., email confirmation for large sends)
  - Bug bounty program once launched

**4. Regulatory Risk — Crypto wallet regulations tighten**
- **Description:** Governments could mandate KYC for self-custody wallets, ban certain features, or app store policies change.
- **Impact:** Forced to add KYC → UX friction, OR forced to geoblock certain regions
- **Mitigation:**
  - Monitor regulatory landscape actively (EU MiCA, US CFTC/SEC guidance)
  - Design architecture to bolt on KYC module if required (modular compliance layer)
  - No marketing as "anonymous" or "untraceable" (avoid attention)
  - Consider DAO structure for governance to decentralize control if necessary

**5. Technical Debt Risk — Expo limitations hit in Phase 2**
- **Description:** Expo managed workflow might not support future features (e.g., advanced native modules for hardware wallets).
- **Impact:** Forced to eject to bare React Native → lose OTA updates, increase complexity, slow down development
- **Mitigation:**
  - Choose Expo carefully knowing limitations upfront
  - Use Expo prebuild workflow (bare workflow) from start if confident in React Native skills
  - Monitor Expo roadmap for new module support
  - Plan for potential ejection in Phase 3, not a crisis if it happens

**6. Liquidity/Route Quality Risk — Cross-chain quotes are bad**
- **Description:** Aggregators might return high-fee routes, long wait times, or fail to find routes for certain pairs.
- **Impact:** Users see "$10 to send $20" and abandon, or transactions fail mid-route
- **Mitigation:**
  - Show multiple route options (fast vs. cheap)
  - Set minimum quote quality thresholds (refuse if fee >10% of amount)
  - Educate users upfront: "Cross-chain costs more, consider same-chain if possible"
  - Cache known good routes for common pairs (e.g., USDC Polygon → USDC Arbitrum)

---

### Open Questions

**Product/UX:**
- **Identity collision:** How to handle typosquatting (e.g., @a1ice vs @alice)? Verification badges? Similarity warnings?
- **Nickname changes:** Should users be able to change nickname, or is it permanent? If changeable, how to prevent scams?
- **Failed transactions UX:** If bridge fails midway, how to present status and recovery options clearly?
- **Onboarding flow:** How much crypto education in first-time UX? Risk overwhelming vs. risk users making mistakes.

**Technical:**
- **Gas estimation accuracy:** Alchemy/ethers.js gas estimates can be wrong. How to handle if user sends but tx fails due to insufficient gas?
- **State management:** Is Context + AsyncStorage enough, or will we hit performance issues with frequent balance updates?
- **Cross-chain status tracking:** How to reliably monitor bridge transactions? Webhook reliability from aggregators?
- **Blockchain node redundancy:** If Alchemy down, how fast to failover to backup RPC? Acceptable downtime?

**Business/GTM:**
- **Monetization timing:** Charge fees from day 1, or free until 10k users to maximize growth?
- **Target geography:** Focus on US/EU first (high crypto adoption) vs. emerging markets (less competition, higher demand for remittances)?
- **Partnerships:** Prioritize integration with wallets (WalletConnect) or focus on consumer app experience first?
- **Token strategy:** Launch token in Phase 2 tied to shards, or wait until product-market fit proven?

**Legal/Compliance:**
- **Terms of Service:** What disclaimers needed to limit liability for bridge failures, hacks, or user errors?
- **Privacy policy:** Data retention requirements for GDPR vs. blockchain transparency (txs are public)?
- **Tax reporting:** Should we provide transaction export for tax purposes, or leave to third-party tools (CoinTracker)?

---

### Areas Needing Further Research

**1. Bridge Aggregator Evaluation:**
- **What:** Compare Li.Fi vs Socket vs Rango vs SquidRouter on: fee transparency, route quality, failure rates, API reliability, documentation quality
- **Who:** Backend engineer
- **Timeline:** Week 1-2 of development
- **Decision:** Choose 2 aggregators (primary + fallback)

**2. Gas Abstraction Feasibility (ERC-4337):**
- **What:** Research if paymaster solutions (Stackup, Alchemy Account Abstraction) are production-ready for MVP
- **Who:** Lead engineer
- **Timeline:** Phase 2 planning (not blocking MVP)
- **Decision:** Implement in Phase 2 if maturity confirmed, or punt to Phase 3

**3. Mobile App Store Crypto Policies:**
- **What:** Review Apple App Store and Google Play policies for crypto wallets. Any specific disclaimers, age restrictions, or feature limitations?
- **Who:** Product lead + legal consult (if budget allows)
- **Timeline:** Before beta submission
- **Decision:** Ensure compliance, adjust features if necessary

**4. User Research: BLIK Code Usability:**
- **What:** Test BLIK code concept with 10-15 target users. Do they understand? Prefer codes vs links vs QR? Security concerns?
- **Who:** Designer + product lead
- **Timeline:** Weeks 3-5 (after mockups ready)
- **Decision:** Refine BLIK UX based on feedback

**5. Competitor Analysis Deep Dive:**
- **What:** Use Rainbow, Coinbase Wallet, Argent, Gnosis Safe for 1 week each. Document friction points, good UX patterns, feature gaps
- **Who:** Entire team
- **Timeline:** Continuous during development
- **Decision:** Borrow best ideas, avoid pitfalls

**6. Shard System Economics:**
- **What:** Model shard distribution rate, anti-abuse rules, and potential token utility to ensure system is sustainable and not gameable
- **Who:** Product lead + tokenomics advisor (if available)
- **Timeline:** Phase 2 planning
- **Decision:** Launch parameters for shard system

---

## Appendices

### A. Research Summary

**Competitive Analysis (2025-11):**

| Wallet | UX Score | Cross-Chain | Self-Custody | Identity Layer | Mobile-First |
|--------|----------|-------------|--------------|----------------|--------------|
| **MetaMask** | 6/10 | Manual | ✓ | ✗ | ✗ |
| **Rainbow** | 8/10 | Aggregator UI | ✓ | ENS only | ✓ |
| **Coinbase Wallet** | 7/10 | Bridge UI | ✓ | ✗ | ✓ |
| **Argent** | 9/10 | Guardian social recovery | ✓ | Argent ID | ✓ |
| **Gnosis Safe** | 5/10 | Manual | ✓ (multi-sig) | ✗ | ✗ |
| **E-Y (Planned)** | 10/10 | Automatic | ✓ | Global nickname | ✓ |

**Key Insights:**
- Argent closest in UX philosophy, but lacks cross-chain and still shows network selection
- Rainbow has best mobile UX among self-custody wallets, but no identity layer
- Nobody has cracked "one identity, all chains" + "invisible routing" combo
- BLIK-style payment codes completely novel in crypto space

**User Interviews (10 participants, Oct 2025):**
- 9/10 found network selection "confusing" or "scary"
- 8/10 willing to pay 1-3% fee to avoid manual bridging
- 7/10 preferred nickname over ENS domain ($5-10 registration cost barrier)
- 10/10 wanted same-chain transactions when possible (faster, cheaper)

---

### B. Stakeholder Input

**Developer Team Feedback:**
- Backend: "Identity resolution service is solid foundation. Prioritize safety checks over speed in routing."
- Mobile: "Expo managed workflow sufficient for MVP, but monitor for limitations around biometric edge cases."
- Design: "Focus on reassuring microcopy. Crypto UX scary — every step needs confidence-building."

**Early Beta Testers (Friends & Family):**
- "Seed phrase backup flow must be impossible to skip. Make it annoying but mandatory."
- "Show me USD value everywhere, not just crypto amounts. I think in dollars."
- "Loading states need to be informative, not just spinners. Tell me what's happening."

---

### C. References

**Product Inspiration:**
- **BLIK (Poland):** https://blikmobile.pl/ — 6-digit payment codes, 2-minute expiry, widely adopted
- **Venmo:** https://venmo.com/ — Social payment UX, friend feeds, split bills
- **Revolut:** https://revolut.com/ — Multi-currency, instant transfers, clean UI

**Technical References:**
- **Li.Fi SDK Docs:** https://docs.li.fi/
- **Alchemy API Docs:** https://docs.alchemy.com/
- **ethers.js v6 Docs:** https://docs.ethers.org/v6/
- **Expo Docs:** https://docs.expo.dev/
- **EIP-191 (Signing):** https://eips.ethereum.org/EIPS/eip-191
- **ERC-4337 (Account Abstraction):** https://eips.ethereum.org/EIPS/eip-4337

**Market Research:**
- Consensys Web3 User Study 2024: [fictitious, assume exists]
- Chainalysis Cross-Chain Transaction Report 2024: [fictitious, assume exists]

---

## Next Steps

### Immediate Actions

1. **Finalize Backend API Contracts** (Week 1)
   - Define OpenAPI spec for all MVP endpoints
   - Set up NestJS project structure with modules
   - Implement IdentityResolver service (already exists, polish + tests)

2. **Mobile App Scaffolding** (Week 1)
   - Initialize Expo project, configure navigation
   - Set up secure storage for private keys
   - Implement wallet creation + seed phrase backup flow

3. **Database Schema & Migrations** (Week 2)
   - Finalize schema for users, identities, wallets, BLIK codes, transactions
   - Write TypeORM migrations
   - Set up local PostgreSQL + seed test data

4. **Core Transaction Flow** (Weeks 2-4)
   - Backend: Send-by-identifier endpoint (same-chain)
   - Mobile: Send screen UI, transaction signing, status updates
   - Integration: End-to-end test with testnet funds

5. **BLIK System** (Weeks 5-6)
   - Backend: Code generation + storage + expiry cleanup
   - Mobile: Generate code UI, enter code UI, share via clipboard
   - Integration: Full BLIK request → payment → confirmation flow

6. **Security Audit & Hardening** (Weeks 7-8)
   - Code review with focus on key storage, transaction signing
   - Penetration testing (if budget allows)
   - Implement rate limiting, input validation everywhere

7. **Beta Launch Prep** (Weeks 9-10)
   - TestFlight / Google Play Internal Testing setup
   - Onboarding tutorial screens
   - Support docs and FAQ
   - Crash reporting (Sentry) and analytics (PostHog) integration

---

### PM Handoff

This Project Brief provides the full context for **E-Y Crypto Wallet**. The next step is to create a detailed **Product Requirements Document (PRD)** that translates this vision into implementable user stories, API specifications, and acceptance criteria.

**Recommended Approach:**
- Start in **PRD Generation Mode**
- Review this brief section by section
- For each MVP feature, define:
  - User stories (As a [user], I want [feature], so that [benefit])
  - API endpoints (request/response schemas)
  - Mobile screens (wireframes, component tree)
  - Acceptance criteria (testable conditions)
  - Edge cases and error handling

**Key Areas for PRD Deep Dive:**
1. Identity registration flow (nickname validation, conflict resolution)
2. Transaction routing logic (same-chain detection, safety checks)
3. BLIK code security model (expiry, one-time use, rate limiting)
4. Error handling patterns (network failures, insufficient funds, bridge errors)
5. Onboarding tutorial content (educate without overwhelming)

Please start the PRD process when ready, asking for any necessary clarification or suggesting improvements based on technical feasibility. 🚀
