# E-Y — Context for Outreach (Investors, Partners, Grants)

## What This Document Is

This is a comprehensive context document about the E-Y project. Use it to craft personalized outreach emails to investors, accelerators, grant programs, and potential partners. Adapt tone, depth, and focus depending on the recipient.

---

## 1. One-Liner

**E-Y is the first AI-native crypto wallet with BLIK-style 6-digit payment codes — making crypto as easy as sending a text message.**

## 2. The Problem

Crypto scares regular people. This isn't inconvenience — it's **fear**:

- **Fear of irreversible mistakes**: Send to the wrong network, lose everything. No undo button.
- **Fear of complexity**: 42-character addresses, gas fees, network selection, bridges — a UX nightmare.
- **Fear of exclusion**: 8 billion people on Earth, only ~500 million use crypto. Not because the tech isn't there — because the experience isn't.

**The result**: Mass crypto adoption is blocked not by technology, but by UX. People stay with traditional banks even though they want control over their money.

No existing wallet has solved this. MetaMask is for developers. Trust Wallet adds features but doesn't rethink the experience. World App requires finding a physical Orb (only ~2,000 exist globally). Phantom is locked to Solana.

## 3. The Solution: E-Y's Four Pillars

### Pillar 1: BLIK-Style Codes (World's First in Crypto)

Inspired by Poland's BLIK system (used by 80%+ of Polish smartphone owners), E-Y introduces **6-digit temporary codes** for crypto transfers:

- Sender generates a code (e.g., **847291**), valid for 2 minutes
- Receiver enters the code — funds arrive instantly
- No addresses. No QR codes. No "which network?" questions
- Shareable verbally, via text, in person — universally simple

**Critical finding from our market research**: Zero crypto-native BLIK equivalents exist globally. We searched exhaustively — "BLIK crypto wallet", "6-digit code crypto payment", "temporary code P2P crypto" — nothing. This is a genuine first-mover opportunity.

**The "aha!" moment**: *"Wait... I just gave 6 digits and the money arrived? No addresses? This just works!"*

### Pillar 2: Network Abstraction

Users see **tokens**, not chains. "USDC" — not "USDC on Polygon" or "USDC on Arbitrum."

- System auto-selects the optimal route and network
- Cross-chain bridging happens invisibly in the background
- Pro mode available for power users who want control
- Most "chain abstraction" solutions are technical (Particle, Abstract, NEAR) — E-Y's is experiential. We hide networks at the UX layer.

### Pillar 3: SHARD Identity (Post-MVP, Planned)

A World App Orb alternative using **NFC passport scanning**:

- 1.4 billion NFC passports exist globally vs. ~2,000 Orbs
- Scan your passport at home — no need to travel to a verification device
- Cryptographic proof of unique humanity — no biometric data stored
- Enabled by EU eIDAS 2.0 (2025) which legalized NFC passport verification for private entities
- Zero-knowledge approach: prove uniqueness without revealing identity

### Pillar 4: AI Financial Agent (Implemented)

Not a chatbot. A **proactive AI companion** powered by Claude (Anthropic):

- 8 integrated tools: balance check, send, transaction history, contacts, scheduled payments, BLIK generate/lookup, swap
- Proactive suggestions: "Gas is cheap right now — good time for that swap!"
- Intent parsing: users speak naturally, AI executes
- Security layer: rate limiter, audit logger, security validation
- Available on both mobile and web via WebSocket real-time streaming

## 4. Why Now (2026)

| Trend | How E-Y Benefits |
|-------|------------------|
| **Post-FTX trust crisis** | People want self-custody — but without the complexity. E-Y delivers both. |
| **Chain abstraction maturity** | Bridges (LI.FI, Rango) are production-ready. E-Y can abstract chains at UX layer using proven infrastructure. |
| **AI cost collapse** | Claude, GPT-4o-mini, Whisper — AI is now affordable enough for per-user financial agents. |
| **EU eIDAS 2.0** | NFC passport verification is now legal for private entities. SHARD becomes possible. |
| **Crypto wallet fatigue** | 820M+ wallets globally but no differentiation. Users switch randomly. One killer feature changes that. |

## 5. Market Opportunity

| Metric | Value |
|--------|-------|
| Crypto wallet market size | $12-15B (2025) |
| CAGR | 25-30% |
| Active wallets globally | 820M+ |
| Mobile wallet users | 65%+ of all crypto users |
| Key gap | No wallet combines BLIK + chain abstraction + accessible identity + AI agent |

## 6. Competitive Landscape

| Feature | MetaMask | Trust Wallet | World App | Phantom | E-Y |
|---------|----------|-------------|-----------|---------|-----|
| Chain Abstraction | Partial | No | No | Partial | **Core (UX-first)** |
| BLIK-style Codes | No | No | No | No | **World's first** |
| Human Verification | No | No | Orb (limited) | No | **NFC Passport** |
| AI Agent | Partial | No | No | No | **Full (proactive)** |
| Bank-like UX | No | Partial | Partial | Yes | **Core philosophy** |

