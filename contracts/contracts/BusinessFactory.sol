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

    struct CreateParams {
        string name;
        string symbol;
        uint256 totalSupply;
        address[] founders;
        uint256[] shares;
        TransferPolicy transferPolicy;
        uint256 quorumBps;
        uint256 votingPeriod;
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
        CreateParams calldata params
    )
        external
        returns (
            uint256 businessId,
            address tokenAddress,
            address treasuryAddress
        )
    {
        // 1. Deploy treasury first (without token link)
        BusinessTreasury treasury = new BusinessTreasury(
            params.quorumBps,
            params.votingPeriod
        );

        // 2. Deploy token with treasury address
        BusinessToken token = new BusinessToken(
            params.name,
            params.symbol,
            params.totalSupply,
            params.founders,
            params.shares,
            address(treasury),
            params.transferPolicy
        );

        // 3. Initialize treasury with the token address (solves chicken-and-egg)
        treasury.initialize(address(token));

        treasuryAddress = address(treasury);
        tokenAddress = address(token);

        businessId = businesses.length;
        businesses.push(
            Business({
                tokenAddress: tokenAddress,
                treasuryAddress: treasuryAddress,
                creator: msg.sender,
                name: params.name,
                createdAt: block.timestamp
            })
        );

        // Track for each founder
        for (uint256 i = 0; i < params.founders.length; i++) {
            ownerBusinesses[params.founders[i]].push(businessId);
        }

        emit BusinessCreated(
            businessId,
            tokenAddress,
            treasuryAddress,
            msg.sender,
            params.name,
            params.symbol
        );
    }

    function getBusinessCount() external view returns (uint256) {
        return businesses.length;
    }

    function getBusinessesByOwner(
        address owner
    ) external view returns (uint256[] memory) {
        return ownerBusinesses[owner];
    }

    function getBusiness(
        uint256 id
    ) external view returns (Business memory) {
        return businesses[id];
    }
}
