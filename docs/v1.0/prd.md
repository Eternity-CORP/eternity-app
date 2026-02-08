---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments: ['docs/v1.0/product-brief.md', 'docs/research/market-research.md', 'docs/research/brainstorming-session.md']
workflowType: 'prd'
lastStep: 11
documentCounts:
  briefs: 1
  research: 2
  brainstorming: 1
  projectDocs: 0
date: '2026-01-11'
author: 'Daniel'
project_name: 'E-Y'
workflow_status: 'COMPLETED'
---

# Product Requirements Document - E-Y

**Author:** Daniel
**Date:** 2026-01-11
**Version:** 1.0 MVP

---

## Executive Summary

**E-Y** is the first crypto wallet ecosystem designed to feel intuitive from day one. In a world where crypto remains "technology for techies," E-Y removes fear and complexity by bringing radical simplicity to blockchain — starting with bank-like UX and evolving into a comprehensive financial ecosystem.

### The Problem

Crypto scares regular people away. This isn't just inconvenience — it's **fear**:
- Fear of sending to the wrong network and losing everything forever
- Fear of not understanding interfaces filled with unfamiliar terms
- Fear that "crypto isn't for me"

**Consequence:** Mass crypto adoption is blocked not by technology, but by UX.

### The Solution: Four Pillars

