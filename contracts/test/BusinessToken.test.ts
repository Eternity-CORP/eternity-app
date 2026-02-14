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

  it("should store the correct treasury address", async function () {
    expect(await token.treasury()).to.equal(treasury.address);
  });

  it("should have FREE transfer policy by default", async function () {
    expect(await token.transferPolicy()).to.equal(0); // FREE
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
    await token
      .connect(treasury)
      .treasuryTransfer(owner.address, bob.address, 10);
    expect(await token.balanceOf(bob.address)).to.equal(10);
  });

  it("should reject setTransferPolicy from non-treasury", async function () {
    await expect(
      token.connect(owner).setTransferPolicy(1)
    ).to.be.revertedWithCustomError(token, "OnlyTreasury");
  });

  it("should reject treasuryTransfer from non-treasury", async function () {
    await expect(
      token.connect(owner).treasuryTransfer(owner.address, bob.address, 10)
    ).to.be.revertedWithCustomError(token, "OnlyTreasury");
  });

  it("should reject if shares don't equal supply", async function () {
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    await expect(
      BusinessToken.deploy(
        "Test",
        "T",
        100,
        [owner.address],
        [50],
        treasury.address,
        0
      )
    ).to.be.revertedWith("Shares must equal supply");
  });

  it("should reject if no founders provided", async function () {
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    await expect(
      BusinessToken.deploy("Test", "T", 0, [], [], treasury.address, 0)
    ).to.be.revertedWith("No founders");
  });

  it("should reject if founders and shares length mismatch", async function () {
    const BusinessToken = await ethers.getContractFactory("BusinessToken");
    await expect(
      BusinessToken.deploy(
        "Test",
        "T",
        100,
        [owner.address, alice.address],
        [100],
        treasury.address,
        0
      )
    ).to.be.revertedWith("Length mismatch");
  });

  it("should return correct name and symbol", async function () {
    expect(await token.name()).to.equal("Test Business");
    expect(await token.symbol()).to.equal("TBIZ");
  });
});
