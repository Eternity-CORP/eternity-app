# Grant Application Templates

> Templates for E-Y grant applications

---

## Universal Grant Sections

### Project Summary (1 paragraph)

```
E-Y is a mobile crypto wallet that replaces complex blockchain addresses with
simple 6-digit codes — like BLIK, but for crypto. Users can send and receive
cryptocurrency without understanding networks, gas fees, or wallet addresses.
Built on [Polygon/Base/Arbitrum], E-Y brings bank-like UX to self-custody crypto,
making blockchain payments accessible to everyone.
```

### Problem Statement

```
Sending cryptocurrency remains terrifying for regular users:
- 42-character addresses that must be copied perfectly
- Multiple networks with incompatible tokens
- Gas fees in different currencies than the token being sent
- Fear of irreversible mistakes

These UX barriers block mainstream crypto adoption. 820M+ crypto wallets exist,
but most users only hold — they don't transact — because the experience is too risky.
```

### Solution

```
E-Y introduces BLIK-style codes to crypto:

1. BLIK Codes: 6-digit temporary codes (2-minute expiry) replace addresses
2. Network Abstraction: Users see "USDC", not "USDC (Polygon)" — system handles routing
3. Bank-like UX: Familiar interface inspired by Monobank and traditional banking apps
4. Self-custody: No central authority holds user funds

Result: "Give code, receive money" — crypto payments as simple as cash.
```

### How We Use [Network Name]

**For Polygon:**
```
E-Y is built on Polygon as the primary network because:
- Low transaction fees ($0.01-0.05 per transfer) enable micro-payments
- Fast finality (~2 seconds) makes BLIK codes feel instant
- Strong ecosystem of stablecoins (USDC, USDT) for real-world utility
- Growing developer community and tooling support

Technical integration:
- RPC via Alchemy for reliable node access
- USDC as primary stablecoin for transfers
- Polygon PoS for all P2P transactions
- Future: Cross-chain support via bridges
```

**For Base:**
```
E-Y integrates Base as a core network because:
- Coinbase backing ensures regulatory clarity and institutional trust
- Low fees make everyday payments viable
- Focus on consumer UX aligns with E-Y's mission
- Growing adoption among mainstream users

Technical integration:
- Base mainnet for USDC transfers
- Smart account support (future)
- Coinbase ecosystem compatibility
```

### Roadmap

```
Q1 2026:
- [ ] MVP launch on testnet (Sepolia)
- [ ] BLIK code system implementation
- [ ] 50 beta testers
- [ ] Security audit preparation

Q2 2026:
- [ ] Mainnet launch on [Polygon/Base]
- [ ] 500 active users
- [ ] Cross-chain support (Polygon + Base + Arbitrum)
- [ ] @username identity system

Q3 2026:
- [ ] 5,000 active users
- [ ] Split bill feature
- [ ] Scheduled payments
- [ ] EthCC demo and launch event

Q4 2026:
- [ ] 20,000 active users
- [ ] AI agent (proactive notifications)
- [ ] SHARD identity (NFC passport verification)
```

### Team

```
Daniel [Last Name] — Founder & Developer
- [X] years in software development
- Background in [relevant experience]
- Previously: [relevant roles/companies]
- GitHub: [link]
- Twitter: [link]

Solo founder with full-stack capabilities. Looking to expand team post-funding.
```

### Budget Breakdown

**For $10K-20K grants:**
```
Development & Infrastructure:
- Cloud hosting (12 months): $1,200
- RPC/Node services: $600
- Domain & SSL: $100
- Development tools: $500
Total Infrastructure: $2,400

Security:
- Smart contract audit: $5,000
- Penetration testing: $2,000
Total Security: $7,000

Marketing & Growth:
- User acquisition: $3,000
- Content creation: $1,000
- Community building: $1,000
Total Marketing: $5,000

Buffer: $2,600

TOTAL: $17,000
```