1. **BLIK-style codes** (world's first in crypto)
   - 6-digit code instead of address
   - Valid for 2 minutes
   - "Give code — receive money"

2. **Network Abstraction**
   - Users see "USDC", not "USDC (Polygon)"
   - System auto-selects optimal route
   - Pro mode available for power users

3. **SHARD Identity** (post-MVP)
   - NFC passport → unique crypto identity
   - 1.4B+ NFC passports vs ~2000 Orbs globally
   - Scan at home, don't hunt for Orbs

4. **AI Financial Agent**
   - Proactive notifications ("Gas is cheap — time for that swap!")
   - Customizable personality
   - Full financial management via chat

### What Makes This Special

No competitor combines all four pillars. Research confirms:
- **BLIK-style codes**: Zero crypto equivalents exist — first mover opportunity
- **Chain Abstraction**: Clear market trend, E-Y approach is sound
- **NFC Identity**: Technology mature, EU eIDAS 2.0 regulatory support
- **AI Agent**: Differentiated by proactive + personality features

**The "aha!" moment:** *"Wait... I just gave 6 digits and the money arrived? No addresses? This just works!"*

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Technical Type** | Mobile App (React Native + Expo) + Blockchain/Web3 |
| **Domain** | Fintech (payments, crypto wallets, transactions) |
| **Complexity** | HIGH — regulatory requirements, security, cross-chain |
| **Project Context** | Greenfield — new project |

### Why Now (2026)

- Post-FTX: people want self-custody without complexity
- Chain abstraction tech is mature (Particle, Abstract)
- AI became affordable (GPT-4o-mini, Whisper)
- EU eIDAS 2.0 legalized NFC passport verification for private entities

### Market Opportunity

- **Market Size:** $12-15B (2025), growing 25-30% CAGR
- **Active Wallets:** 820M+ globally
- **Mobile Users:** 65%+ of all crypto users
- **Key Gap:** No wallet combines BLIK + chain abstraction + accessible identity + AI agent

---

## Success Criteria

### North Star Metric

**"Successful BLIK transactions per week"** — combines UX quality, real usage, and viral potential in one measurable outcome.

### User Success

| User Type | Success Indicator | Measurement |
|-----------|-------------------|-------------|
| **Newcomer (Oksana)** | Completes first transaction without fear | < 3 min onboarding, no support needed |
| **Recipient (Andrey)** | Receives payment via BLIK | < 2 minutes end-to-end |
| **Power User (Max)** | Recommends E-Y to friends | NPS > 50, referral rate > 20% |
| **Security-First (Igor)** | Verifies code, approves architecture | Public audit, positive security reviews |

**The "Aha!" Moment:** User says *"Wait... I just gave 6 digits and the money arrived? No addresses? This just works!"*

### Business Success

| Phase | Timeline | Goal | Validation |
|-------|----------|------|------------|
| **EthCC Demo** | MVP | Working prototype | "Wow" reactions, investor interest |
| **Beta Launch** | +1 month | 100 active wallets | Viral loop working |
| **Growth** | +3 months | 1,000 active wallets | Organic growth, positive reviews |
| **Scale** | +12 months | 50,000+ wallets | Ecosystem partnerships |

### Technical Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Transaction Success Rate** | > 99% | Funds must never be lost |
| **BLIK Code Resolution** | < 500ms | Instant feel for users |
| **App Crash Rate** | < 0.1% | Trust requires stability |
| **Testnet Coverage** | 100% features | MVP must be fully functional |

### Key Tracking Metrics

- **Activation:** % completing first transaction
- **Retention:** D7 return rate
- **Virality:** BLIK codes sent to new users
- **Satisfaction:** "Would recommend" score (NPS)

---

## Product Scope

### MVP - Minimum Viable Product (Testnet)

**Wallet Core:**
- Create wallet (seed phrase with clear explanation)
- Import wallet (seed phrase)
- Multi-account support (1 seed → multiple accounts)
- View balances (tokens + USD equivalent)

**Transfers:**
- Send to address (standard EVM transfer)
- Send to @username (centralized mapping)
- Receive (address, QR code, @username)
- **BLIK Code Payment** — 6-digit codes for instant P2P transfers (killer feature)

**UX Foundation:**
- Network abstraction (users see tokens, not chains)
- Token-first UI ("USDC" not "USDC Polygon")
- Polished UI design (not placeholder)

**Feature Overlays:**
- Contact Book (save frequent recipients)
- Scheduled Payments (recurring transfers)
- Split Bill (request payments from multiple people)

**MVP Success Criteria:**

| Criterion | Definition of Success |
|-----------|----------------------|
| Works on testnet | All features functional on Ethereum Sepolia |
| BLIK demo ready | Can demonstrate at EthCC, get "wow" reactions |
| 10 beta testers | Real people using without assistance |
| No critical bugs | Funds safe, UX doesn't break |

### Web Application

E-Y includes a full-featured web application providing feature parity with the mobile app:

- **Technology**: Next.js 16, React 19, Tailwind CSS v4, ethers.js v6
- **Interface**: AI-first design with dark glass-morphism theme
- **Features**: All wallet operations (create, import, send, receive, swap, BLIK), AI chat with Claude, multi-account support, username management, token details, contacts, scheduled payments, split bills
- **Routes**: 23 pages covering onboarding, wallet management, AI chat, and settings
- **State Management**: React Context (AccountContext, BalanceContext) — not Redux
- **URL**: https://e-y-app.vercel.app

### Growth Features (Post-MVP)

| Feature | Rationale |
|---------|-----------|
| **Cross-chain bridges** | Same-chain first, cross-chain later |
| **Swap integration** | After basic transfers work |
| **Pro mode** | Default simplicity first |
| **EVM Mainnet** | After testnet validation |

### Vision (Future)

| Phase | Features | Status |
|-------|----------|--------|
| **v1.x Current** | AI Agent (Claude), Proactive alerts, Web App, Multi-network, Swap | Implemented |
| **v2.0 Intelligence** | Voice commands, Statistics, Advanced AI autonomy | Planned |
| **v3.0 Identity** | SHARD (NFC), Decentralized @username, Virtual cards, Multi-ecosystem | Planned |

**Evolution Philosophy:** E-Y grows with its users. Each phase adds value without breaking what works.

---

## User Journeys

### Journey 1: Max — Bringing Friends to Crypto

Max is a 34-year-old IT professional who's been in crypto since 2017. He uses MetaMask, Trust Wallet, and various DEXes daily. His friends constantly ask him "how do I get into crypto?" but he never had a good answer — every wallet he recommends requires explaining addresses, networks, and gas fees. He's tired of being tech support.

One evening, Max discovers E-Y and decides to test it. The next morning, his colleague Oksana mentions she wants to try crypto but is scared. Instead of his usual 30-minute explanation, Max opens E-Y, taps "Send via BLIK", and generates a 6-digit code: **847291**.

"Here, download E-Y and enter this code. I'm sending you $10 in USDC."

Oksana downloads the app, creates a wallet (seed phrase explanation is actually clear!), enters the code, and... the money is there. No addresses. No "which network?" questions. Just money.

Max realizes he finally has a wallet he can recommend to everyone — his mom, his colleagues, even his tech-skeptical friends. He becomes E-Y's biggest advocate, sending BLIK codes to everyone who asks about crypto.

**Journey reveals requirements for:**
- BLIK code generation (sender side)
- Simple onboarding flow
- Clear seed phrase explanation
- @username setup (optional)
- Network abstraction (USDC just works)

---

### Journey 2: Oksana — First Crypto Without Fear

Oksana is a 28-year-old marketing specialist. She uses Monobank for everything and loves its simple UX. Her friends talk about crypto gains, but every time she tried MetaMask, she got overwhelmed by "networks", "gas", and addresses that looked like someone smashed a keyboard.

When Max sends her a BLIK code, she's skeptical but curious. She downloads E-Y, and the onboarding feels... familiar. Like Monobank. The seed phrase explanation actually makes sense — "these 12 words are your bank password, write them down and never share."

She enters Max's code: **847291**. Three seconds later, $10 USDC appears in her wallet. No addresses. No network selection. No panic attack.

"Wait... that's it? I have crypto now?"

Over the next week, Oksana checks her balance daily. She sets up @oksana as her username. When her friend Andrey mentions clients want to pay him in crypto, she excitedly tells him about E-Y.

**Journey reveals requirements for:**
- BLIK code redemption (receiver side)
- Newcomer-friendly onboarding
- Balance display with USD equivalent
- @username registration
- Transaction history

---

### Journey 3: Andrey — Accepting Crypto Payments

Andrey is a 42-year-old English tutor. He's not into crypto — it seems complicated and risky. But last week, a student asked if they could pay in USDC. Andrey has no idea what that even means.

Oksana tells him about E-Y. "Just download it, set up a username, and give your student this code."

Andrey is skeptical but tries it. He creates a wallet, writes down his seed phrase, and sets up @andrey_tutor. When his student asks how to pay, Andrey taps "Receive", generates a BLIK code: **529147**, and sends it via Telegram.

Five minutes later, $50 USDC appears in his wallet. He didn't have to understand "Polygon" or "Ethereum" — he just shared a 6-digit code.

"That was easier than PayPal. Why didn't someone make this before?"

Andrey now accepts crypto from three students. He's thinking about scheduling recurring payments for his regular clients.

**Journey reveals requirements for:**
- Receive via BLIK (generate code for receiving)
- @username for repeat payments
- Receive via QR code (alternative)
- Scheduled payments feature
- Contact book (save frequent payers)

---

### Journey 4: Igor — The Security Validator

Igor is a 31-year-old DevOps engineer who keeps his crypto in cold storage. He trusts no one and reads code before using any wallet. When friends ask "is X wallet safe?", they trust his judgment.

Max tells Igor about E-Y. Igor's first reaction: "Another wallet? Let me check the code."

He finds E-Y's GitHub repo (it's open source). He reads the wallet generation code — standard BIP-39, no server calls. He checks how BLIK codes work — symmetric encryption, codes expire in 2 minutes, funds never leave the blockchain. He reviews the architecture — no custody, no tracking, just a clean mobile client.

