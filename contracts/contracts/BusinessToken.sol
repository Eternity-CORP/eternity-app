// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

enum TransferPolicy {
    FREE,
    APPROVAL_REQUIRED
}

contract BusinessToken is ERC20 {
    address public immutable treasury;
    TransferPolicy public transferPolicy;
    uint8 private immutable _tokenDecimals;

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
