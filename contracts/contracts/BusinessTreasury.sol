// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBusinessToken {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function treasuryTransfer(
        address from,
        address to,
        uint256 amount
    ) external;
    function setTransferPolicy(uint8 newPolicy) external;
}

contract BusinessTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ProposalType {
        WITHDRAW_ETH,      // 0
        WITHDRAW_TOKEN,    // 1
        TRANSFER_SHARES,   // 2
        CHANGE_SETTINGS,   // 3
        CUSTOM,            // 4
        DISTRIBUTE_DIVIDENDS // 5
    }
    enum ProposalStatus {
        ACTIVE,
        PASSED,
        REJECTED,
        EXECUTED,
        CANCELED
    }

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

    IBusinessToken public token;
    bool public initialized;
    address public immutable factory;
    uint256 public quorumBps; // basis points (5100 = 51%)
    uint256 public votingPeriod; // seconds
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed id,
        ProposalType proposalType,
        address creator
    );
    event Voted(
        uint256 indexed proposalId,
        address voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);
    event Deposited(address token, uint256 amount, address sender);
    event DividendsDistributed(uint256 indexed proposalId, uint256 totalAmount, uint256 recipientCount);

    error NotInitialized();
    error InsufficientTreasuryBalance();
    error AlreadyInitialized();
    error OnlyFactory();
    error NotTokenHolder();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error QuorumNotReached();
    error ProposalNotActive();
    error ProposalNotPassed();
    error OnlyCreator();

    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }

    modifier onlyHolder() {
        if (token.balanceOf(msg.sender) == 0) revert NotTokenHolder();
        _;
    }

    constructor(uint256 quorumBps_, uint256 votingPeriod_) {
        factory = msg.sender;
        quorumBps = quorumBps_;
        votingPeriod = votingPeriod_;
    }

    /// @notice Called by the factory after deploying both contracts to link the token.
    function initialize(address tokenAddress) external {
        if (msg.sender != factory) revert OnlyFactory();
        if (initialized) revert AlreadyInitialized();
        token = IBusinessToken(tokenAddress);
        initialized = true;
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
    ) external onlyInitialized onlyHolder returns (uint256) {
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

    function vote(
        uint256 proposalId,
        bool support
    ) external onlyInitialized onlyHolder {
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

    function executeProposal(
        uint256 proposalId
    ) external onlyInitialized nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.PASSED) revert ProposalNotPassed();

        p.status = ProposalStatus.EXECUTED;

        if (p.proposalType == ProposalType.WITHDRAW_ETH) {
            (address to, uint256 amount) = abi.decode(
                p.data,
                (address, uint256)
            );
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else if (p.proposalType == ProposalType.WITHDRAW_TOKEN) {
            (address tokenAddr, address to, uint256 amount) = abi.decode(
                p.data,
                (address, address, uint256)
            );
            IERC20(tokenAddr).safeTransfer(to, amount);
        } else if (p.proposalType == ProposalType.TRANSFER_SHARES) {
            (address from, address to, uint256 amount) = abi.decode(
                p.data,
                (address, address, uint256)
            );
            token.treasuryTransfer(from, to, amount);
        } else if (p.proposalType == ProposalType.CHANGE_SETTINGS) {
            (uint256 newQuorum, uint256 newVotingPeriod) = abi.decode(
                p.data,
                (uint256, uint256)
            );
            if (newQuorum > 0) quorumBps = newQuorum;
            if (newVotingPeriod > 0) votingPeriod = newVotingPeriod;
        } else if (p.proposalType == ProposalType.DISTRIBUTE_DIVIDENDS) {
            (uint256 totalAmount, address[] memory holders) = abi.decode(
                p.data,
                (uint256, address[])
            );
            if (address(this).balance < totalAmount) revert InsufficientTreasuryBalance();

            uint256 supply = token.totalSupply();
            uint256 recipientCount = 0;

            for (uint256 i = 0; i < holders.length; i++) {
                uint256 holderBalance = token.balanceOf(holders[i]);
                if (holderBalance == 0) continue;

                uint256 share = (totalAmount * holderBalance) / supply;
                if (share == 0) continue;

                (bool success, ) = holders[i].call{value: share}("");
                require(success, "Dividend transfer failed");
                recipientCount++;
            }

            emit DividendsDistributed(proposalId, totalAmount, recipientCount);
        }
        // CUSTOM proposals have no on-chain execution

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external onlyInitialized {
        Proposal storage p = proposals[proposalId];
        if (p.creator != msg.sender) revert OnlyCreator();
        if (p.status != ProposalStatus.ACTIVE) revert ProposalNotActive();
        p.status = ProposalStatus.CANCELED;
        emit ProposalCanceled(proposalId);
    }

    function getProposal(
        uint256 proposalId
    ) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function tokenBalance(address tokenAddr) external view returns (uint256) {
        return IERC20(tokenAddr).balanceOf(address(this));
    }
}
