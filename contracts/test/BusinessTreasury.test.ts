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
});
