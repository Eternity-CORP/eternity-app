# Business Wallet — Product Design Document

**Author:** Daniel
**Date:** 2026-02-13
**Status:** APPROVED
**Feature:** Business Wallet — third wallet type in E-Y
**Scope:** Full feature design + Real Wallet mainnet migration plan

---

## 1. Executive Summary

Business Wallet is a new wallet type in E-Y that allows users to create tokenized business entities. Each business gets its own ERC-20 token representing equity shares, a shared treasury with governance voting, and optional dividend/vesting mechanics.

**Core concept:** Founders create a shared business, each receiving tokens proportional to their ownership. Tokens = shares. Transfer tokens = transfer ownership. Treasury funds are controlled by collective voting weighted by share ownership.

**Target users:** Startup co-founders, freelancer partnerships, project teams, investor groups — anyone who needs to formalize and manage shared ownership without traditional legal incorporation.

---

## 2. Problem Statement

### Current State

When people start a business together, they face a choice:
1. **Register legally** — expensive, slow, requires lawyers, jurisdiction-dependent
2. **Handshake agreement** — no enforcement, no transparency, disputes inevitable
3. **Existing DAO tools** — complex, expensive gas, designed for large organizations

### What's Missing

A simple, accessible way to:
- Formalize ownership splits on blockchain (immutable record)
- Manage shared funds with democratic control
- Transfer ownership easily (sell/give shares)
- Distribute profits automatically

### E-Y's Advantage

E-Y already has the wallet infrastructure, BLIK payments, @username system, and multi-network support. Business Wallet extends this naturally — users already have wallets, now they can create businesses together.

---

## 3. Wallet Types in E-Y

After this feature, E-Y will have three wallet types, with network determined by wallet type:

| Wallet Type | Network | Purpose | Status |
|-------------|---------|---------|--------|
| **Test Wallet** | Sepolia testnet | Learning, testing, development | Existing |
| **Real Wallet** | Mainnet (Polygon/Base/Arbitrum/Optimism/Ethereum) | Real transactions, real value | NEW (migration from test) |
| **Business Wallet** | Sepolia (dev) → Mainnet (prod) | Tokenized business ownership | NEW |

### Network Selection Logic

- Active wallet type determines available networks
- Test Wallet → only testnet networks (Sepolia, etc.)
- Real Wallet → only mainnet networks
- Business Wallet → testnet during development, mainnet in production
- User switches wallet type from the existing wallet selector dropdown

### Wallet Creation

All wallet types are created from the same "Add Wallet" modal:

```
Add Wallet (modal)
├── New Wallet          → Ethereum mainnet (Real)
├── New Test Wallet     → Sepolia testnet (Test)
├── New Business Wallet → Sepolia testnet (Business)   ← NEW
└── Import Wallet       → Recovery phrase
```

Business Wallet creation requires additional setup steps (see Flow 1 below).

---

## 4. Feature Specification

### 4.1 Business Token (Equity Shares)

| Property | Description |
|----------|-------------|
| **Standard** | ERC-20 |
| **Supply** | Fixed at creation, cannot be minted or burned |
| **Symbol** | Chosen by creator (e.g., $ACME, $STARTUP) |
| **Decimals** | 0 (whole shares only, no fractional ownership) |
| **Distribution** | Allocated to founders at creation |
| **Transfer** | Configurable: free or requires approval |
| **Price** | Not set in MVP; determined by external valuation or future trading |

**Key constraint:** Total supply is immutable. Tokens represent percentage ownership: if total supply is 100 and you hold 30, you own 30%.

### 4.2 Treasury

A shared wallet address controlled by governance voting.

| Feature | Description |
|---------|-------------|
| **Accepts** | Any ERC-20 token + native ETH |
| **Withdrawal** | Requires proposal + vote (quorum threshold) |
| **Visibility** | All members can see balance |
| **Deposit** | Anyone can deposit (including non-members, e.g., clients paying) |

Treasury address is the main "business address" — clients, partners, or anyone can send funds to it.

### 4.3 Governance (Voting)

