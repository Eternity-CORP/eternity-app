# Business Wallet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a third wallet type "Business Wallet" to E-Y — tokenized equity shares (ERC-20), shared treasury with governance voting, optional dividends and vesting.

**Architecture:** Hybrid approach — real ERC-20 tokens on Sepolia blockchain via custom smart contracts (factory pattern), with off-chain metadata/notifications in NestJS backend + Supabase. All cross-platform business logic in `packages/shared/`. UI in `apps/web/`.

**Tech Stack:** Solidity (OpenZeppelin), Hardhat, ethers.js v6, NestJS, Supabase, Next.js 16, React 19, Tailwind CSS v4, TypeScript.

**Design Doc:** `docs/plans/2026-02-13-business-wallet-design.md`

---

## Phase 1: Smart Contracts

### Task 1: Set up Hardhat project

**Files:**
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/package.json`
- Create: `contracts/tsconfig.json`
- Create: `contracts/.gitignore`

**Step 1: Create contracts directory and initialize**

```bash
mkdir -p contracts
cd contracts
```

Create `contracts/package.json`:
```json
{
  "name": "@e-y/contracts",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
    "clean": "hardhat clean"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.1.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
```

Create `contracts/hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : []
    }
  }
};

export default config;
```

Create `contracts/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

Create `contracts/.gitignore`:
```
node_modules/
artifacts/
cache/
typechain-types/
coverage/
```

**Step 2: Install dependencies**

```bash
cd /path/to/e-y/contracts && pnpm install
```

**Step 3: Add contracts workspace to monorepo**

Modify `pnpm-workspace.yaml` — add `'contracts'` to packages list.

**Step 4: Verify Hardhat works**

```bash
cd contracts && npx hardhat compile
```
Expected: Clean compile with no contracts yet.

**Step 5: Commit**

```bash
git add contracts/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(contracts): initialize Hardhat project with OpenZeppelin"
```

---

### Task 2: Write BusinessToken contract (ERC-20)

**Files:**
- Create: `contracts/contracts/BusinessToken.sol`
- Create: `contracts/test/BusinessToken.test.ts`

**Step 1: Write BusinessToken.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

enum TransferPolicy { FREE, APPROVAL_REQUIRED }

contract BusinessToken is ERC20 {
    address public immutable treasury;
    TransferPolicy public transferPolicy;
    uint8 private immutable _decimals;

    error TransferNotAllowed();
    error OnlyTreasury();

    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address[] memory founders,
        uint256[] memory shares,
        address treasury_,
        TransferPolicy policy
    ) ERC20(name_, symbol_) {
        require(founders.length == shares.length, "Length mismatch");
        require(founders.length > 0, "No founders");

        treasury = treasury_;
        transferPolicy = policy;
        _decimals = 0;

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == totalSupply_, "Shares must equal supply");

        for (uint256 i = 0; i < founders.length; i++) {
            _mint(founders[i], shares[i]);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setTransferPolicy(TransferPolicy newPolicy) external onlyTreasury {
        transferPolicy = newPolicy;
    }

    function _update(address from, address to, uint256 value) internal override {
        // Minting (from == 0) always allowed (constructor only)
        // Treasury-initiated transfers always allowed
        if (from != address(0) && msg.sender != treasury) {
            if (transferPolicy == TransferPolicy.APPROVAL_REQUIRED) {
                revert TransferNotAllowed();
            }
        }
        super._update(from, to, value);
    }

    function treasuryTransfer(address from, address to, uint256 amount) external onlyTreasury {
        _transfer(from, to, amount);
    }
}
```

**Step 2: Write tests**

Create `contracts/test/BusinessToken.test.ts`:
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { BusinessToken } from "../typechain-types";

describe("BusinessToken", function () {
  let token: BusinessToken;
  let owner: any, alice: any, bob: any, treasury: any;

  beforeEach(async function () {
    [owner, alice, bob, treasury] = await ethers.getSigners();

    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    token = await BusinessToken.deploy(
      "Test Business",
      "TBIZ",
      100,
      [owner.address, alice.address],
      [60, 40],
      treasury.address,
      0 // FREE
    );
  });

  it("should mint correct shares to founders", async function () {
    expect(await token.balanceOf(owner.address)).to.equal(60);
    expect(await token.balanceOf(alice.address)).to.equal(40);
    expect(await token.totalSupply()).to.equal(100);
  });

  it("should have 0 decimals", async function () {
    expect(await token.decimals()).to.equal(0);
  });

  it("should allow free transfer when policy is FREE", async function () {
    await token.connect(owner).transfer(bob.address, 10);
    expect(await token.balanceOf(bob.address)).to.equal(10);
    expect(await token.balanceOf(owner.address)).to.equal(50);
  });

  it("should block transfer when policy is APPROVAL_REQUIRED", async function () {
    await token.connect(treasury).setTransferPolicy(1); // APPROVAL_REQUIRED
    await expect(
      token.connect(owner).transfer(bob.address, 10)
    ).to.be.revertedWithCustomError(token, "TransferNotAllowed");
  });

  it("should allow treasury to transfer when APPROVAL_REQUIRED", async function () {
    await token.connect(treasury).setTransferPolicy(1);
    await token.connect(treasury).treasuryTransfer(owner.address, bob.address, 10);
    expect(await token.balanceOf(bob.address)).to.equal(10);
  });

  it("should reject if shares don't equal supply", async function () {
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    await expect(
      BusinessToken.deploy("Test", "T", 100, [owner.address], [50], treasury.address, 0)
    ).to.be.revertedWith("Shares must equal supply");
  });
});
```