After three hours of code review, Igor messages Max: "It's clean. The architecture is solid. I can recommend this."

His approval becomes social proof. When Oksana asks "is this safe?", Max says "Igor checked the code. It's good." That's enough.

**Journey reveals requirements for:**
- Open source codebase
- Clear security documentation
- No server-side custody
- Transparent architecture
- Audit-friendly code structure

---

### Journey 5: Beta Tester — EthCC Demo Participant

Alex is a crypto enthusiast attending EthCC 2026. He stops by E-Y's booth, intrigued by the "BLIK for crypto" pitch. The demo operator generates a BLIK code and says "Download the app, enter this code, get $5 in testnet USDC."

Alex completes the flow in under 2 minutes. He's impressed — no MetaMask popups, no network switching, just... money appearing.

"Can I send this to my friend?"

He generates his own BLIK code and sends it to his friend across the conference hall. The friend receives the funds. They both laugh at how simple it was.

Alex signs up for the beta program. He becomes one of the first 10 testers, providing feedback that shapes E-Y's mainnet launch.

**Journey reveals requirements for:**
- Testnet mode (Sepolia)
- Demo-friendly flow (< 2 min complete)
- Beta signup mechanism
- Feedback collection
- User-to-user BLIK transfers

---

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| **Max (Power User)** | BLIK send, referral flow, network abstraction |
| **Oksana (Newcomer)** | BLIK receive, onboarding, @username, balance view |
| **Andrey (Recipient)** | BLIK receive for payments, scheduled payments, contacts |
| **Igor (Validator)** | Open source, security docs, audit-friendly architecture |
| **Beta Tester** | Testnet mode, demo flow, feedback mechanism |

