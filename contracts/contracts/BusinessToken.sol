// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

enum TransferPolicy {
    FREE,
    APPROVAL_REQUIRED
}

struct VestingSchedule {
    uint256 totalAmount;
    uint256 startTime;
    uint256 cliffEnd;
    uint256 vestingEnd;
    uint256 released;
}

contract BusinessToken is ERC20 {
    address public immutable treasury;
    TransferPolicy public transferPolicy;
    uint8 private immutable _tokenDecimals;

    mapping(address => VestingSchedule) public vestingSchedules;

    event VestingCreated(address indexed beneficiary, uint256 amount, uint256 cliffEnd, uint256 vestingEnd);
    event TokensReleased(address indexed beneficiary, uint256 amount);

    error TransferNotAllowed();
    error OnlyTreasury();
    error InsufficientUnlockedBalance();
    error NoVestingSchedule();
    error NothingToRelease();

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
        _tokenDecimals = 0;

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
        return _tokenDecimals;
    }

    function setTransferPolicy(
        TransferPolicy newPolicy
    ) external onlyTreasury {
        transferPolicy = newPolicy;
    }

    function setVesting(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) external onlyTreasury {
        uint256 start = block.timestamp;
        uint256 cliffEnd = start + cliffDuration;
        uint256 vestEnd = start + vestingDuration;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            startTime: start,
            cliffEnd: cliffEnd,
            vestingEnd: vestEnd,
            released: 0
        });

        emit VestingCreated(beneficiary, totalAmount, cliffEnd, vestEnd);
    }

    function vestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;

        if (block.timestamp < schedule.cliffEnd) {
            return 0;
        } else if (block.timestamp >= schedule.vestingEnd) {
            return schedule.totalAmount;
        } else {
            return (schedule.totalAmount * (block.timestamp - schedule.startTime)) /
                (schedule.vestingEnd - schedule.startTime);
        }
    }

    function releasable(address beneficiary) public view returns (uint256) {
        return vestedAmount(beneficiary) - vestingSchedules[beneficiary].released;
    }

    function locked(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;
        return schedule.totalAmount - vestedAmount(beneficiary);
    }

    function release() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        if (schedule.totalAmount == 0) revert NoVestingSchedule();

        uint256 amount = releasable(msg.sender);
        if (amount == 0) revert NothingToRelease();

        schedule.released += amount;
        emit TokensReleased(msg.sender, amount);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // Minting (from == 0) always allowed (constructor only)
        // Treasury-initiated transfers always allowed
        if (from != address(0) && msg.sender != treasury) {
            if (transferPolicy == TransferPolicy.APPROVAL_REQUIRED) {
                revert TransferNotAllowed();
            }
            // Vesting check: ensure sender has enough unlocked tokens
            uint256 lockedAmount = locked(from);
            if (balanceOf(from) - lockedAmount < value) {
                revert InsufficientUnlockedBalance();
            }
        }
        super._update(from, to, value);
    }

    function treasuryTransfer(
        address from,
        address to,
        uint256 amount
    ) external onlyTreasury {
        _transfer(from, to, amount);
    }
}