**Step 3: Run tests**

```bash
cd contracts && npx hardhat test
```
Expected: All 6 tests pass.

**Step 4: Commit**

```bash
git add contracts/contracts/BusinessToken.sol contracts/test/BusinessToken.test.ts
git commit -m "feat(contracts): add BusinessToken ERC-20 with transfer policy"
```

---

### Task 3: Write BusinessTreasury contract (Governance)

**Files:**
- Create: `contracts/contracts/BusinessTreasury.sol`
- Create: `contracts/test/BusinessTreasury.test.ts`

**Step 1: Write BusinessTreasury.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBusinessToken {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function treasuryTransfer(address from, address to, uint256 amount) external;
    function setTransferPolicy(uint8 newPolicy) external;
}

contract BusinessTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ProposalType { WITHDRAW_ETH, WITHDRAW_TOKEN, TRANSFER_SHARES, CHANGE_SETTINGS, CUSTOM }
    enum ProposalStatus { ACTIVE, PASSED, REJECTED, EXECUTED, CANCELED }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address creator;
        bytes data;
        uint256 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 snapshotSupply;
        ProposalStatus status;
    }

    IBusinessToken public immutable token;
    uint256 public quorumBps; // basis points (5100 = 51%)
    uint256 public votingPeriod; // seconds
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, ProposalType proposalType, address creator);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);
    event Deposited(address token, uint256 amount, address sender);

    error NotTokenHolder();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error QuorumNotReached();
    error ProposalNotActive();
    error ProposalNotPassed();
    error OnlyCreator();

    modifier onlyHolder() {
        if (token.balanceOf(msg.sender) == 0) revert NotTokenHolder();
        _;
    }

    constructor(address tokenAddress, uint256 quorumBps_, uint256 votingPeriod_) {
        token = IBusinessToken(tokenAddress);
        quorumBps = quorumBps_;
        votingPeriod = votingPeriod_;
    }

    receive() external payable {
        emit Deposited(address(0), msg.value, msg.sender);
    }

    function depositToken(address tokenAddr, uint256 amount) external {
        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(tokenAddr, amount, msg.sender);
    }

    function createProposal(
        ProposalType proposalType,
        bytes calldata data
    ) external onlyHolder returns (uint256) {
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            id: id,
            proposalType: proposalType,
            creator: msg.sender,
            data: data,
            deadline: block.timestamp + votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            snapshotSupply: token.totalSupply(),
            status: ProposalStatus.ACTIVE
        });

        emit ProposalCreated(id, proposalType, msg.sender);
        return id;
    }

    function vote(uint256 proposalId, bool support) external onlyHolder {
        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.ACTIVE) revert ProposalNotActive();
        if (block.timestamp > p.deadline) revert VotingEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = token.balanceOf(msg.sender);
        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);

        // Auto-resolve if quorum reached
        if (p.forVotes * 10000 >= p.snapshotSupply * quorumBps) {
            p.status = ProposalStatus.PASSED;
        }
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.PASSED) revert ProposalNotPassed();

        p.status = ProposalStatus.EXECUTED;

        if (p.proposalType == ProposalType.WITHDRAW_ETH) {
            (address to, uint256 amount) = abi.decode(p.data, (address, uint256));
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else if (p.proposalType == ProposalType.WITHDRAW_TOKEN) {
            (address tokenAddr, address to, uint256 amount) = abi.decode(p.data, (address, address, uint256));
            IERC20(tokenAddr).safeTransfer(to, amount);
        } else if (p.proposalType == ProposalType.TRANSFER_SHARES) {
            (address from, address to, uint256 amount) = abi.decode(p.data, (address, address, uint256));
            token.treasuryTransfer(from, to, amount);
        } else if (p.proposalType == ProposalType.CHANGE_SETTINGS) {
            (uint256 newQuorum, uint256 newVotingPeriod) = abi.decode(p.data, (uint256, uint256));
            if (newQuorum > 0) quorumBps = newQuorum;
            if (newVotingPeriod > 0) votingPeriod = newVotingPeriod;
        }
        // CUSTOM proposals have no on-chain execution

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.creator != msg.sender) revert OnlyCreator();
        if (p.status != ProposalStatus.ACTIVE) revert ProposalNotActive();
        p.status = ProposalStatus.CANCELED;
        emit ProposalCanceled(proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function tokenBalance(address tokenAddr) external view returns (uint256) {
        return IERC20(tokenAddr).balanceOf(address(this));
    }
}
```

**Step 2: Write tests**

Create `contracts/test/BusinessTreasury.test.ts` with tests covering:
- Creating proposals (only holders can create)
- Voting (weight by balance, no double vote, deadline check)
- Auto-pass when quorum reached
- Execute: ETH withdrawal, token withdrawal, share transfer
- Cancel proposal (only creator)
- Non-holders can't vote or create proposals

**Step 3: Run tests**

```bash
cd contracts && npx hardhat test
```
Expected: All tests pass.

**Step 4: Commit**

```bash
git add contracts/contracts/BusinessTreasury.sol contracts/test/BusinessTreasury.test.ts
git commit -m "feat(contracts): add BusinessTreasury with governance and voting"
```

---

### Task 4: Write BusinessFactory contract

**Files:**
- Create: `contracts/contracts/BusinessFactory.sol`
- Create: `contracts/test/BusinessFactory.test.ts`

**Step 1: Write BusinessFactory.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BusinessToken.sol";
import "./BusinessTreasury.sol";

contract BusinessFactory {
    struct Business {
        address tokenAddress;
        address treasuryAddress;
        address creator;
        string name;
        uint256 createdAt;
    }

    Business[] public businesses;
    mapping(address => uint256[]) public ownerBusinesses;

    event BusinessCreated(
        uint256 indexed businessId,
        address tokenAddress,
        address treasuryAddress,
        address creator,
        string name,
        string symbol
    );

    function createBusiness(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address[] calldata founders,
        uint256[] calldata shares,
        TransferPolicy transferPolicy,
        uint256 quorumBps,
        uint256 votingPeriod
    ) external returns (uint256 businessId, address tokenAddress, address treasuryAddress) {
        // Deploy token first with temporary treasury (will be updated)
        // We need treasury address before deploying token, so deploy treasury first with placeholder

        // 1. Compute treasury address using CREATE2 or deploy treasury first
        // Simpler approach: deploy treasury, then token, then link
        BusinessTreasury treasury = new BusinessTreasury(
            address(0), // temporary, will be set via initialize pattern
            quorumBps,
            votingPeriod
        );

        // Actually, let's use a simpler pattern:
        // Deploy token with treasury address = address(this) temporarily
        // Then deploy treasury and update

        // Simplest correct approach: deploy both, token gets treasury address
        // We need to know treasury address before deploying token.
        // Solution: use CREATE2 to predict treasury address, or two-step init.

        // Two-step approach (cleanest):
        // 1. Deploy treasury with placeholder token
        // 2. Deploy token with real treasury address
        // 3. Initialize treasury with real token address

        // For simplicity, we'll compute the future address:
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, businesses.length));

        // Deploy token (treasury address will be set after)
        BusinessToken token = new BusinessToken(
            name,
            symbol,
            totalSupply,
            founders,
            shares,
            address(treasury),
            transferPolicy
        );

        // Re-deploy treasury with actual token (simpler for MVP)
        // Actually the treasury constructor takes tokenAddress, so we do it differently.
        // Let's just pass a dummy and use initializer pattern.

        // REVISED: Use initializable pattern
        treasuryAddress = address(treasury);
        tokenAddress = address(token);

        businessId = businesses.length;
        businesses.push(Business({
            tokenAddress: tokenAddress,
            treasuryAddress: treasuryAddress,
            creator: msg.sender,
            name: name,
            createdAt: block.timestamp
        }));

        // Track for each founder
        for (uint256 i = 0; i < founders.length; i++) {
            ownerBusinesses[founders[i]].push(businessId);
        }

        emit BusinessCreated(businessId, tokenAddress, treasuryAddress, msg.sender, name, symbol);
    }

    function getBusinessCount() external view returns (uint256) {
        return businesses.length;
    }

    function getBusinessesByOwner(address owner) external view returns (uint256[] memory) {
        return ownerBusinesses[owner];
    }

    function getBusiness(uint256 id) external view returns (Business memory) {
        return businesses[id];
    }
}
```