| Parameter | Default | Configurable |
|-----------|---------|-------------|
| **Quorum threshold** | 51% | Yes (51%-100%) |
| **Vote weight** | Proportional to token balance | No (always proportional) |
| **Voting period** | 48 hours | Yes (1 hour - 30 days) |
| **Who can create proposals** | Any member | No (any member can always propose) |

**Proposal types:**
1. **Withdraw from Treasury** — send funds from treasury to an address
2. **Transfer Shares** — transfer tokens between/to participants (in approval mode)
3. **Change Settings** — modify transfer policy, quorum, voting period
4. **Custom** — free-form proposal with description (off-chain, advisory)

**Voting mechanics:**
- Each token = 1 vote
- Binary: For or Against
- Proposal passes when For votes >= quorum threshold of total supply
- Passed proposals execute automatically (for treasury withdrawals) or require manual action

### 4.4 Transfer Policy (Configurable)

Set at business creation, changeable via governance proposal:

| Mode | Behavior |
|------|----------|
| **Free Transfer** | Any holder can send their tokens to anyone. No restrictions. |
| **Approval Required** | Token transfer creates a pending proposal. Other members vote. Transfer executes only on approval. |

### 4.5 Dividends (Optional)

Automatic distribution of treasury funds to token holders proportional to their shares.

| Setting | Options |
|---------|---------|
| **Enabled** | On/Off (set at creation, changeable via proposal) |
| **Frequency** | Manual / Weekly / Monthly / Quarterly |
| **Percentage** | What % of treasury to distribute (1-100%) |
| **Token** | Which token to distribute (ETH, USDC, etc.) |

**Flow:**
1. Funds accumulate in treasury
2. At scheduled time (or manually via proposal):
   - Calculate each member's share: `memberTokens / totalSupply * distributionAmount`
   - Send proportional amounts to each member's personal wallet
3. Record distribution in activity log

### 4.6 Vesting (Optional)

Gradual token unlock to prevent "take tokens and leave" scenarios.

| Setting | Options |
|---------|---------|
| **Enabled** | On/Off (set at creation) |
| **Cliff** | 0-24 months (period before any tokens unlock) |
| **Duration** | 1-48 months (total vesting period) |
| **Schedule** | Linear (monthly) or Custom milestones |

**How it works:**
- At creation, tokens are assigned but locked in the vesting contract
- After cliff period, tokens begin unlocking linearly
- Unlocked tokens can be transferred (subject to transfer policy)
- Locked tokens still count for voting weight
- Example: 12-month vesting with 3-month cliff → 0% for 3 months, then ~8.3% per month

---

## 5. User Flows

### Flow 1: Create Business Wallet

```
Step 1: Basic Info
  ├── Business name (required, 3-50 chars)
  ├── Description (optional, max 200 chars)
  └── Logo/icon (optional, emoji picker)

Step 2: Token Setup
  ├── Token symbol (required, 2-6 uppercase letters, e.g., "ACME")
  ├── Total supply (required, 2-1,000,000 tokens)
  └── Initial valuation (optional, USD — for display purposes only)

Step 3: Add Founders
  ├── Creator automatically added as first founder
  ├── Add members by @username or wallet address
  ├── Assign token amount to each member
  ├── Visual: pie chart showing ownership distribution
  └── Validation: all tokens must be allocated (sum = total supply)

Step 4: Settings (collapsible, with defaults)
  ├── Transfer policy: Free (default) / Approval Required
  ├── Quorum: 51% (default, adjustable slider)
  ├── Voting period: 48h (default, adjustable)
  ├── Dividends: Off (default) / On → frequency + percentage
  └── Vesting: Off (default) / On → cliff + duration

Step 5: Review & Deploy
  ├── Summary of all settings
  ├── List of founders with shares
  ├── Estimated gas fee (Sepolia ETH)
  ├── Warning: "Settings can be changed later via governance vote"
  └── "Deploy Business" button → sign transaction
```

**Post-deploy:**
- Smart contract deployed on Sepolia
- Tokens distributed to founder addresses
- Treasury address created
- Business appears in creator's wallet selector
- Other founders see invitation notification
- Business metadata saved to Supabase

### Flow 2: Business Dashboard