**No competitor combines all four pillars.**

### Key Competitive Positioning

- **vs MetaMask**: "MetaMask is for developers. E-Y is for everyone else — and developers too."
- **vs World App**: "You don't need to find an Orb. Your passport is enough."
- **vs Trust Wallet**: "Trust Wallet adds features. We rethought the experience from scratch."
- **vs Phantom**: "Cross-chain from day one. Not locked to one ecosystem."

## 7. Current State of Development

### What's Built and Live

E-Y is **not a pitch deck — it's a working product**:

| Component | Status | Technology |
|-----------|--------|------------|
| **Web App** | Live at [e-y-app.vercel.app](https://e-y-app.vercel.app) | Next.js 16, React 19, Tailwind CSS v4 |
| **Mobile App** | In development | Expo SDK 54, React Native, TypeScript |
| **Backend API** | Live on Railway | NestJS, Supabase (PostgreSQL), WebSocket |
| **Marketing Website** | Live at [eternity-wallet.vercel.app](https://eternity-wallet.vercel.app) | Next.js, Three.js (3D animations) |

### Implemented Features (Working Today)

- Wallet creation and import (BIP-39 seed phrases, multi-account)
- BLIK code payments (6-digit codes, 2-min expiry, real-time WebSocket matching)
- @username system (human-readable addresses)
- Multi-network support (Ethereum Sepolia, Polygon, Base, Arbitrum, Optimism)
- Token balances with USD equivalents
- Send to address / @username / BLIK code
- Receive via address / QR code / @username / BLIK code
- AI chat agent (Claude-powered, 8 tools, proactive suggestions)
- Token swap
- Cross-chain bridge routing
- Contact book
- Scheduled/recurring payments
- Split bill (request from multiple people)
- Transaction history
- Network abstraction (token-first UI)
- Self-custody security (keys never leave device, Web Crypto API encryption)
- Dark theme with glass morphism design system

### Architecture

- **Monorepo**: Turborepo + pnpm (4 apps, 4 shared packages)
- **Apps**: Mobile (Expo), Web (Next.js 16), API (NestJS), Website (Next.js)
- **Shared packages**: `@e-y/shared` (business logic), `@e-y/crypto` (wallet operations), `@e-y/storage` (encrypted persistence), `@e-y/ui` (component library)
- **Backend**: 11 NestJS modules with REST + WebSocket gateways
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude SDK with custom tool calling and proactive service
- **Blockchain**: ethers.js v6 with Alchemy RPC (multi-network)

### Web App Scale

- 23 pages covering onboarding, wallet management, AI chat, and settings
- Full feature parity with planned mobile app
- 11 service modules in the service layer
- React Context state management (AccountContext, BalanceContext)

## 8. Business Model (Planned)

| Revenue Stream | Phase | Description |
|----------------|-------|-------------|
| **Swap fees** | v1.0 | Small percentage on token swaps routed through E-Y |
| **Bridge fees** | v1.0 | Revenue share from cross-chain bridge aggregators (LI.FI) |
| **Premium AI features** | v2.0 | Advanced AI autonomy, voice commands, portfolio optimization |
| **SHARD verification** | v3.0 | Identity-as-a-service for third-party apps |
| **Institutional features** | v3.0 | Multi-sig, compliance tools, enterprise wallets |

## 9. Roadmap

| Phase | Timeline | Key Deliverables |
|-------|----------|-----------------|
| **MVP (Testnet)** | Now - Q1 2026 | Working prototype, BLIK demo, 10 beta testers |
| **EthCC Demo** | Q2 2026 | Polished demo, investor meetings, partnership conversations |
| **Beta Launch** | Q2 2026 | 100 active wallets, viral loop validation |
| **v1.0 Mainnet** | Q3 2026 | EVM mainnet, cross-chain swaps, professional security audit |
| **Growth** | Q3-Q4 2026 | 1,000+ active wallets, organic growth |
| **v2.0 Intelligence** | Q4 2026 | Voice commands, statistics, advanced AI autonomy |
| **v3.0 Identity** | 2027 | SHARD (NFC), decentralized @username, virtual cards |
| **Scale** | 2027+ | 50,000+ wallets, ecosystem partnerships, multi-ecosystem support |

## 10. Traction & Milestones

- Working web app live and accessible (23 pages, full wallet functionality)
- Backend API deployed and operational (11 modules)
- Marketing website live with waitlist
- AI agent integrated and functional (Claude-powered, 8 tools)
- BLIK payment system implemented and working (WebSocket real-time matching)
- Multi-network support (5 EVM networks)
- Complete monorepo architecture (4 apps, 4 packages, production-grade code)
- Open source codebase (audit-ready, clean architecture)

## 11. Team

**Daniel (Founder & Solo Developer)** — Built the entire E-Y ecosystem solo: mobile app, web app, backend API, marketing website, shared packages, AI integration, and design system. Full-stack engineer with deep expertise in React/React Native, TypeScript, NestJS, blockchain (ethers.js), and AI integration (Anthropic Claude).

**Currently seeking**: Co-founders (especially with Web3/blockchain expertise), advisors, and early-stage funding to accelerate development toward mainnet launch and EthCC demo.

## 12. What We're Looking For

### From Investors

- **Pre-seed / Seed funding** to hire a small team (2-3 engineers) and accelerate mainnet launch
- **Ideal check size**: $100K-$500K
- **Use of funds**: Engineering team, security audit, EthCC presence, user acquisition
- **What investors get**: Equity in a product that's already built (not a pitch deck), first-mover advantage in BLIK-style crypto payments, and a team that ships

### From Accelerators / Grants

- Web3 grants (Ethereum Foundation, Polygon, Arbitrum, Base ecosystem grants)
- Crypto accelerator programs (Alliance, Seed Club, Consensys)
- AI + Fintech accelerators

### From Partners

- **Bridge/DEX aggregators** (LI.FI, Rango, 1inch) — integration partnerships
- **Identity providers** (Didit, ReadID) — SHARD implementation
- **Chain ecosystems** (Polygon, Base, Arbitrum, Optimism) — ecosystem grants, co-marketing
- **AI providers** (Anthropic) — early access programs, credits

## 13. Contact

- **Email**: eternity.shard.business@gmail.com
- **Web App**: https://e-y-app.vercel.app
- **Website**: https://eternity-wallet.vercel.app

---

## Guidelines for Writing Outreach Emails

### Tone

- Professional but not corporate. Startup energy — confident, direct, passionate.
- Lead with the problem and the "aha moment" — not the tech stack.
- Show that this is a working product, not a concept. Link to the live app.
- Personalize each email based on the recipient's portfolio, focus areas, or stated interests.

### Structure for Investor Emails

1. **Hook** (1 sentence): The unique value proposition or a compelling stat
2. **Problem** (2-3 sentences): Why crypto UX is broken
3. **Solution** (3-4 sentences): BLIK codes + chain abstraction + AI agent (focus on what makes E-Y unique)
4. **Traction** (2-3 sentences): Working product, live web app, implemented features
5. **Market** (1-2 sentences): $12-15B market, no competitor combining all four pillars
6. **Ask** (1-2 sentences): What we're looking for from this specific recipient
7. **CTA** (1 sentence): Meeting request or demo invitation

### Structure for Partnership Emails

1. **Context** (1-2 sentences): What E-Y is and why it's relevant to their business
2. **Mutual benefit** (2-3 sentences): How integration helps both sides
3. **Current state** (1-2 sentences): We're building, this is live, here's the stack
4. **Proposal** (1-2 sentences): Specific integration idea
5. **CTA** (1 sentence): Call or async discussion

### Structure for Grant Applications

1. **Project summary**: What E-Y is and its unique innovation
2. **Ecosystem contribution**: How E-Y benefits their specific ecosystem (e.g., brings new users to Polygon)
3. **Technical detail**: Architecture, open source, integration plans
4. **Team**: Solo developer who built everything — demonstrates extreme technical capability
5. **Milestones**: Clear deliverables tied to grant funding
6. **Budget**: How funds will be used

### Key Phrases to Use

- "World's first BLIK-style payment codes for crypto"
- "Not a pitch deck — a working product"
- "Making crypto as easy as sending a text message"
- "The first crypto wallet that feels like a bank"
- "No competitor combines all four pillars"
- "AI-native, not AI-added"
- "Self-custody without the complexity"
- "Built and deployed by a solo developer — imagine what a team can do"

### Things to Emphasize Based on Recipient Type

| Recipient | Emphasize |
|-----------|-----------|
| **VC / Angel** | First-mover advantage, market gap, working product, team capability |
| **Web3 VC** | BLIK innovation, network abstraction approach, SHARD vs Orb |
| **AI-focused VC** | Claude integration, proactive AI agent, 8 tools, AI-first UX |
| **Fintech VC** | Bank-like UX, BLIK analogy (80% adoption in Poland), mass market potential |
| **Chain ecosystems (Polygon, Base, etc.)** | Multi-network support, user onboarding to their chain, ecosystem growth |
| **Bridge providers (LI.FI, Rango)** | Cross-chain routing integration, volume potential, UX abstraction |
| **Identity providers (Didit)** | SHARD vision, NFC passport market, eIDAS 2.0 compliance |
| **Accelerators** | Solo dev built full product, high technical capability, clear vision |
| **Grant programs** | Open source, ecosystem contribution, specific chain support |