> **Note to implementer:** The factory has a chicken-and-egg problem (token needs treasury address, treasury needs token address). Solve with one of:
> a) Make BusinessTreasury use an `initialize(tokenAddress)` function (recommended)
> b) Use CREATE2 to predict addresses
> c) Deploy treasury first with address(0) token, deploy token, then call `treasury.setToken(tokenAddress)`
>
> Choose option (a) or (c) during implementation. Update BusinessTreasury constructor accordingly.

**Step 2: Write integration tests for factory**

**Step 3: Run full test suite**

```bash
cd contracts && npx hardhat test
```

**Step 4: Commit**

```bash
git add contracts/contracts/BusinessFactory.sol contracts/test/BusinessFactory.test.ts
git commit -m "feat(contracts): add BusinessFactory for creating businesses"
```

---

### Task 5: Deploy factory to Sepolia

**Files:**
- Create: `contracts/scripts/deploy.ts`
- Create: `contracts/.env.example`

**Step 1: Write deploy script**

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await ethers.getContractFactory("BusinessFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("BusinessFactory deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Step 2: Deploy to Sepolia** (requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env)

```bash
cd contracts && npx hardhat run scripts/deploy.ts --network sepolia
```

**Step 3: Save factory address to shared constants** (see Task 7)

**Step 4: Commit**

```bash
git add contracts/scripts/ contracts/.env.example
git commit -m "feat(contracts): add deploy script, deploy factory to Sepolia"
```

---

## Phase 2: Shared Package (packages/shared/)

### Task 6: Add business types

**Files:**
- Create: `packages/shared/src/types/business.ts`
- Modify: `packages/shared/src/types/wallet.ts` — add `'business'` to `AccountType`
- Modify: `packages/shared/src/types/index.ts` — export business types

**Step 1: Extend AccountType**

In `packages/shared/src/types/wallet.ts`, change:
```typescript
export type AccountType = 'test' | 'real' | 'business';
```

**Step 2: Create business types**

Create `packages/shared/src/types/business.ts`:
```typescript
export type TransferPolicy = 'FREE' | 'APPROVAL_REQUIRED';

export type ProposalType = 'WITHDRAW_ETH' | 'WITHDRAW_TOKEN' | 'TRANSFER_SHARES' | 'CHANGE_SETTINGS' | 'CUSTOM';

export type ProposalStatus = 'active' | 'passed' | 'rejected' | 'executed' | 'canceled';

export interface BusinessWallet {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tokenSymbol: string;
  tokenSupply: number;
  contractAddress: string;    // BusinessToken address
  treasuryAddress: string;    // BusinessTreasury address
  factoryTxHash: string;
  network: string;
  transferPolicy: TransferPolicy;
  quorumThreshold: number;    // basis points (5100 = 51%)
  votingPeriod: number;       // seconds
  vestingEnabled: boolean;
  vestingConfig?: VestingConfig;
  dividendsEnabled: boolean;
  dividendsConfig?: DividendConfig;
  createdBy: string;
  createdAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  address: string;
  username?: string;
  initialShares: number;
  currentShares?: number;     // from on-chain query
  role: 'founder' | 'member';
  joinedAt: string;
}

export interface Proposal {
  id: string;
  businessId: string;
  onChainId: number;
  type: ProposalType;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  deadline: string;
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  totalSupply: number;
  quorumThreshold: number;
  createdBy: string;
  createdAt: string;
}

export interface Vote {
  proposalId: string;
  voterAddress: string;
  support: boolean;
  weight: number;
  txHash?: string;
  votedAt: string;
}

export interface VestingConfig {
  cliffMonths: number;
  durationMonths: number;
  schedule: 'linear' | 'custom';
}

export interface DividendConfig {
  frequency: 'manual' | 'weekly' | 'monthly' | 'quarterly';
  percentage: number;         // % of treasury to distribute
  token?: string;             // token address to distribute
}

export interface BusinessActivity {
  id: string;
  businessId: string;
  type: 'created' | 'proposal' | 'vote' | 'executed' | 'transfer' | 'deposit' | 'dividend';
  description: string;
  actorAddress?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateBusinessParams {
  name: string;
  description?: string;
  icon?: string;
  tokenSymbol: string;
  tokenSupply: number;
  founders: { address: string; username?: string; shares: number }[];
  transferPolicy: TransferPolicy;
  quorumThreshold: number;
  votingPeriod: number;
  vestingEnabled: boolean;
  vestingConfig?: VestingConfig;
  dividendsEnabled: boolean;
  dividendsConfig?: DividendConfig;
}
```

**Step 3: Export from types/index.ts**

Add `export * from './business';` to `packages/shared/src/types/index.ts`.

**Step 4: Run typecheck**

```bash
cd /path/to/e-y && pnpm turbo typecheck
```

**Step 5: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat(shared): add business wallet types and extend AccountType"
```

---

### Task 7: Add business constants (ABIs, addresses)

**Files:**
- Create: `packages/shared/src/constants/business.ts`
- Modify: `packages/shared/src/constants/index.ts` — export
- Modify: `packages/shared/src/constants/errors.ts` — add business error codes

**Step 1: Create business constants**

Create `packages/shared/src/constants/business.ts` with:
- Contract ABIs (from Hardhat compilation artifacts — simplified ABI arrays)
- Factory address on Sepolia
- Default config values (quorum 5100, voting period 172800, etc.)
- Limits (MIN_SUPPLY=2, MAX_SUPPLY=1000000, MAX_MEMBERS=50, etc.)

**Step 2: Add error codes to errors.ts**

```typescript
BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
BUSINESS_INVALID_SHARES: 'BUSINESS_INVALID_SHARES',
BUSINESS_QUORUM_NOT_REACHED: 'BUSINESS_QUORUM_NOT_REACHED',
BUSINESS_PROPOSAL_EXPIRED: 'BUSINESS_PROPOSAL_EXPIRED',
BUSINESS_ALREADY_VOTED: 'BUSINESS_ALREADY_VOTED',
BUSINESS_NOT_MEMBER: 'BUSINESS_NOT_MEMBER',
BUSINESS_DEPLOY_FAILED: 'BUSINESS_DEPLOY_FAILED',
```

**Step 3: Export and typecheck**

**Step 4: Commit**

```bash
git commit -m "feat(shared): add business constants, ABIs, and error codes"
```

---

### Task 8: Add business utils

**Files:**
- Create: `packages/shared/src/utils/business.ts`
- Modify: `packages/shared/src/utils/account.ts` — handle 'business' type
- Modify: `packages/shared/src/utils/index.ts` — export

**Step 1: Create business utils**

Create `packages/shared/src/utils/business.ts`:
```typescript
export function calculateOwnershipPercent(balance: number, totalSupply: number): number {
  if (totalSupply === 0) return 0;
  return Math.round((balance / totalSupply) * 10000) / 100; // 2 decimal places
}

export function calculateDividendShare(
  holderTokens: number, totalSupply: number, distributionAmount: bigint
): bigint {
  if (totalSupply === 0) return 0n;
  return (distributionAmount * BigInt(holderTokens)) / BigInt(totalSupply);
}

export function isQuorumReached(forVotes: number, totalSupply: number, thresholdBps: number): boolean {
  return forVotes * 10000 >= totalSupply * thresholdBps;
}

export function formatShareAmount(amount: number, totalSupply: number): string {
  const percent = calculateOwnershipPercent(amount, totalSupply);
  return `${amount} (${percent}%)`;
}

export function validateBusinessParams(params: {
  name: string;
  tokenSymbol: string;
  tokenSupply: number;
  founders: { shares: number }[];
}): { valid: boolean; error?: string } {
  if (params.name.length < 3 || params.name.length > 50)
    return { valid: false, error: 'Name must be 3-50 characters' };
  if (!/^[A-Z]{2,6}$/.test(params.tokenSymbol))
    return { valid: false, error: 'Symbol must be 2-6 uppercase letters' };
  if (params.tokenSupply < 2 || params.tokenSupply > 1000000)
    return { valid: false, error: 'Supply must be 2-1,000,000' };
  const totalShares = params.founders.reduce((sum, f) => sum + f.shares, 0);
  if (totalShares !== params.tokenSupply)
    return { valid: false, error: 'Shares must equal total supply' };
  if (params.founders.length < 1 || params.founders.length > 50)
    return { valid: false, error: 'Must have 1-50 founders' };
  return { valid: true };
}

export function proposalTypeToIndex(type: string): number {
  const map: Record<string, number> = {
    WITHDRAW_ETH: 0, WITHDRAW_TOKEN: 1, TRANSFER_SHARES: 2, CHANGE_SETTINGS: 3, CUSTOM: 4
  };
  return map[type] ?? 4;
}
```

**Step 2: Update account.ts**

In `packages/shared/src/utils/account.ts`, update `generateAccountLabel`:
```typescript
// Add to the switch/if for type === 'business':
if (type === 'business') return `Business ${index + 1}`;
```

**Step 3: Export and typecheck**

**Step 4: Commit**

```bash
git commit -m "feat(shared): add business utils and account label generation"
```

---

### Task 9: Add business services (shared)

**Files:**
- Create: `packages/shared/src/services/business-factory.ts`
- Create: `packages/shared/src/services/business-token.ts`
- Create: `packages/shared/src/services/business-treasury.ts`
- Create: `packages/shared/src/services/business-governance.ts`
- Modify: `packages/shared/src/services/index.ts` — export

These services accept `ethers.Provider` and `ethers.Signer` via dependency injection (no direct ethers import — the caller provides them). They use contract ABIs from constants.

**Pattern:** Each function takes a `provider` or `signer` as first arg, contract address as second, then params. Returns typed results. Uses `ethers.Contract` for interaction.

> **Note:** Since `@e-y/shared` has zero runtime dependencies, these services accept generic interfaces for provider/signer rather than importing ethers directly. The calling app (web/mobile) passes the real ethers objects.

**Step 1: Write business-factory.ts** — `createBusiness()`, `getBusinessesByOwner()`, `getBusiness()`

**Step 2: Write business-token.ts** — `getTokenInfo()`, `getHolders()`, `transferShares()`, `getBalance()`

**Step 3: Write business-treasury.ts** — `getTreasuryBalance()`, `depositEth()`, `depositToken()`

**Step 4: Write business-governance.ts** — `createProposal()`, `vote()`, `executeProposal()`, `getProposals()`, `getVotes()`

**Step 5: Export all from services/index.ts**

**Step 6: Typecheck**

**Step 7: Commit**

```bash
git commit -m "feat(shared): add business wallet contract services"
```

---

### Task 10: Add business API client (shared)

**Files:**
- Create: `packages/shared/src/api/business-api.ts`
- Modify: `packages/shared/src/api/index.ts` — export

For off-chain metadata operations (business CRUD, proposal metadata, activity log).

**Step 1: Create business-api.ts**

Follow the pattern from `split-api.ts` — functions that use `ApiClient`:
```typescript
export function createBusinessApi(client: ApiClient) {
  return {
    saveBusiness(data: SaveBusinessRequest): Promise<BusinessWallet>
    getBusiness(contractAddress: string): Promise<BusinessWallet>
    getUserBusinesses(address: string): Promise<BusinessWallet[]>
    saveProposal(businessId: string, data: SaveProposalRequest): Promise<Proposal>
    getActivity(businessId: string): Promise<BusinessActivity[]>
    updateBusiness(id: string, data: Partial<BusinessWallet>): Promise<BusinessWallet>
  };
}
```

**Step 2: Export and typecheck**

**Step 3: Commit**

```bash
git commit -m "feat(shared): add business API client"
```

---

## Phase 3: Backend (NestJS)

### Task 11: Database migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_business_tables.sql`

**Step 1: Write migration**

SQL with 4 tables: `businesses`, `business_members`, `business_proposals`, `business_activity`. Follow existing pattern (UUID PKs, RLS, indexes, gen_random_uuid()). See design doc Section 6.4 for full schema.

**Step 2: Apply migration**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git commit -m "feat(api): add business wallet database migration"
```

---

### Task 12: NestJS business module

**Files:**
- Create: `apps/api/src/business/business.module.ts`
- Create: `apps/api/src/business/business.controller.ts`
- Create: `apps/api/src/business/business.service.ts`
- Create: `apps/api/src/business/business.gateway.ts`
- Create: `apps/api/src/business/dto/create-business.dto.ts`
- Create: `apps/api/src/business/dto/create-proposal.dto.ts`
- Create: `apps/api/src/business/dto/index.ts`
- Create: `apps/api/src/business/entities/business.entity.ts`
- Create: `apps/api/src/business/entities/index.ts`
- Create: `apps/api/src/business/index.ts`
- Modify: `apps/api/src/app.module.ts` — import BusinessModule

Follow the split module pattern exactly:
- Controller: REST endpoints for metadata CRUD
- Service: Supabase queries with snake_case → camelCase mapping
- Gateway: extends `BaseSubscriptionGateway`, namespace `/business`
- DTOs: class-validator decorators
- Entities: pure TypeScript interfaces

**REST Endpoints:**
```
POST   /api/business                    — save business metadata after deploy
GET    /api/business/:contractAddress   — get business details
GET    /api/business/user/:address      — get user's businesses
POST   /api/business/:id/proposal       — save proposal metadata
GET    /api/business/:id/activity       — get activity log
PUT    /api/business/:id                — update metadata
```

**WebSocket Events (namespace: /business):**
```
emit: 'proposal-created'    — new proposal notification
emit: 'vote-cast'           — vote notification
emit: 'proposal-executed'   — execution notification
emit: 'member-joined'       — new member notification
```

**Steps:** Create each file, register module in app.module.ts, typecheck, commit.

```bash
git commit -m "feat(api): add business wallet module with REST + WebSocket"
```

---

## Phase 4: Web App

### Task 13: Extend account system for 'business' type

**Files:**
- Modify: `packages/shared/src/config/networks.ts` — handle 'business' type
- Modify: `apps/web/src/contexts/account-context.tsx` — support business accounts
- Modify: `apps/web/src/components/AccountSelector.tsx` — add "New Business Wallet" option

**Step 1: Update network config**

In `packages/shared/src/config/networks.ts`, make 'business' map to Sepolia (same as 'test' for now).

**Step 2: Update AccountSelector.tsx**

Add a 4th option in the 'add' view:
```tsx
<button onClick={() => handleAddWallet('business')}>
  <BusinessIcon />
  <div>
    <span>New Business Wallet</span>
    <span className="text-white/40">Tokenized equity</span>
  </div>
</button>
```

When clicked, instead of calling `addAccount('business')` directly, navigate to `/wallet/business/create` (new multi-step creation flow).

**Step 3: Update account-context.tsx**

The `addAccount` function already takes `type: AccountType`. Ensure it handles 'business' — derive address the same way, but label differently.

**Step 4: Typecheck and test manually**

**Step 5: Commit**

```bash
git commit -m "feat(web): extend account system for business wallet type"
```

---

### Task 14: Business creation flow (multi-step wizard)

**Files:**
- Create: `apps/web/src/app/wallet/business/create/page.tsx`
- Create: `apps/web/src/components/business/CreateBusinessWizard.tsx`
- Create: `apps/web/src/components/business/FounderAllocation.tsx`
- Create: `apps/web/src/components/business/BusinessSettings.tsx`
- Create: `apps/web/src/components/business/BusinessReview.tsx`

5-step wizard following the design doc Flow 1:
1. Basic Info (name, description, icon)
2. Token Setup (symbol, supply)
3. Add Founders (address/@username + share allocation + pie chart)
4. Settings (transfer policy, quorum, vesting, dividends — collapsible)
5. Review & Deploy (summary + gas estimate + deploy button)

Use existing glass-card design system. Each step is a component.

On deploy:
1. Call `createBusiness()` from shared service (signs tx via ethers)
2. Wait for tx confirmation
3. Save metadata to backend via business API
4. Create the business account in AccountContext
5. Navigate to business dashboard

**Commit after each sub-component works.**

---

### Task 15: Business dashboard page

**Files:**
- Create: `apps/web/src/app/wallet/business/page.tsx`
- Create: `apps/web/src/components/business/BusinessDashboard.tsx`
- Create: `apps/web/src/components/business/OwnershipChart.tsx`
- Create: `apps/web/src/components/business/TreasuryBalance.tsx`
- Create: `apps/web/src/components/business/ProposalCard.tsx`
- Create: `apps/web/src/components/business/ActivityFeed.tsx`

Dashboard layout from design doc Flow 2:
- Business header (name, token symbol, supply)
- Treasury balance (ETH + tokens with USD values)
- Ownership pie chart with member list
- Active proposals with vote progress bars
- Activity feed (recent events)
- Action buttons: Send Shares, New Proposal, Deposit to Treasury

Read data from:
- On-chain: token balances, treasury balance (via shared services)
- Off-chain: metadata, proposals, activity (via business API)

---

### Task 16: Proposal creation and voting UI

**Files:**
- Create: `apps/web/src/app/wallet/business/proposal/page.tsx`
- Create: `apps/web/src/components/business/CreateProposal.tsx`
- Create: `apps/web/src/components/business/VotePanel.tsx`
- Create: `apps/web/src/components/business/ProposalDetail.tsx`

**Create Proposal:**
- Select type (Withdraw ETH, Withdraw Token, Transfer Shares, Change Settings, Custom)
- Fill type-specific fields
- Set deadline
- Submit → signs on-chain tx + saves metadata to backend

**Vote:**
- Show proposal details + current vote tally
- For / Against buttons
- Progress bar with quorum threshold
- Sign vote tx on-chain

**Execute:**
- When quorum reached, show "Execute" button
- Signs execution tx on-chain

---

### Task 17: Share transfer UI

**Files:**
- Create: `apps/web/src/app/wallet/business/transfer/page.tsx`
- Create: `apps/web/src/components/business/TransferShares.tsx`

- Recipient input (address or @username with lookup)
- Amount input with remaining balance display
- If FREE policy → direct transfer tx
- If APPROVAL_REQUIRED → creates proposal automatically
- Confirmation screen → sign tx

---

## Phase 5: Integration & Polish

### Task 18: WebSocket notifications for business events

**Files:**
- Create: `packages/shared/src/services/business-socket.ts`
- Wire into web app components

Follow the `blik-socket.ts` pattern:
- Connect to `/business` namespace
- Subscribe by business contract address
- Listen for: proposal-created, vote-cast, proposal-executed, member-joined
- Update UI reactively when events arrive

---

### Task 19: AI Agent tools for business wallet

**Files:**
- Create: `apps/api/src/ai/tools/business-list.tool.ts`
- Create: `apps/api/src/ai/tools/business-info.tool.ts`
- Modify: `apps/api/src/ai/tools/index.ts` — register new tools

Add 2 AI tools:
- `business_list` — list user's businesses with key stats
- `business_info` — get details of a specific business (members, treasury, proposals)

Follow existing tool pattern (function schema + handler + result formatting).

---

### Task 20: Real Wallet mainnet migration

**Files:**
- Modify: `packages/shared/src/config/networks.ts` — map 'real' to mainnet networks
- Modify: `packages/shared/src/config/multi-network.ts` — add mainnet RPC URLs
- Modify: `apps/web/src/components/AccountSelector.tsx` — update descriptions
- Add: visual badges (TEST / REAL / BUSINESS) on wallet selector

**Steps:**
1. Add mainnet Alchemy RPC URLs as env vars
2. Map `'real'` AccountType to mainnet network configs
3. Add clear visual distinction (colored badges) in AccountSelector
4. Add warning modal when switching to Real Wallet: "Transactions use real funds"
5. Test that Test Wallet still works on Sepolia
6. Commit

---

### Task 21: Final verification & deploy

**Steps:**
1. Run full typecheck: `pnpm turbo typecheck`
2. Test smart contracts: `cd contracts && npx hardhat test`
3. Verify web app builds: `cd apps/web && pnpm build`
4. Verify API builds: `cd apps/api && pnpm build`
5. Manual E2E test: create business wallet → add members → create proposal → vote → execute
6. Deploy API: `railway up -d` from monorepo root
7. Deploy web: `vercel --prod` from monorepo root
8. Final commit

```bash
git commit -m "feat: business wallet — complete implementation"
```

---

## Dependency Graph

```
Task 1 (Hardhat setup)
  → Task 2 (BusinessToken)
    → Task 3 (BusinessTreasury)
      → Task 4 (BusinessFactory)
        → Task 5 (Deploy to Sepolia)

Task 6 (Types) — can start in parallel with Tasks 1-5
  → Task 7 (Constants) — needs ABIs from Task 4
  → Task 8 (Utils)
  → Task 9 (Services) — needs constants from Task 7
  → Task 10 (API client)

Task 11 (Migration) — can start in parallel
  → Task 12 (NestJS module)

Task 6 + Task 12 → Task 13 (Account system)
  → Task 14 (Creation wizard)
  → Task 15 (Dashboard)
  → Task 16 (Proposals)
  → Task 17 (Transfers)

Task 12 → Task 18 (WebSocket)
Task 12 → Task 19 (AI tools)
Task 6 → Task 20 (Mainnet migration)

All → Task 21 (Verification)
```

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Smart Contracts | 1-5 | High (new Solidity code) |
| Shared Package | 6-10 | Medium (follows existing patterns) |
| Backend | 11-12 | Medium (follows split module pattern) |
| Web App | 13-17 | High (new UI flows, contract interaction) |
| Integration | 18-21 | Medium (wiring + polish) |

---

*Plan created: 2026-02-13*
*Design doc: `docs/plans/2026-02-13-business-wallet-design.md`*
