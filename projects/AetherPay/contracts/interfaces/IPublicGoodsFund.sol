// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPublicGoodsFund
 * @notice Interface for PublicGoodsFund contract
 */
interface IPublicGoodsFund {
    /**
     * @notice Contribute spread from FX trading to public goods
     * @param contributor Address of the contributor (trader/merchant)
     * @param token Token address for the contribution
     * @param aiRate AI oracle predicted rate (8 decimals)
     * @param executionRate Actual execution rate (8 decimals)
     * @param tradeAmount Trade amount
     * @return spreadAmount Amount contributed
     */
    function contributeSpread(
        address contributor,
        address token,
        uint256 aiRate,
        uint256 executionRate,
        uint256 tradeAmount
    ) external returns (uint256 spreadAmount);

    /**
     * @notice Contribute platform fee to public goods
     * @param contributor Address of the contributor (merchant)
     * @param token Token address for the contribution
     * @param amount Fee amount to contribute
     * @return feeAmount Amount contributed
     */
    function contributeFee(
        address contributor,
        address token,
        uint256 amount
    ) external returns (uint256 feeAmount);

    /**
     * @notice Get contributor information
     * @param user Contributor address
     * @return totalContributed Total amount contributed
     * @return lastContributionTime Last contribution timestamp
     * @return badgeLevel Badge level (Bronze/Silver/Gold/None)
     */
    function getContributorInfo(address user) external view returns (
        uint256 totalContributed,
        uint256 lastContributionTime,
        string memory badgeLevel
    );

    /**
     * @notice Get current donation round information
     * @return roundId Current round ID
     * @return totalDonated Total amount donated in this round
     * @return startTime Round start time
     * @return endTime Round end time
     * @return distributed Whether round has been distributed
     */
    function getCurrentRoundInfo() external view returns (
        uint256 roundId,
        uint256 totalDonated,
        uint256 startTime,
        uint256 endTime,
        bool distributed
    );

    /**
     * @notice Get total number of contributors
     * @return Total contributor count
     */
    function getTotalContributors() external view returns (uint256);
}