**Core Capabilities from All Journeys:**
- BLIK code generation and redemption
- Wallet creation with clear seed phrase UX
- @username registration and lookup
- Network abstraction (users never see chains)
- Balance display with fiat equivalent
- Transaction history
- Contact book
- Scheduled payments
- Testnet support for demo/beta

---

## Domain-Specific Requirements

### Fintech & Crypto Compliance Overview

E-Y operates in the intersection of **fintech** and **crypto/Web3** domains — both highly regulated. While MVP (testnet) has minimal regulatory burden, mainnet launch and scaling require comprehensive compliance planning.

**Domain Complexity:** HIGH
**Regulatory Jurisdictions:** EU (primary), US (secondary), Global (future)

### Current State: MVP (Testnet)

| Requirement | MVP Status | Rationale |
|-------------|------------|-----------|
| KYC/AML | Not required | Testnet tokens have no value |
| PCI DSS | Not applicable | No fiat payments |
| Crypto licensing | Not required | No custodial services |
| Data protection | Basic (GDPR-aware) | User data minimal |
| Security audit | Recommended | Build trust early |

**MVP Security Approach:**
- Self-custody only (no server holds funds)
- Open source code (community audit)
- Standard BIP-39 wallet generation
- No personal data collection beyond @username

### Future Requirements: Mainnet & Scale

#### Crypto-Specific Regulations

| Regulation | Jurisdiction | Impact on E-Y | When Needed |
|------------|--------------|---------------|-------------|
| **MiCA** (Markets in Crypto-Assets) | EU | May require registration for @username service | v1.0 Mainnet |
| **Travel Rule** | Global | BLIK transfers > €1000 may need sender/receiver info | Scale phase |
| **5AMLD/6AMLD** | EU | AML requirements if deemed "obliged entity" | If adding fiat |
| **State MTL** | US | Money transmitter licenses per state | US expansion |

**E-Y Mitigation Strategy:**
- Self-custody = not a custodian = reduced regulatory scope
- BLIK codes are P2P = no intermediary holding funds
- @username mapping is convenience, not custody
- SHARD identity can enable compliance when needed

#### Security Architecture Requirements

| Component | MVP | Mainnet | Scale |
|-----------|-----|---------|-------|
| **Wallet Security** | BIP-39, local storage | + Biometric auth | + Hardware wallet support |
| **BLIK Security** | 2-min expiry, encryption | + Rate limiting | + Fraud detection |
| **Code Audit** | Open source | Professional audit | Ongoing bug bounty |
| **Infrastructure** | Minimal backend | Redundant servers | Multi-region |

**Security Principles (All Phases):**
- Never store private keys on servers
- Never transmit seed phrases
- Encrypt all sensitive data at rest
- Use secure enclaves where available (iOS Keychain, Android Keystore)

#### Data Protection (GDPR Compliance)

| Data Type | Collected | Storage | User Rights |
|-----------|-----------|---------|-------------|
| **Wallet addresses** | Yes (public) | Local device | Export/delete |
| **@username** | Optional | Centralized server | Delete on request |
| **Transaction history** | Blockchain (public) | Local cache | Clear cache |
| **BLIK codes** | Temporary | Memory only | Auto-expire 2 min |
| **Seed phrase** | Generated | User's responsibility | Never stored |