```
┌─────────────────────────────────────────────┐
│  ACME Inc.                       [Settings] │
│  Token: $ACME   Supply: 100                │
│  Network: Sepolia                           │
├─────────────────────────────────────────────┤
│                                             │
│  Treasury Balance                           │
│  ┌─────────────────────────────────────┐   │
│  │  0.5 ETH         100 USDC          │   │
│  │  ($1,250)         ($100)            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Ownership                                  │
│  ┌──────────────────┐                      │
│  │   [PIE CHART]    │  @daniel  50 (50%)  │
│  │                  │  @alex    30 (30%)  │
│  │                  │  @maria   20 (20%)  │
│  └──────────────────┘                      │
│                                             │
│  Active Proposals (1)                       │
│  ┌─────────────────────────────────────┐   │
│  │  "Withdraw 0.1 ETH for hosting"    │   │
│  │  By @daniel · Ends in 23h          │   │
│  │  ▓▓▓▓▓▓▓░░░  70% / 51% needed     │   │
│  │  [Vote For]  [Vote Against]         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Recent Activity                            │
│  • @alex voted For on "Withdraw..."        │
│  • @maria received 20 ACME tokens          │
│  • Business created by @daniel             │
│                                             │
│  ┌────────────┐ ┌──────────────────────┐   │
│  │Send Shares │ │  New Proposal        │   │
│  └────────────┘ └──────────────────────┘   │
│  ┌──────────────────────────────────────┐  │
│  │  Deposit to Treasury                 │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Flow 3: Create & Vote on Proposal

```
Create Proposal:
  1. Select type: Withdraw / Transfer Shares / Change Settings / Custom
  2. Fill details:
     - Withdraw: token, amount, recipient address/@username, reason
     - Transfer: from, to, amount, reason
     - Settings: which setting to change, new value
     - Custom: title + description
  3. Set voting deadline (default: 48h)
  4. Submit → all members notified via WebSocket/push

Vote:
  1. Open proposal from dashboard or notification
  2. See details + current vote tally
  3. Tap "For" or "Against"
  4. Sign transaction (on-chain vote recording)
  5. See updated progress bar

Execution:
  - When quorum reached → automatic execution for treasury/transfer
  - "Passed" badge shown on proposal
  - Activity log updated
  - All members notified of result
```

### Flow 4: Transfer Shares

```
Free Transfer Mode:
  1. "Send Shares" from dashboard
  2. Enter recipient (@username or address)
  3. Enter amount
  4. Confirm → tokens transfer immediately
  5. If new member → auto-added to business

Approval Mode:
  1. "Send Shares" from dashboard
  2. Enter recipient + amount
  3. Creates a "Transfer Shares" proposal automatically
  4. Other members vote
  5. On approval → tokens transfer
  6. On rejection → nothing happens, tokens stay
```

### Flow 5: Dividends Distribution

```
Manual Distribution:
  1. Any member creates "Distribute Dividends" proposal
  2. Specify: token (ETH/USDC/etc.), amount or % of treasury
  3. Members vote
  4. On approval → funds sent proportionally to all holders

Automatic Distribution (if configured):
  1. Scheduled trigger (weekly/monthly/quarterly)
  2. System calculates: configured_percentage * treasury_balance
  3. Creates auto-proposal (passes automatically if enabled)
  4. Distributes to all token holders proportionally
  5. Activity log records all distributions
```

---

## 6. Technical Architecture

### 6.1 Smart Contracts (Solidity)

Three contracts deployed per business, created via factory pattern:

#### BusinessFactory.sol (Singleton — one per platform)

```
Functions:
  createBusiness(
    name: string,
    symbol: string,
    totalSupply: uint256,
    founders: address[],
    shares: uint256[],
    transferPolicy: enum(FREE, APPROVAL_REQUIRED),
    quorumThreshold: uint256,  // basis points (5100 = 51%)
    vestingEnabled: bool,
    vestingConfig: VestingConfig,
    dividendsEnabled: bool
  ) → returns (tokenAddress, treasuryAddress)

  getBusinessesByOwner(owner: address) → Business[]

Events:
  BusinessCreated(tokenAddress, treasuryAddress, creator, name, symbol)
```

#### BusinessToken.sol (ERC-20 — one per business)

```
Extends: OpenZeppelin ERC20

