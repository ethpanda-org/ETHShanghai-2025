// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DirectDonation
 * @notice A simple donation tracker contract that properly records contributions
 * @dev Works as a wrapper to fix the PublicGoodsFund contribution tracking issue
 */
contract DirectDonation is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Track contributions per user
    mapping(address => uint256) public userContributions;
    mapping(address => uint256) public lastContributionTime;

    // Total statistics
    uint256 public totalContributions;
    uint256 public totalContributors;
    address[] public contributorList;
    mapping(address => bool) public isContributor;

    // Destination for funds
    address public donationReceiver;

    event DonationReceived(
        address indexed contributor,
        uint256 amount,
        address token,
        uint256 timestamp
    );

    constructor(address _donationReceiver) {
        require(_donationReceiver != address(0), "Invalid receiver");
        donationReceiver = _donationReceiver;
    }

    /**
     * @notice Accept and track donations from PaymentGateway
     * @param contributor The actual contributor (payer)
     * @param token The token being donated
     * @param amount The donation amount
     */
    function contributeDonation(
        address contributor,
        address token,
        uint256 amount
    ) external nonReentrant returns (bool) {
        require(amount > 0, "Invalid amount");

        // Transfer tokens from sender (PaymentGateway) to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Forward to donation receiver
        IERC20(token).safeTransfer(donationReceiver, amount);

        // Track contribution
        if (!isContributor[contributor]) {
            isContributor[contributor] = true;
            contributorList.push(contributor);
            totalContributors++;
        }

        userContributions[contributor] += amount;
        lastContributionTime[contributor] = block.timestamp;
        totalContributions += amount;

        emit DonationReceived(contributor, amount, token, block.timestamp);

        return true;
    }

    /**
     * @notice Get contributor information (compatible with frontend)
     */
    function getContributorInfo(address user) external view returns (
        uint256 totalContributed,
        uint256 lastTime,
        string memory badgeLevel
    ) {
        totalContributed = userContributions[user];
        lastTime = lastContributionTime[user];

        // Badge levels based on USD value (assuming 6 decimals for stablecoins)
        if (totalContributed >= 2000 * 1e6) {
            badgeLevel = "Gold";
        } else if (totalContributed >= 500 * 1e6) {
            badgeLevel = "Silver";
        } else if (totalContributed >= 100 * 1e6) {
            badgeLevel = "Bronze";
        } else {
            badgeLevel = "None";
        }
    }

    /**
     * @notice Get total lifetime donations (for compatibility)
     */
    function totalLifetimeDonations() external view returns (uint256) {
        return totalContributions;
    }

    /**
     * @notice Get total number of contributors
     */
    function getTotalContributors() external view returns (uint256) {
        return totalContributors;
    }

    /**
     * @notice Update donation receiver (owner only)
     */
    function setDonationReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), "Invalid receiver");
        donationReceiver = newReceiver;
    }
}