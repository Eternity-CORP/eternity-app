import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BusinessFactory,
  BusinessToken,
  BusinessTreasury,
} from "../typechain-types";

describe("BusinessFactory", function () {
  let factory: BusinessFactory;
  let owner: any, alice: any, bob: any;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const BusinessFactory =
      await ethers.getContractFactory("BusinessFactory");
    factory = await BusinessFactory.deploy();
  });

  describe("createBusiness", function () {
    it("should deploy token and treasury and link them", async function () {
      const tx = await factory.connect(owner).createBusiness({
        name: "Acme Inc",
        symbol: "ACME",
        totalSupply: 100,
        founders: [owner.address, alice.address],
        shares: [60, 40],
        transferPolicy: 0, // FREE
        quorumBps: 5100,
        votingPeriod: 172800,
      });
      const receipt = await tx.wait();

      // Verify business was stored
      expect(await factory.getBusinessCount()).to.equal(1);

      const business = await factory.getBusiness(0);
      expect(business.tokenAddress).to.not.equal(ethers.ZeroAddress);
      expect(business.treasuryAddress).to.not.equal(ethers.ZeroAddress);
      expect(business.creator).to.equal(owner.address);
      expect(business.name).to.equal("Acme Inc");
    });

    it("should emit BusinessCreated event", async function () {
      await expect(
        factory.connect(owner).createBusiness({
          name: "Acme Inc",
          symbol: "ACME",
          totalSupply: 100,
          founders: [owner.address],
          shares: [100],
          transferPolicy: 0,
          quorumBps: 5100,
          votingPeriod: 172800,
        })
      ).to.emit(factory, "BusinessCreated");
    });

    it("should mint tokens to founders correctly", async function () {
      await factory.connect(owner).createBusiness({
        name: "Acme Inc",
        symbol: "ACME",
        totalSupply: 100,
        founders: [owner.address, alice.address],
        shares: [60, 40],
        transferPolicy: 0,
        quorumBps: 5100,
        votingPeriod: 172800,
      });

      const business = await factory.getBusiness(0);
      const token = await ethers.getContractAt(
        "BusinessToken",
        business.tokenAddress
      );

      expect(await token.balanceOf(owner.address)).to.equal(60);
      expect(await token.balanceOf(alice.address)).to.equal(40);
      expect(await token.totalSupply()).to.equal(100);
      expect(await token.decimals()).to.equal(0);
    });

    it("should initialize treasury correctly", async function () {
      await factory.connect(owner).createBusiness({
        name: "Acme Inc",
        symbol: "ACME",
        totalSupply: 100,
        founders: [owner.address],
        shares: [100],
        transferPolicy: 0,
        quorumBps: 100,
        votingPeriod: 3600,
      });

      const business = await factory.getBusiness(0);
      const treasury = await ethers.getContractAt(
        "BusinessTreasury",
        business.treasuryAddress
      );

      expect(await treasury.initialized()).to.equal(true);
      expect(await treasury.token()).to.equal(business.tokenAddress);
      expect(await treasury.quorumBps()).to.equal(100);
      expect(await treasury.votingPeriod()).to.equal(3600);
    });

    it("should link token treasury to treasury address", async function () {
      await factory.connect(owner).createBusiness({
        name: "Acme Inc",
        symbol: "ACME",
        totalSupply: 100,
        founders: [owner.address],
        shares: [100],
        transferPolicy: 0,
        quorumBps: 5100,
        votingPeriod: 172800,
      });

      const business = await factory.getBusiness(0);
      const token = await ethers.getContractAt(
        "BusinessToken",
        business.tokenAddress
      );

      expect(await token.treasury()).to.equal(business.treasuryAddress);
    });

    it("should track businesses per owner", async function () {
      await factory.connect(owner).createBusiness({
        name: "Business 1",
        symbol: "BIZ1",
        totalSupply: 100,
        founders: [owner.address, alice.address],
        shares: [60, 40],
        transferPolicy: 0,
        quorumBps: 5100,
        votingPeriod: 172800,
      });

      await factory.connect(owner).createBusiness({
        name: "Business 2",
        symbol: "BIZ2",
        totalSupply: 50,
        founders: [owner.address],
        shares: [50],
        transferPolicy: 0,
        quorumBps: 5100,
        votingPeriod: 172800,
      });

      const ownerBusinesses = await factory.getBusinessesByOwner(
        owner.address
      );
      expect(ownerBusinesses.length).to.equal(2);
      expect(ownerBusinesses[0]).to.equal(0);
      expect(ownerBusinesses[1]).to.equal(1);

      const aliceBusinesses = await factory.getBusinessesByOwner(
        alice.address
      );
      expect(aliceBusinesses.length).to.equal(1);
      expect(aliceBusinesses[0]).to.equal(0);
    });
  });

  describe("Integration: Factory + Token + Treasury", function () {
    let token: BusinessToken;
    let treasury: BusinessTreasury;

    beforeEach(async function () {
      await factory.connect(owner).createBusiness({
        name: "Integration Test",
        symbol: "INTG",
        totalSupply: 100,
        founders: [owner.address, alice.address],
        shares: [60, 40],
        transferPolicy: 0,
        quorumBps: 5100,
        votingPeriod: 172800,
      });

      const business = await factory.getBusiness(0);
      token = await ethers.getContractAt(
        "BusinessToken",
        business.tokenAddress
      );
      treasury = await ethers.getContractAt(
        "BusinessTreasury",
        business.treasuryAddress
      );
    });

    it("should allow full governance flow: propose, vote, execute ETH withdrawal", async function () {
      // Fund treasury
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1.0"),
      });
      expect(await treasury.ethBalance()).to.equal(ethers.parseEther("1.0"));

      // Create withdrawal proposal
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [bob.address, ethers.parseEther("0.5")]
      );
      await treasury.connect(owner).createProposal(0, data);

      // Vote (owner has 60%, quorum is 51%)
      await treasury.connect(owner).vote(0, true);

      // Verify proposal passed
      const proposal = await treasury.getProposal(0);
      expect(proposal.status).to.equal(1); // PASSED

      // Execute
      const bobBalBefore = await ethers.provider.getBalance(bob.address);
      await treasury.connect(alice).executeProposal(0);
      const bobBalAfter = await ethers.provider.getBalance(bob.address);

      expect(bobBalAfter - bobBalBefore).to.equal(ethers.parseEther("0.5"));
      expect(await treasury.ethBalance()).to.equal(ethers.parseEther("0.5"));
    });

    it("should allow governance-controlled share transfer", async function () {
      // Create share transfer proposal
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256"],
        [owner.address, bob.address, 10]
      );
      await treasury.connect(owner).createProposal(2, data); // TRANSFER_SHARES
      await treasury.connect(owner).vote(0, true);
      await treasury.connect(alice).executeProposal(0);

      expect(await token.balanceOf(owner.address)).to.equal(50);
      expect(await token.balanceOf(bob.address)).to.equal(10);
    });

    it("should allow free token transfers when policy is FREE", async function () {
      await token.connect(owner).transfer(bob.address, 5);
      expect(await token.balanceOf(bob.address)).to.equal(5);
      expect(await token.balanceOf(owner.address)).to.equal(55);
    });
  });
});
