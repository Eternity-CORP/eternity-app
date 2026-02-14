import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
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

  describe("Vesting", function () {
    const CLIFF_DURATION = 3600; // 1 hour
    const VESTING_DURATION = 7200; // 2 hours

    it("should create a vesting schedule correctly", async function () {
      await expect(
        token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION)
      ).to.emit(token, "VestingCreated");

      const schedule = await token.vestingSchedules(owner.address);
      expect(schedule.totalAmount).to.equal(60);
      expect(schedule.released).to.equal(0);
    });

    it("should emit VestingCreated with correct parameters", async function () {
      const tx = await token.connect(treasury).setVesting(
        owner.address, 60, CLIFF_DURATION, VESTING_DURATION
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const startTime = block!.timestamp;

      await expect(tx)
        .to.emit(token, "VestingCreated")
        .withArgs(owner.address, 60, startTime + CLIFF_DURATION, startTime + VESTING_DURATION);
    });

    it("should return full locked amount before cliff", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      expect(await token.locked(owner.address)).to.equal(60);
    });

    it("should return 0 vested amount before cliff", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Advance time but stay before cliff
      await time.increase(1800); // 30 minutes, cliff is at 1 hour
      expect(await token.vestedAmount(owner.address)).to.equal(0);
    });

    it("should vest tokens linearly after cliff", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Move past the cliff (1 hour into a 2-hour vesting)
      await time.increase(CLIFF_DURATION);

      const vested = await token.vestedAmount(owner.address);
      // At cliff end (3600s into 7200s vesting), ~50% should be vested
      // vestedAmount = 60 * 3600 / 7200 = 30
      expect(vested).to.be.greaterThan(0);
      expect(await token.locked(owner.address)).to.be.lessThan(60);
    });

    it("should unlock all tokens after full vesting period", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Move past full vesting period
      await time.increase(VESTING_DURATION + 1);

      expect(await token.vestedAmount(owner.address)).to.equal(60);
      expect(await token.locked(owner.address)).to.equal(0);
    });

    it("should prevent transfer of locked tokens", async function () {
      // Set vesting with a long cliff so all tokens are locked
      await token.connect(treasury).setVesting(owner.address, 60, 86400, 172800);

      // Owner tries to transfer all 60 tokens while they are locked
      await expect(
        token.connect(owner).transfer(bob.address, 60)
      ).to.be.revertedWithCustomError(token, "InsufficientUnlockedBalance");
    });

    it("should allow transfer of unlocked tokens after full vesting", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Wait for full vesting
      await time.increase(VESTING_DURATION + 1);

      // Transfer should work now
      await token.connect(owner).transfer(bob.address, 60);
      expect(await token.balanceOf(bob.address)).to.equal(60);
      expect(await token.balanceOf(owner.address)).to.equal(0);
    });

    it("should update released counter on release()", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Wait past cliff so some tokens are vested
      await time.increase(CLIFF_DURATION + 600); // cliff + 10 minutes

      const releasableBefore = await token.releasable(owner.address);
      expect(releasableBefore).to.be.greaterThan(0);

      await expect(token.connect(owner).release())
        .to.emit(token, "TokensReleased");

      // After release, releasable should be 0
      expect(await token.releasable(owner.address)).to.equal(0);

      // Released counter should have been updated
      const schedule = await token.vestingSchedules(owner.address);
      expect(schedule.released).to.be.greaterThan(0);
    });

    it("should revert release() with NoVestingSchedule if no schedule exists", async function () {
      await expect(
        token.connect(bob).release()
      ).to.be.revertedWithCustomError(token, "NoVestingSchedule");
    });

    it("should revert release() with NothingToRelease before cliff", async function () {
      await token.connect(treasury).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION);

      // Immediately call release (before cliff)
      await expect(
        token.connect(owner).release()
      ).to.be.revertedWithCustomError(token, "NothingToRelease");
    });

    it("should only allow treasury to call setVesting", async function () {
      await expect(
        token.connect(owner).setVesting(owner.address, 60, CLIFF_DURATION, VESTING_DURATION)
      ).to.be.revertedWithCustomError(token, "OnlyTreasury");
    });

    it("should allow partial transfer of unvested tokens", async function () {
      // Vest 40 out of 60 tokens with a long cliff
      await token.connect(treasury).setVesting(owner.address, 40, 86400, 172800);

      // Owner has 60 tokens, 40 locked -> 20 unlocked
      // Should be able to transfer up to 20
      await token.connect(owner).transfer(bob.address, 20);
      expect(await token.balanceOf(bob.address)).to.equal(20);
      expect(await token.balanceOf(owner.address)).to.equal(40);
    });

    it("should reject partial transfer exceeding unlocked balance", async function () {
      // Vest 40 out of 60 tokens with a long cliff
      await token.connect(treasury).setVesting(owner.address, 40, 86400, 172800);

      // Owner has 60 tokens, 40 locked -> 20 unlocked
      // Trying to transfer 21 should fail
      await expect(
        token.connect(owner).transfer(bob.address, 21)
      ).to.be.revertedWithCustomError(token, "InsufficientUnlockedBalance");
    });
  });
});