State:
  transferPolicy: FREE | APPROVAL_REQUIRED
  treasuryAddress: address
  vestingContract: address (optional)

Functions:
  // Standard ERC-20
  transfer(to, amount)       // Blocked if APPROVAL_REQUIRED
  balanceOf(owner)
  totalSupply()

  // Custom
  setTransferPolicy(policy)  // Only via treasury governance
  getHolders() → (address[], uint256[])

  // Override transfer to check policy
  _beforeTokenTransfer(from, to, amount)
    → if APPROVAL_REQUIRED: revert unless called by treasury
```

#### BusinessTreasury.sol (Governance + Treasury — one per business)

```
State:
  tokenContract: address
  quorumThreshold: uint256     // basis points
  votingPeriod: uint256        // seconds
  proposals: mapping(uint => Proposal)
  votes: mapping(uint => mapping(address => Vote))

Structs:
  Proposal {
    id, type, creator, data, deadline,
    forVotes, againstVotes, executed, canceled
  }

Functions:
  // Treasury
  receive() external payable           // Accept ETH
  depositToken(token, amount)          // Accept ERC-20

  // Governance
  createProposal(type, data, deadline) → proposalId
  vote(proposalId, support: bool)      // Weight = token balance
  executeProposal(proposalId)          // Anyone can call after quorum
  cancelProposal(proposalId)           // Only creator, before votes

  // Dividends
  distributeDividends(token, amount)   // Only via passed proposal

  // Settings
  updateQuorum(newThreshold)           // Only via passed proposal
  updateVotingPeriod(newPeriod)        // Only via passed proposal

Events:
  ProposalCreated(id, type, creator)
  Voted(proposalId, voter, support, weight)
  ProposalExecuted(id)
  DividendsDistributed(token, totalAmount, recipients)
  Deposited(token, amount, sender)
```

### 6.2 Shared Package (packages/shared/)

All cross-platform business logic lives here. Zero runtime dependencies — accepts ethers provider via dependency injection.

```
packages/shared/src/
├── types/
│   └── business.ts
│       ├── BusinessWallet
│       ├── BusinessMember
│       ├── BusinessToken
│       ├── Proposal (ProposalType, ProposalStatus)
│       ├── Vote
│       ├── VestingConfig
│       ├── DividendConfig
│       ├── TransferPolicy
│       └── BusinessActivity
│
├── services/
│   ├── business-factory.ts
│   │   ├── createBusiness(provider, params) → { tokenAddr, treasuryAddr, txHash }
│   │   └── getBusinessesByOwner(provider, owner) → BusinessWallet[]
│   │
│   ├── business-token.ts
│   │   ├── getTokenInfo(provider, tokenAddr) → { symbol, supply, holders }
│   │   ├── getHolders(provider, tokenAddr) → BusinessMember[]
│   │   ├── transferShares(provider, tokenAddr, to, amount) → txHash
│   │   └── getVestingStatus(provider, vestingAddr, user) → VestingInfo
│   │
│   ├── business-treasury.ts
│   │   ├── getTreasuryBalance(provider, treasuryAddr) → TokenBalance[]
│   │   ├── depositToTreasury(provider, treasuryAddr, token, amount) → txHash
│   │   └── getTreasuryAddress(provider, tokenAddr) → address
│   │
│   └── business-governance.ts
│       ├── createProposal(provider, treasuryAddr, type, data, deadline) → proposalId
│       ├── vote(provider, treasuryAddr, proposalId, support) → txHash
│       ├── executeProposal(provider, treasuryAddr, proposalId) → txHash
│       ├── getProposals(provider, treasuryAddr) → Proposal[]
│       ├── getVotes(provider, treasuryAddr, proposalId) → Vote[]
│       └── getProposalStatus(provider, treasuryAddr, proposalId) → ProposalStatus
│
├── constants/
│   └── business.ts
│       ├── BUSINESS_FACTORY_ABI
│       ├── BUSINESS_TOKEN_ABI
│       ├── BUSINESS_TREASURY_ABI
│       ├── FACTORY_ADDRESSES (per network)
│       ├── MIN_SUPPLY, MAX_SUPPLY
│       ├── MIN_QUORUM, MAX_QUORUM
│       └── DEFAULT_VOTING_PERIOD
│
└── utils/
    └── business.ts
        ├── calculateOwnershipPercent(balance, totalSupply) → number
        ├── calculateDividendShare(tokens, totalSupply, amount) → bigint
        ├── isQuorumReached(forVotes, totalSupply, threshold) → boolean
        ├── formatShareAmount(amount, totalSupply) → "30 (30%)"
        └── validateBusinessParams(params) → ValidationResult
