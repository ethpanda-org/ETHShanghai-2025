// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * @title ICTF
 * @notice Interface for Conditional Token Framework (simplified for binary markets)
 */
interface ICTF is IERC1155 {
    function prepareCondition(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount,
        uint256 initialYesPrice,
        uint256 startTime,
        uint256 endTime
    ) external;

    function splitPosition(
        bytes32 conditionId,
        uint256 amount
    ) external;

    function mergePositions(
        bytes32 conditionId,
        uint256 amount
    ) external;

    function reportPayouts(
        bytes32 questionId,
        uint256[] calldata payouts
    ) external;

    function redeemPositions(
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external;

    function getTokenId(bytes32 conditionId, uint256 index) external pure returns (uint256);

    function getConditionId(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) external pure returns (bytes32);

    function getCondition(bytes32 conditionId) external view returns (
        address oracle,
        uint256 outcomeSlotCount,
        uint256 yesPrice,
        uint256[] memory payouts,
        uint256 startTime,
        uint256 endTime
    );

    function getConditionStatus(bytes32 conditionId) external view returns (
        bool isResolved,
        uint256 startTime,
        uint256 endTime
    );
}