**GDPR Compliance Checklist:**
- [ ] Privacy policy clearly explaining data handling
- [ ] Right to erasure for @username
- [ ] Data export functionality
- [ ] No analytics without consent
- [ ] No third-party data sharing

#### SHARD Identity Requirements (v3.0)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **NFC Passport Reading** | EU eIDAS 2.0 compliant | Use certified SDK (Didit, ReadID) |
| **Data Storage** | Cryptographic proof only | No biometric storage |
| **Privacy** | Zero-knowledge where possible | Prove uniqueness without revealing identity |
| **Regulatory** | May need identity verification license | Research per jurisdiction |

**SHARD Design Principles:**
- Prove "unique human" without storing identity
- User controls when to reveal verification status
- No central database of verified identities
- Cryptographic attestations, not stored data

### Compliance Roadmap

```
MVP (Testnet)          v1.0 (Mainnet)         v2.0+ (Scale)
─────────────────────────────────────────────────────────────
□ Open source          □ Security audit       □ Bug bounty program
□ Basic privacy        □ GDPR full compliance □ Travel Rule ready
□ Self-custody only    □ Terms of Service     □ Regional licenses
                       □ Legal review         □ SHARD compliance
                       □ @username ToS        □ Institutional grade
```

### Key Domain Concerns Addressed

| Concern | E-Y Approach |
|---------|--------------|
| **Regional compliance** | Start EU (MiCA-aware), expand carefully |
| **Security standards** | Open source + professional audit before mainnet |
| **Audit requirements** | Audit-friendly code structure from day 1 |
| **Fraud prevention** | BLIK expiry, rate limiting, monitoring |
| **Data protection** | Minimal data collection, GDPR-by-design |
| **Crypto regulations** | Self-custody focus reduces regulatory scope |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

E-Y introduces **four distinct innovation patterns** that together create a unique market position. No competitor combines all four.

#### Innovation 1: BLIK-Style Codes for Crypto (World's First)

**What:** 6-digit temporary codes (valid 2 minutes) for P2P crypto transfers
**Why Novel:** Zero crypto-native BLIK equivalents exist globally

| Current Approach | E-Y Innovation |
|------------------|----------------|
| Share 42-character address | Share 6-digit code |
| Verify network compatibility | System handles routing |
| Copy-paste or QR scan | Voice-shareable code |
| Permanent address exposure | Ephemeral, expires |

**Research Validation:** Market research (2026-01-11) found no competing implementation when searching "BLIK crypto wallet", "6-digit code crypto payment", "temporary code P2P crypto".

**First Mover Advantage:** Opportunity to define the standard for code-based crypto transfers.

#### Innovation 2: True Network Abstraction (UX-First)

**What:** Users see tokens ("USDC"), never chains ("USDC on Polygon")
**Why Novel:** Most "chain abstraction" is technical — E-Y's is experiential

| Technical Chain Abstraction | E-Y UX Abstraction |
|-----------------------------|-------------------|
| Unified accounts across chains | User never knows chains exist |
| Backend routing optimization | "USDC" as the only concept |
| Developer-focused | End-user focused |

**Differentiation:** Particle, Abstract, NEAR focus on technical infrastructure. E-Y focuses on user experience — making chains invisible to normal users.

#### Innovation 3: SHARD — Accessible Human Verification

**What:** NFC passport scan → unique crypto identity (World App Orb alternative)
**Why Novel:** 1.4B+ NFC passports vs ~2000 Orbs globally

| World App Orb | E-Y SHARD |
|---------------|-----------|
| Physical device, limited locations | Your passport, at home |
| Iris biometric (privacy concerns) | Cryptographic proof only |
| Requires travel to Orb | Instant, anywhere |
| Hardware infrastructure cost | Zero marginal cost |

**Regulatory Enabler:** EU eIDAS 2.0 (2025) legalized NFC passport verification for private entities — perfect timing.

#### Innovation 4: Proactive AI Financial Agent

**What:** AI that acts proactively, not just responds; with customizable personality
**Why Novel:** Existing crypto AI = chatbots. E-Y AI = autonomous agent.

| Existing Crypto AI | E-Y AI Agent |
|-------------------|--------------|
| Respond to commands | Proactive alerts ("Gas is cheap!") |
| Generic persona | Customizable personality |
| Query-only | Can execute transactions |
| Isolated | Context-aware (knows your habits) |