```

### 6.3 Backend (NestJS — new module)

```
apps/api/src/business/
├── business.module.ts
├── business.controller.ts         # REST endpoints
│   ├── POST   /api/business                    # Save business metadata
│   ├── GET    /api/business/:address           # Get business details
│   ├── GET    /api/business/user/:address      # Get user's businesses
│   ├── POST   /api/business/:id/proposal       # Cache proposal metadata
│   ├── GET    /api/business/:id/activity       # Get activity log
│   └── PUT    /api/business/:id                # Update metadata
│
├── business.service.ts            # Supabase CRUD
├── business.gateway.ts            # WebSocket notifications
│   ├── on: 'join-business'        # Subscribe to business updates
│   ├── emit: 'proposal-created'   # New proposal notification
│   ├── emit: 'vote-cast'          # Vote notification
│   ├── emit: 'proposal-executed'  # Proposal result notification
│   └── emit: 'dividend-distributed' # Dividend notification
│
├── dto/
│   ├── create-business.dto.ts
│   ├── create-proposal.dto.ts
│   └── update-business.dto.ts
└── entities/
    └── business.entity.ts
```

### 6.4 Database Schema (Supabase)

```sql
-- Business registry (metadata cache)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  icon VARCHAR(10),                        -- emoji
  token_symbol VARCHAR(6) NOT NULL,
  token_supply INTEGER NOT NULL,
  contract_address VARCHAR(42) NOT NULL,   -- BusinessToken address
  treasury_address VARCHAR(42) NOT NULL,   -- BusinessTreasury address
  factory_tx_hash VARCHAR(66) NOT NULL,
  network VARCHAR(20) NOT NULL DEFAULT 'sepolia',
  transfer_policy VARCHAR(20) NOT NULL DEFAULT 'FREE',
  quorum_threshold INTEGER NOT NULL DEFAULT 5100,  -- basis points
  voting_period INTEGER NOT NULL DEFAULT 172800,   -- seconds (48h)
  vesting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  vesting_config JSONB,
  dividends_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dividends_config JSONB,
  created_by VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business members (cache, source of truth is on-chain)
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,
  username VARCHAR(20),
  initial_shares INTEGER NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'founder' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, address)
);

-- Proposal metadata (details cache)
CREATE TABLE business_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  on_chain_id INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL,  -- 'withdraw' | 'transfer' | 'settings' | 'custom' | 'dividend'
  title VARCHAR(100) NOT NULL,
  description TEXT,
  data_json JSONB,
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'passed' | 'rejected' | 'executed' | 'canceled'
  created_by VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log
CREATE TABLE business_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,    -- 'created' | 'proposal' | 'vote' | 'executed' | 'transfer' | 'deposit' | 'dividend'
  description TEXT NOT NULL,
  actor_address VARCHAR(42),
  tx_hash VARCHAR(66),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_businesses_created_by ON businesses(created_by);
