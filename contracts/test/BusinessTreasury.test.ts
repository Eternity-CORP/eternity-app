import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BusinessToken, BusinessTreasury } from "../typechain-types";

describe("BusinessTreasury", function () {
  let token: BusinessToken;
  let treasury: BusinessTreasury;
  let owner: any, alice: any, bob: any, nonHolder: any;

  const QUORUM_BPS = 5100; // 51%
  const VOTING_PERIOD = 172800; // 48 hours

  beforeEach(async function () {
    [owner, alice, bob, nonHolder] = await ethers.getSigners();

    // Deploy treasury first (simulating what the factory does)
    const BusinessTreasury =
      await ethers.getContractFactory("BusinessTreasury");
    treasury = await BusinessTreasury.deploy(QUORUM_BPS, VOTING_PERIOD);

    // Deploy token with treasury address
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    token = await BusinessToken.deploy(
      "Test Business",
      "TBIZ",
      100,
      [owner.address, alice.address],
      [60, 40],
      await treasury.getAddress(),
      0 // FREE
    );

    // Initialize treasury with token address
    await treasury.initialize(await token.getAddress());
  });

  describe("Initialization", function () {
    it("should be initialized with correct token", async function () {
      expect(await treasury.token()).to.equal(await token.getAddress());
      expect(await treasury.initialized()).to.equal(true);
    });

    it("should have correct quorum and voting period", async function () {
      expect(await treasury.quorumBps()).to.equal(QUORUM_BPS);
      expect(await treasury.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("should reject double initialization", async function () {
      await expect(
        treasury.initialize(await token.getAddress())
      ).to.be.revertedWithCustomError(treasury, "AlreadyInitialized");
    });

    it("should reject initialization from non-factory", async function () {
      const BusinessTreasury =
        await ethers.getContractFactory("BusinessTreasury");
      const treasury2 = await BusinessTreasury.deploy(QUORUM_BPS, VOTING_PERIOD);

      // alice is not the factory (deployer is)
      await expect(
        treasury2.connect(alice).initialize(await token.getAddress())
      ).to.be.revertedWithCustomError(treasury2, "OnlyFactory");
    });
  });

  describe("Deposits", function () {
    it("should accept ETH deposits", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });
      expect(await treasury.ethBalance()).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("Proposals", function () {
    it("should allow token holders to create proposals", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, ethers.parseEther("0.1")]
      );
      await expect(treasury.connect(owner).createProposal(0, data))
        .to.emit(treasury, "ProposalCreated")
        .withArgs(0, 0, owner.address);
    });

    it("should reject proposals from non-holders", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, ethers.parseEther("0.1")]
      );
      await expect(
        treasury.connect(nonHolder).createProposal(0, data)
      ).to.be.revertedWithCustomError(treasury, "NotTokenHolder");
    });

    it("should store proposal data correctly", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, ethers.parseEther("0.1")]
      );
      await treasury.connect(owner).createProposal(0, data);

      const proposal = await treasury.getProposal(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.proposalType).to.equal(0); // WITHDRAW_ETH
      expect(proposal.creator).to.equal(owner.address);
      expect(proposal.status).to.equal(0); // ACTIVE
      expect(proposal.snapshotSupply).to.equal(100);
    });

    it("should increment proposal count", async function () {
      const data = "0x";
      await treasury.connect(owner).createProposal(4, data); // CUSTOM
      await treasury.connect(owner).createProposal(4, data); // CUSTOM
      expect(await treasury.proposalCount()).to.equal(2);
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, ethers.parseEther("0.1")]
      );
      await treasury.connect(owner).createProposal(0, data);
    });

    it("should allow token holders to vote", async function () {
      await expect(treasury.connect(owner).vote(0, true))
        .to.emit(treasury, "Voted")
        .withArgs(0, owner.address, true, 60);
    });

    it("should record vote weight based on token balance", async function () {
      await treasury.connect(alice).vote(0, true);
      const proposal = await treasury.getProposal(0);
      expect(proposal.forVotes).to.equal(40);
    });

    it("should reject double voting", async function () {
      // Use alice (40 shares) — doesn't reach quorum, so proposal stays ACTIVE
      await treasury.connect(alice).vote(0, true);
      await expect(
        treasury.connect(alice).vote(0, true)
      ).to.be.revertedWithCustomError(treasury, "AlreadyVoted");
    });

    it("should reject votes from non-holders", async function () {
      await expect(
        treasury.connect(nonHolder).vote(0, true)
      ).to.be.revertedWithCustomError(treasury, "NotTokenHolder");
    });

    it("should reject votes after deadline", async function () {
      await time.increase(VOTING_PERIOD + 1);
      await expect(
        treasury.connect(owner).vote(0, true)
      ).to.be.revertedWithCustomError(treasury, "VotingEnded");
    });

    it("should auto-pass when quorum reached", async function () {
      // Owner has 60 tokens out of 100, quorum is 51%
      // 60 * 10000 = 600000 >= 100 * 5100 = 510000 -> PASSES
      await treasury.connect(owner).vote(0, true);
      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(1); // PASSED
    });

    it("should not auto-pass when quorum not reached", async function () {
      // Alice has 40 tokens out of 100, quorum is 51%
      // 40 * 10000 = 400000 < 100 * 5100 = 510000 -> stays ACTIVE
      await treasury.connect(alice).vote(0, true);
      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(0); // ACTIVE
    });

    it("should record against votes correctly", async function () {
      await treasury.connect(owner).vote(0, false);
      const proposal = await treasury.getProposal(0);
      expect(proposal.againstVotes).to.equal(60);
      expect(proposal.forVotes).to.equal(0);
    });
  });

  describe("Execution", function () {
    it("should execute ETH withdrawal after quorum", async function () {
      // Fund treasury
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const withdrawAmount = ethers.parseEther("0.5");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, withdrawAmount]
      );
      await treasury.connect(owner).createProposal(0, data); // WITHDRAW_ETH
      await treasury.connect(owner).vote(0, true); // quorum reached

      const bobBalBefore = await ethers.provider.getBalance(bob.address);
      await treasury.connect(alice).executeProposal(0);
      const bobBalAfter = await ethers.provider.getBalance(bob.address);

      expect(bobBalAfter - bobBalBefore).to.equal(withdrawAmount);

      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(3); // EXECUTED
    });

    it("should execute share transfers after quorum", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256"],
        [owner.address, bob.address, 10]
      );
      await treasury.connect(owner).createProposal(2, data); // TRANSFER_SHARES
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await token.balanceOf(bob.address)).to.equal(10);
      expect(await token.balanceOf(owner.address)).to.equal(50);
    });

    it("should execute settings change after quorum", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [7000, 86400] // new quorum 70%, new voting period 24h
      );
      await treasury.connect(owner).createProposal(3, data); // CHANGE_SETTINGS
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.quorumBps()).to.equal(7000);
      expect(await treasury.votingPeriod()).to.equal(86400);
    });

    it("should reject execution of non-passed proposals", async function () {
      const data = "0x";
      await treasury.connect(owner).createProposal(4, data);
      await expect(
        treasury.connect(owner).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "ProposalNotPassed");
    });
  });

  describe("Cancel", function () {
    it("should allow creator to cancel active proposal", async function () {
      const data = "0x";
      await treasury.connect(owner).createProposal(4, data);
      await expect(treasury.connect(owner).cancelProposal(0))
        .to.emit(treasury, "ProposalCanceled")
        .withArgs(0);

      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(4); // CANCELED
    });

    it("should reject cancellation by non-creator", async function () {
      const data = "0x";
      await treasury.connect(owner).createProposal(4, data);
      await expect(
        treasury.connect(alice).cancelProposal(0)
      ).to.be.revertedWithCustomError(treasury, "OnlyCreator");
    });

    it("should reject cancellation of non-active proposal", async function () {
      const data = "0x";
      await treasury.connect(owner).createProposal(4, data);
      await treasury.connect(owner).cancelProposal(0);
      await expect(
        treasury.connect(owner).cancelProposal(0)
      ).to.be.revertedWithCustomError(treasury, "ProposalNotActive");
    });
  });

  describe("Dividends Distribution (Pull-Based)", function () {
    it("should record pending dividends pro-rata to holders", async function () {
      // Fund treasury with 1 ETH
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );

      // Create DISTRIBUTE_DIVIDENDS proposal (type index 5)
      await treasury.connect(owner).createProposal(5, data);
      // Owner votes (60/100 >= 51% quorum) -> PASSED
      await treasury.connect(owner).vote(0, true);

      // Execute — should NOT send ETH directly, only record pendingDividends
      await treasury.connect(bob).executeProposal(0);

      // owner has 60/100 shares -> 0.6 ETH pending, alice has 40/100 -> 0.4 ETH pending
      expect(await treasury.getPendingDividends(owner.address)).to.equal(
        ethers.parseEther("0.6")
      );
      expect(await treasury.getPendingDividends(alice.address)).to.equal(
        ethers.parseEther("0.4")
      );

      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(3); // EXECUTED
    });

    it("should emit DividendsDistributed event", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);

      await expect(treasury.connect(bob).executeProposal(0))
        .to.emit(treasury, "DividendsDistributed")
        .withArgs(0, totalAmount, 2);
    });

    it("should increment dividendRoundId after distribution", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      expect(await treasury.dividendRoundId()).to.equal(0);

      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(bob).executeProposal(0);

      expect(await treasury.dividendRoundId()).to.equal(1);
    });

    it("should skip holders with 0 balance", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const totalAmount = ethers.parseEther("1.0");
      // Include nonHolder (0 balance) in holders array
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address, nonHolder.address]]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);

      // recipientCount should be 2, not 3 (nonHolder skipped)
      await expect(treasury.connect(bob).executeProposal(0))
        .to.emit(treasury, "DividendsDistributed")
        .withArgs(0, totalAmount, 2);

      // nonHolder should have 0 pending
      expect(await treasury.getPendingDividends(nonHolder.address)).to.equal(0);
    });

    it("should revert with InsufficientTreasuryBalance if treasury has less ETH", async function () {
      // Fund treasury with only 0.5 ETH
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("0.5"),
      });

      // Try to distribute 1 ETH
      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);

      await expect(
        treasury.connect(bob).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "InsufficientTreasuryBalance");
    });

    it("should handle empty holders array with 0 recipients", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, []]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);

      await expect(treasury.connect(bob).executeProposal(0))
        .to.emit(treasury, "DividendsDistributed")
        .withArgs(0, totalAmount, 0);
    });

    it("should accumulate dividends across multiple rounds", async function () {
      // Fund treasury with 2 ETH
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("2.0"),
      });

      const totalAmount = ethers.parseEther("1.0");

      // Round 1
      const data1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );
      await treasury.connect(owner).createProposal(5, data1);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(bob).executeProposal(0);

      // Round 2
      const data2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );
      await treasury.connect(owner).createProposal(5, data2);
      await treasury.connect(owner).vote(1, true);
      await treasury.connect(bob).executeProposal(1);

      // Pending dividends should be accumulated: 0.6 + 0.6 = 1.2 for owner
      expect(await treasury.getPendingDividends(owner.address)).to.equal(
        ethers.parseEther("1.2")
      );
      // 0.4 + 0.4 = 0.8 for alice
      expect(await treasury.getPendingDividends(alice.address)).to.equal(
        ethers.parseEther("0.8")
      );
      expect(await treasury.dividendRoundId()).to.equal(2);
    });
  });

  describe("Claim Dividends", function () {
    beforeEach(async function () {
      // Fund treasury and distribute dividends
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const totalAmount = ethers.parseEther("1.0");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address[]"],
        [totalAmount, [owner.address, alice.address]]
      );

      await treasury.connect(owner).createProposal(5, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(bob).executeProposal(0);
    });

    it("should allow holder to claim pending dividends", async function () {
      const ownerBalBefore = await ethers.provider.getBalance(owner.address);

      const tx = await treasury.connect(owner).claimDividends();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);

      // owner had 0.6 ETH pending
      expect(ownerBalAfter - ownerBalBefore + gasCost).to.equal(
        ethers.parseEther("0.6")
      );

      // Pending should be 0 after claim
      expect(await treasury.getPendingDividends(owner.address)).to.equal(0);
    });

    it("should emit DividendsClaimed event", async function () {
      await expect(treasury.connect(owner).claimDividends())
        .to.emit(treasury, "DividendsClaimed")
        .withArgs(owner.address, ethers.parseEther("0.6"));
    });

    it("should revert if no dividends to claim", async function () {
      await expect(
        treasury.connect(nonHolder).claimDividends()
      ).to.be.revertedWithCustomError(treasury, "NoDividendsToClaim");
    });

    it("should revert on second claim (already claimed)", async function () {
      await treasury.connect(owner).claimDividends();

      await expect(
        treasury.connect(owner).claimDividends()
      ).to.be.revertedWithCustomError(treasury, "NoDividendsToClaim");
    });

    it("should allow multiple holders to claim independently", async function () {
      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      const aliceBalBefore = await ethers.provider.getBalance(alice.address);

      const tx1 = await treasury.connect(owner).claimDividends();
      const receipt1 = await tx1.wait();
      const gas1 = receipt1!.gasUsed * receipt1!.gasPrice;

      const tx2 = await treasury.connect(alice).claimDividends();
      const receipt2 = await tx2.wait();
      const gas2 = receipt2!.gasUsed * receipt2!.gasPrice;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);
      const aliceBalAfter = await ethers.provider.getBalance(alice.address);

      expect(ownerBalAfter - ownerBalBefore + gas1).to.equal(
        ethers.parseEther("0.6")
      );
      expect(aliceBalAfter - aliceBalBefore + gas2).to.equal(
        ethers.parseEther("0.4")
      );
    });

    it("should return correct value from getPendingDividends view", async function () {
      expect(await treasury.getPendingDividends(owner.address)).to.equal(
        ethers.parseEther("0.6")
      );
      expect(await treasury.getPendingDividends(alice.address)).to.equal(
        ethers.parseEther("0.4")
      );
      expect(await treasury.getPendingDividends(nonHolder.address)).to.equal(0);
    });
  });

  describe("Quorum Bounds Validation", function () {
    it("should reject quorum below 25% (2500 bps)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [2000, 0] // 20% quorum, keep voting period
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);

      await expect(
        treasury.connect(alice).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "InvalidQuorumBps");
    });

    it("should reject quorum above 100% (10000 bps)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [10001, 0] // 100.01% quorum
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);

      await expect(
        treasury.connect(alice).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "InvalidQuorumBps");
    });

    it("should accept quorum at lower bound (25%)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [2500, 0] // exactly 25%
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.quorumBps()).to.equal(2500);
    });

    it("should accept quorum at upper bound (100%)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [10000, 0] // exactly 100%
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.quorumBps()).to.equal(10000);
    });

    it("should reject voting period below 1 hour", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [0, 3599] // keep quorum, 59m59s voting period
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);

      await expect(
        treasury.connect(alice).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "InvalidVotingPeriod");
    });

    it("should reject voting period above 30 days", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [0, 30 * 24 * 3600 + 1] // 30 days + 1 second
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);

      await expect(
        treasury.connect(alice).executeProposal(0)
      ).to.be.revertedWithCustomError(treasury, "InvalidVotingPeriod");
    });

    it("should accept voting period at lower bound (1 hour)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [0, 3600] // exactly 1 hour
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.votingPeriod()).to.equal(3600);
    });

    it("should accept voting period at upper bound (30 days)", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [0, 30 * 24 * 3600] // exactly 30 days
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.votingPeriod()).to.equal(30 * 24 * 3600);
    });

    it("should accept valid quorum and voting period together", async function () {
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [7000, 86400] // 70% quorum, 24h voting period
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.quorumBps()).to.equal(7000);
      expect(await treasury.votingPeriod()).to.equal(86400);
    });

    it("should skip validation when value is 0 (keep existing)", async function () {
      const originalQuorum = await treasury.quorumBps();
      const originalPeriod = await treasury.votingPeriod();

      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [0, 0] // keep both existing values
      );
      await treasury.connect(owner).createProposal(3, data);
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await treasury.quorumBps()).to.equal(originalQuorum);
      expect(await treasury.votingPeriod()).to.equal(originalPeriod);
    });
  });
});