**Market Gap:** TOMI has voice commands, Plena has text trading — none have proactive + personality + autonomy.

**Implementation Status:** LIVE — Claude-powered AI with 8 tools (balance, send, history, contacts, scheduled, BLIK generate, BLIK lookup, swap), intent parser, proactive suggestions, and security layer (rate limiter, audit logger). Available on both mobile and web.

### Validation Approach

| Innovation | Validation Method | Success Signal |
|------------|-------------------|----------------|
| **BLIK codes** | EthCC demo reactions | "Wow, that's it?" |
| **Network abstraction** | Beta tester confusion rate | Zero "which network?" questions |
| **SHARD** | User research (post-MVP) | Preference over Orb hunting |
| **AI agent** | Engagement metrics (post-MVP) | Proactive suggestions accepted |

### Risk Mitigation

| Innovation | Risk | Mitigation |
|------------|------|------------|
| **BLIK codes** | Competitors copy quickly | First mover + ecosystem effect + patent potential |
| **Network abstraction** | Technical complexity | Use proven bridges (LI.FI), abstract at UI layer |
| **SHARD** | Regulatory uncertainty | Design for compliance, start with optional verification |
| **AI agent** | High expectations | Start simple, iterate based on feedback |

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Mobile Framework** | React Native + Expo (SDK 54) | Cross-platform, rapid development |
| **Web Framework** | Next.js 16 + React 19 | Full-featured web wallet, SSR support |
| **Language** | TypeScript | Type safety, better tooling |
| **State (Mobile)** | Redux Toolkit | Predictable state, devtools |
| **State (Web)** | React Context | Lightweight, built-in React |
| **Blockchain** | ethers.js v6 | Industry standard, well-documented |
| **Backend** | NestJS | @username, BLIK, AI, splits, scheduled |
| **Database** | Supabase (PostgreSQL) | Managed database, real-time, auth |
| **AI** | Claude (Anthropic SDK) | AI chat, tool calling, proactive suggestions |
| **Testnet** | Ethereum Sepolia + Polygon, Base, Arbitrum, Optimism | Multi-network support |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       E-Y MOBILE APP                             │
│                    (Expo SDK 54, React 19)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │  AI Chat  │ │  Wallet   │ │   Send     │ │   Receive     │  │
│  │ (Default) │ │  Module   │ │   Module   │ │   Module      │  │
│  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Feature Overlays + BLIK + Swap               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        E-Y WEB APP                               │
│                  (Next.js 16, React 19)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │  AI Chat  │ │  Wallet   │ │   Send     │ │   Receive     │  │
│  │           │ │  Pages    │ │   Flow     │ │   + BLIK      │  │
│  └───────────┘ └───────────┘ └────────────┘ └───────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Swap + Contacts + Scheduled + Split             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌───────────────┐ │
│  │ @username│ │ BLIK │ │ AI Chat │ │Split │ │  Scheduled    │ │
│  │ Registry │ │ (WS) │ │(Claude) │ │(WS)  │ │  Payments     │ │
│  └──────────┘ └──────┘ └─────────┘ └──────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL) + Blockchain                  │
│         (Ethereum Sepolia, Polygon, Base, Arbitrum, OP)         │
└─────────────────────────────────────────────────────────────────┘
```

### BLIK Code Flow

```
SENDER                          BACKEND                         RECEIVER
  │                                │                                │
  │ 1. Generate BLIK code          │                                │
  │ ──────────────────────────────►│                                │
  │    (amount, token, sender addr)│                                │
  │                                │                                │
  │ 2. Return 6-digit code         │                                │
  │ ◄──────────────────────────────│                                │
  │    (code: 847291, expires 2min)│                                │
  │                                │                                │
  │                                │  3. Enter BLIK code            │
  │                                │ ◄──────────────────────────────│
  │                                │    (code: 847291)              │
  │                                │                                │
  │                                │  4. Return transfer details    │
  │                                │ ──────────────────────────────►│
  │                                │    (amount, token, sender)     │
  │                                │                                │
  │ 5. Notify: receiver confirmed  │                                │
  │ ◄──────────────────────────────│                                │
  │                                │                                │
  │ 6. Sign & send transaction     │                                │
  │ ─────────────────────────────────────────────────────────────► │
  │    (on-chain transfer)         │                                │
  │                                │                                │
  │                                │  7. Transaction confirmed      │
  │                                │ ◄─────────────────────────────│
  │                                │    (on-chain confirmation)     │