**For $30K-50K grants:**
```
Development:
- Additional developer (3 months): $15,000
- Infrastructure (12 months): $3,000
Total Development: $18,000

Security:
- Comprehensive audit: $10,000
- Bug bounty program: $5,000
Total Security: $15,000

Marketing & Growth:
- User acquisition: $8,000
- Events (EthCC, etc.): $5,000
- Content & community: $4,000
Total Marketing: $17,000

TOTAL: $50,000
```

### Milestones for Grant

```
Milestone 1 (Month 1): $[X]
- [ ] Complete [specific deliverable]
- [ ] Achieve [measurable outcome]
- [ ] Deliverable: [what you'll submit]

Milestone 2 (Month 2-3): $[X]
- [ ] Complete [specific deliverable]
- [ ] Achieve [measurable outcome]
- [ ] Deliverable: [what you'll submit]

Final Milestone (Month 4-6): $[X]
- [ ] Complete [specific deliverable]
- [ ] Achieve [measurable outcome]
- [ ] Deliverable: [what you'll submit]
```

### Metrics for Success

```
| Metric | Current | 3 Months | 6 Months |
|--------|---------|----------|----------|
| Active wallets | 0 | 100 | 500 |
| Weekly transactions | 0 | 200 | 1,000 |
| BLIK codes used | 0 | 500 | 3,000 |
| User retention (D7) | N/A | 40% | 50% |
```

### Links

```
- Website: [link]
- GitHub: [link]
- Demo video: [link]
- Pitch deck: [link]
- Twitter: [link]
```

---

## Polygon Grant Specific

### Why Polygon?

```
Polygon is the ideal network for E-Y because:

1. Transaction costs: At $0.01-0.05 per transfer, users can send small amounts
   without fees eating their funds. This enables the "give a friend $5" use case.

2. Speed: ~2 second finality means BLIK codes feel instant. Users generate a code,
   share it, and the transaction completes before the 2-minute expiry.

3. Ecosystem: Strong USDC liquidity and wide exchange support make on/off-ramping easy.

4. Developer experience: Comprehensive documentation, reliable RPC via Alchemy,
   and active developer community accelerate development.

E-Y will drive adoption to Polygon by making it the default network for everyday
crypto payments — users won't even know they're using Polygon, they'll just know
"it works."
```

---

## Base Grant Specific

### Why Base?

```
Base's mission to "bring the next billion users onchain" perfectly aligns with E-Y:

1. Consumer focus: Base prioritizes UX and mainstream adoption — exactly E-Y's goal.

2. Coinbase connection: Institutional credibility and potential fiat on-ramp integration.

3. Growing ecosystem: Early mover advantage in a rapidly growing L2 with strong fundamentals.

4. Regulatory clarity: Coinbase's compliance focus reduces regulatory uncertainty.

E-Y on Base will demonstrate that crypto can be as simple as Venmo — bringing
Coinbase's "trusted" reputation together with E-Y's "simple" UX.
```

---

## Ukrainian Startup Fund Specific

### Why Support E-Y?

```
E-Y represents Ukrainian innovation in global fintech:

1. Global market: Building for worldwide adoption, not just local market.

2. Blockchain/Web3: Positioning Ukraine in cutting-edge technology sector.

3. Remote-first: Can operate globally from Ukraine.

4. Export potential: Software product with zero marginal cost per user.

Success metrics benefit Ukraine:
- International recognition for Ukrainian tech
- Potential job creation as company scales
- Knowledge transfer to Ukrainian tech community
```

---

## Application Checklist

Before submitting any grant:

- [ ] Project summary (1 paragraph, clear value prop)
- [ ] Problem statement (relatable, specific)
- [ ] Solution description (how it works)
- [ ] Network-specific value (why this chain?)
- [ ] Team information (background, links)
- [ ] Roadmap (realistic, measurable)
- [ ] Budget breakdown (detailed, justified)
- [ ] Milestones (specific deliverables)
- [ ] Success metrics (measurable outcomes)
- [ ] Demo video (1-2 minutes)
- [ ] GitHub link (if open source)
- [ ] Pitch deck (optional but recommended)