CREATE INDEX idx_business_members_address ON business_members(address);
CREATE INDEX idx_business_members_business ON business_members(business_id);
CREATE INDEX idx_business_proposals_business ON business_proposals(business_id);
CREATE INDEX idx_business_proposals_status ON business_proposals(status);
CREATE INDEX idx_business_activity_business ON business_activity(business_id);
```

### 6.5 Contract Deployment & Gas Costs

| Action | Sepolia (testnet) | Polygon/Base (mainnet L2) |
|--------|-------------------|--------------------------|
| Deploy Business (factory call) | Free (test ETH) | ~$0.01-0.10 |
| Transfer tokens | Free | ~$0.001-0.01 |
| Create proposal | Free | ~$0.001-0.01 |
| Vote | Free | ~$0.001-0.01 |
| Execute proposal | Free | ~$0.001-0.05 |
| Distribute dividends | Free | ~$0.01-0.10 (depends on # members) |

**Development phase:** All on Sepolia testnet — zero cost. Test ETH from existing faucets.

---

## 7. Real Wallet Mainnet Migration

As part of this feature release, Real Wallets transition from testnet to mainnet.

### Changes Required

| Component | Current | After |
|-----------|---------|-------|
| Network config | Sepolia for all | Test→Sepolia, Real→Mainnet, Business→Sepolia(dev)/Mainnet(prod) |
| RPC endpoints | Alchemy Sepolia | Alchemy Mainnet (Polygon, Base, Arbitrum, Optimism, Ethereum) |
| Token lists | Testnet tokens | Real token contracts (USDC, USDT, WETH, etc.) |
| Gas estimation | Test gas | Real gas estimation with USD display |
| Balance display | Test balances | Real balances with accurate USD pricing |

### Safety Measures

- Clear visual distinction between wallet types (badge: TEST / REAL / BUSINESS)
- Warning when switching to Real Wallet: "Transactions use real funds"
- Mainnet RPC keys stored as environment variables (not hardcoded)
- Same wallet derivation path — user's existing seed phrase works on mainnet

---

## 8. AI Agent Integration

The existing AI Agent (Claude) will be extended with Business Wallet tools:

| Tool | Description |
|------|-------------|
| `business_list` | List user's businesses with key stats |
| `business_info` | Get details of a specific business |
| `business_create_proposal` | Create a new proposal via chat |
| `business_vote` | Vote on a proposal via chat |

**Example interactions:**
- "Show me my businesses" → lists businesses with treasury balance and ownership
- "Create a proposal to withdraw 0.1 ETH from ACME treasury for server costs" → creates proposal
- "Vote yes on proposal #3 in ACME" → casts vote

---

## 9. Security Considerations

| Risk | Mitigation |
|------|------------|
| Smart contract bugs | Use OpenZeppelin audited base contracts; thorough testing on testnet |
| Treasury drain | Governance voting required for all withdrawals; quorum threshold |
| Hostile takeover (51% attack) | Configurable quorum up to 100%; approval-required transfers |
| Private key compromise | Standard E-Y security (secure storage, biometrics); business tokens on personal address |
| Reentrancy attacks | OpenZeppelin ReentrancyGuard on all state-changing functions |
| Flash loan voting | Snapshot token balances at proposal creation time |

---

## 10. MVP Scope vs Future

### MVP (This Release)

- [x] Business creation with token + treasury
- [x] Fixed-supply ERC-20 token per business
- [x] Ownership dashboard with pie chart
- [x] Treasury deposit and balance view
- [x] Proposal creation and voting
- [x] Treasury withdrawal via governance
- [x] Share transfer (free + approval modes)
- [x] Activity log
- [x] WebSocket notifications for proposals/votes
- [x] Real Wallet mainnet migration

### Post-MVP

- [ ] Automated dividends (scheduled distribution)
- [ ] Vesting contracts
- [ ] Token trading (DEX integration / internal marketplace)
- [ ] Business templates (50/50, standard vesting, etc.)
- [ ] Multi-sig optimization (gas-efficient batched voting)
- [ ] Business analytics (revenue tracking, share price history)
- [ ] Legal document generation (shareholder agreement PDF)
- [ ] Cross-chain business tokens (deploy on multiple L2s)

---

## 11. Success Criteria

| Metric | Target |
|--------|--------|
| Business creation success rate | > 95% |
| Proposal voting completion | > 80% of members vote |
| User understands ownership display | Zero "what does this mean?" questions |
| Treasury operations | Zero fund loss incidents |
| Contract deployment time | < 30 seconds on Sepolia |

---

## 12. Open Questions

1. **Token decimals**: 0 (whole shares) or 18 (fractional)? Recommended: 0 for simplicity.
2. **Maximum members per business**: Unlimited or capped? Recommended: 50 for MVP.
3. **Business deletion**: Can a business be dissolved? All members vote to burn tokens?
4. **Token name**: Auto-generated from business name or custom?
5. **Factory deployment**: Who deploys the factory contract? (E-Y team, one-time)

---

*Document generated: 2026-02-13*
*Ready for implementation planning*