```

### Security Architecture

| Component | Security Measure |
|-----------|------------------|
| **Seed Phrase** | Generated locally, never transmitted, stored in secure enclave |
| **Private Keys** | Derived from seed, never leave device |
| **BLIK Codes** | Encrypted, 2-minute expiry, single-use |
| **@username** | No sensitive data, just address mapping |
| **API Communication** | HTTPS, certificate pinning |

---

## Functional Requirements

### FR-1: Wallet Management

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-1.1 | Create new wallet | MUST | User can generate new wallet with BIP-39 seed phrase |
| FR-1.2 | Import wallet | MUST | User can restore wallet from 12/24-word seed phrase |
| FR-1.3 | Multi-account | SHOULD | User can create multiple accounts from single seed |
| FR-1.4 | View balances | MUST | Display token balances with USD equivalent |
| FR-1.5 | Transaction history | MUST | Show all transactions with status and details |

### FR-2: Send Functionality

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-2.1 | Send to address | MUST | Transfer ETH/tokens to valid EVM address |
| FR-2.2 | Send to @username | MUST | Transfer to registered @username |
| FR-2.3 | Send via BLIK | MUST | Generate 6-digit code for receiver to claim |
| FR-2.4 | Gas estimation | MUST | Show estimated gas fee before confirmation |
| FR-2.5 | Transaction confirmation | MUST | Clear confirmation screen before sending |

### FR-3: Receive Functionality

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-3.1 | Show address | MUST | Display wallet address with copy button |
| FR-3.2 | QR code | MUST | Generate QR code for easy scanning |
| FR-3.3 | @username display | SHOULD | Show registered @username for sharing |
| FR-3.4 | BLIK receive | MUST | Generate code for sender to pay |

### FR-4: BLIK Code System

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-4.1 | Code generation | MUST | Generate unique 6-digit code |
| FR-4.2 | Code expiration | MUST | Code expires after 2 minutes |
| FR-4.3 | Code redemption | MUST | Receiver enters code to initiate transfer |
| FR-4.4 | Real-time matching | MUST | Sender notified when code is entered |
| FR-4.5 | Single use | MUST | Code cannot be reused after transaction |

### FR-5: Identity (@username)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-5.1 | Register @username | SHOULD | User can claim unique @username |
| FR-5.2 | Lookup @username | MUST | Resolve @username to wallet address |
| FR-5.3 | Update @username | SHOULD | User can change their @username |

### FR-6: Feature Overlays

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-6.1 | Contact book | SHOULD | Save and manage frequent recipients |
| FR-6.2 | Scheduled payments | COULD | Set up recurring transfers |
| FR-6.3 | Split bill | COULD | Request payments from multiple people |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-1.1 | App launch time | < 2 seconds | Cold start to usable |
| NFR-1.2 | Balance refresh | < 1 second | From pull-to-refresh |
| NFR-1.3 | BLIK code generation | < 500ms | From tap to code display |
| NFR-1.4 | Transaction submission | < 3 seconds | From confirm to submitted |

### NFR-2: Reliability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-2.1 | App crash rate | < 0.1% | Sessions with crashes |
| NFR-2.2 | Transaction success | > 99% | Submitted transactions that confirm |
| NFR-2.3 | BLIK match rate | > 99.9% | Codes that successfully match |

### NFR-3: Security

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR-3.1 | Seed phrase security | Secure enclave storage, never transmitted |
| NFR-3.2 | Private key protection | Never leave device, encrypted at rest |
| NFR-3.3 | Network security | HTTPS only, certificate pinning |
| NFR-3.4 | Code audit readiness | Clean architecture, documented security model |

### NFR-4: Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | Onboarding completion | > 90% of users who start |
| NFR-4.2 | First transaction time | < 3 minutes from install |
| NFR-4.3 | BLIK flow completion | < 2 minutes end-to-end |
| NFR-4.4 | Zero "which network?" | Users never see network selection |

### NFR-5: Compatibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5.1 | iOS support | iOS 14+ |
| NFR-5.2 | Android support | Android 8+ (API 26) |
| NFR-5.3 | Screen sizes | Phone screens (no tablet optimization MVP) |

---

## UI/UX Requirements

### Design Principles

1. **Simplicity First** — Remove complexity, not hide it
2. **Token-Centric** — Users think in tokens, not chains
3. **Confidence Building** — Every action feels safe and reversible
4. **Familiar Patterns** — Bank-like UX (Monobank inspiration)

### Key Screens

#### Home Screen
- Total balance (USD equivalent, prominent)
- Token list with balances
- Quick actions: Send, Receive
- Recent transactions

#### Send Screen
- Unified send flow with tabs: Address | @username | BLIK
- Amount input with USD conversion
- Token selector (network hidden)
- Clear fee display
- Confirmation step

#### Receive Screen
- Tabs: Address | QR | @username | BLIK
- Large, copyable address
- Shareable QR code
- BLIK code generator

#### BLIK Code Display
- Large, readable 6-digit code
- Countdown timer (2 minutes)
- Amount and token shown
- Status updates (waiting → matched → sent → confirmed)

#### Onboarding
- Seed phrase generation with clear explanation
- "Write these down" emphasis
- Verification step (select words)
- Optional @username setup

### Visual Design

| Element | Specification |
|---------|---------------|
| **Primary Color** | To be defined (modern, trustworthy) |
| **Typography** | Clean, readable, system fonts |
| **Icons** | Consistent icon set (Lucide or similar) |
| **Spacing** | Generous padding, touch-friendly targets |
| **Dark Mode** | Support from MVP |

### Accessibility

- Minimum touch target: 44x44 points
- Color contrast: WCAG AA compliant
- Screen reader support: Basic labels
- Font scaling: Respect system settings

---

## Implementation Priorities

### Phase 1: Core Wallet (Week 1-2)

1. Wallet creation/import
2. Balance display
3. Basic send to address
4. Transaction history

### Phase 2: BLIK System (Week 3-4)

1. Backend for BLIK coordination
2. Code generation
3. Code redemption
4. Real-time matching

### Phase 3: Identity & Polish (Week 5-6)

1. @username registration
2. Send to @username
3. UI polish
4. Testing & bug fixes

### Phase 4: Feature Overlays (Week 7-8)

1. Contact book
2. Scheduled payments
3. Split bill
4. EthCC demo preparation

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| BLIK concept doesn't resonate | High | Low | Fallback to @username + QR |
| Technical complexity delays | Medium | Medium | Use proven libraries (ethers.js, LI.FI) |
| Security vulnerability | Critical | Low | Open source, code review, security focus |
| Solo developer bottleneck | High | Medium | Prioritize ruthlessly, MVP only |
| EthCC demo fails | High | Low | Extensive testing, backup demo plan |

---

## Open Questions

1. **BLIK backend hosting** — Where to deploy? (Vercel, Railway, self-hosted?)
2. **@username uniqueness** — Case-sensitive? Character restrictions?
3. **Testnet tokens** — How to fund demo wallets for EthCC?
4. **Push notifications** — Needed for MVP? (BLIK match notification)
5. **Analytics** — Privacy-respecting analytics for MVP?

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **BLIK** | Polish mobile payment system using 6-digit codes |
| **BIP-39** | Bitcoin Improvement Proposal for mnemonic seed phrases |
| **EVM** | Ethereum Virtual Machine (compatible blockchains) |
| **Seed Phrase** | 12/24 words that generate wallet keys |
| **Self-custody** | User holds private keys, not a third party |
| **Testnet** | Test blockchain network with no real value |
| **SHARD** | E-Y's NFC passport identity system (post-MVP) |

### References

- Product Brief: `docs/v1.0/product-brief.md`
- Market Research: `docs/research/market-research.md`
- Brainstorming: `docs/research/brainstorming-session.md`

---

*Document generated: 2026-01-11*
*Status: COMPLETE — Ready for Architecture phase*
