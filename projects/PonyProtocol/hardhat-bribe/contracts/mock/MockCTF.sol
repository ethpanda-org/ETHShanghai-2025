// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockERC20.sol";

/**
 * @title MockCTF
 * @notice Simplified mock of Gnosis Conditional Token Framework for binary prediction markets
 * @dev Only supports binary outcomes (YES/NO), collateral is USDC
 */
contract MockCTF is ERC1155, ERC1155Holder {
    // Collateral token (USDC)
    IERC20 public immutable collateralToken;

    // Market state
    struct Condition {
        address oracle;
        uint256 outcomeSlotCount; // Always 2 for binary
        uint256 yesPrice; // YES token price (0-1 ether, representing 0%-100%)
        uint256[] payouts; // [0] = NO payout, [1] = YES payout, empty if not resolved
        uint256 startTime; // Market start time (timestamp)
        uint256 endTime; // Market end time (timestamp)
    }

    mapping(bytes32 => Condition) public conditions;

    // Track total supply for each token ID
    mapping(uint256 => uint256) public totalSupply;

    // Events
    event ConditionPreparation(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint256 outcomeSlotCount,
        uint256 startTime,
        uint256 endTime
    );

    event ConditionResolution(
        bytes32 indexed conditionId,
        address indexed oracle,
        uint256[] payouts
    );

    event PositionSplit(
        address indexed stakeholder,
        bytes32 indexed conditionId,
        uint256 amount
    );

    event PositionsMerge(
        address indexed stakeholder,
        bytes32 indexed conditionId,
        uint256 amount
    );

    event PayoutRedemption(
        address indexed redeemer,
        bytes32 indexed conditionId,
        uint256[] indexSets,
        uint256 payout
    );

    event PriceUpdate(
        bytes32 indexed conditionId,
        uint256 yesPrice,
        uint256 noPrice
    );

    event TokenPurchase(
        address indexed buyer,
        bytes32 indexed conditionId,
        uint256 indexed outcomeIndex,
        uint256 amount,
        uint256 cost
    );

    constructor(address _collateralToken, uint256 initialLiquidity) ERC1155("") {
        collateralToken = IERC20(_collateralToken);

        // Mint initial liquidity to vault for AMM
        if (initialLiquidity > 0) {
            MockERC20(_collateralToken).mint(address(this), initialLiquidity);
        }
    }

    /**
     * @notice Create a new prediction market condition
     * @param questionId Unique identifier for the question
     * @param outcomeSlotCount Number of outcomes (must be 2 for binary)
     * @param initialYesPrice Initial YES token price (0.5 ether = 50% by default)
     * @param startTime Market start time (timestamp, 0 = now)
     * @param endTime Market end time (timestamp, 0 = no end time)
     */
    function prepareCondition(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount,
        uint256 initialYesPrice,
        uint256 startTime,
        uint256 endTime
    ) external {
        require(outcomeSlotCount == 2, "Only binary outcomes supported");
        require(initialYesPrice <= 1 ether, "Price must be <= 100%");

        // Default to current time if startTime is 0
        uint256 actualStartTime = startTime == 0 ? block.timestamp : startTime;

        if (endTime > 0) {
            require(endTime > actualStartTime, "End time must be after start time");
        }

        bytes32 conditionId = keccak256(
            abi.encodePacked(oracle, questionId, outcomeSlotCount)
        );

        require(conditions[conditionId].outcomeSlotCount == 0, "Condition already exists");

        conditions[conditionId] = Condition({
            oracle: oracle,
            outcomeSlotCount: outcomeSlotCount,
            yesPrice: initialYesPrice,
            payouts: new uint256[](0),
            startTime: actualStartTime,
            endTime: endTime
        });

        emit ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount, actualStartTime, endTime);
        emit PriceUpdate(conditionId, initialYesPrice, 1 ether - initialYesPrice);
    }

    /**
     * @notice Buy YES tokens at current market price (AMM automatically buys opposite side)
     * @param conditionId The condition to buy YES for
     * @param amount Amount of YES tokens to buy
     */
    function buyYes(
        bytes32 conditionId,
        uint256 amount
    ) external {
        Condition storage condition = conditions[conditionId];
        require(condition.outcomeSlotCount == 2, "Condition does not exist");
        require(condition.payouts.length == 0, "Market resolved");
        require(amount > 0, "Amount must be positive");

        // Calculate cost based on YES price
        uint256 cost = (amount * condition.yesPrice) / 1 ether;

        // Check user has enough USDC balance and allowance
        require(collateralToken.balanceOf(msg.sender) >= cost, "Insufficient USDC balance");
        require(collateralToken.allowance(msg.sender, address(this)) >= cost, "Insufficient USDC allowance");

        // Transfer collateral from user
        collateralToken.transferFrom(msg.sender, address(this), cost);

        // AMM buys opposite side (NO tokens) using vault liquidity
        // Vault effectively pays (amount * (1 - yesPrice)) from its reserves

        // Use splitPosition to create both YES and NO tokens
        // This requires total collateral = amount (in USDC terms with proper decimals)
        collateralToken.approve(address(this), amount);
        this.splitPosition(conditionId, amount);

        // Transfer YES tokens to buyer
        uint256 yesTokenId = getTokenId(conditionId, 1);
        this.safeTransferFrom(address(this), msg.sender, yesTokenId, amount, "");

        // Vault keeps NO tokens as opposite position
        // Vault effectively paid vaultCost from its liquidity

        emit TokenPurchase(msg.sender, conditionId, 1, amount, cost);
    }

    /**
     * @notice Buy NO tokens at current market price (AMM automatically buys opposite side)
     * @param conditionId The condition to buy NO for
     * @param amount Amount of NO tokens to buy
     */
    function buyNo(
        bytes32 conditionId,
        uint256 amount
    ) external {
        Condition storage condition = conditions[conditionId];
        require(condition.outcomeSlotCount == 2, "Condition does not exist");
        require(condition.payouts.length == 0, "Market resolved");
        require(amount > 0, "Amount must be positive");

        // Calculate cost based on NO price (1 - yesPrice)
        uint256 noPrice = 1 ether - condition.yesPrice;
        uint256 cost = (amount * noPrice) / 1 ether;

        // Check user has enough USDC balance and allowance
        require(collateralToken.balanceOf(msg.sender) >= cost, "Insufficient USDC balance");
        require(collateralToken.allowance(msg.sender, address(this)) >= cost, "Insufficient USDC allowance");

        // Transfer collateral from user
        collateralToken.transferFrom(msg.sender, address(this), cost);

        // AMM buys opposite side (YES tokens) using vault liquidity
        // Vault effectively pays (amount * yesPrice) from its reserves

        // Use splitPosition to create both YES and NO tokens
        collateralToken.approve(address(this), amount);
        this.splitPosition(conditionId, amount);

        // Transfer NO tokens to buyer
        uint256 noTokenId = getTokenId(conditionId, 0);
        this.safeTransferFrom(address(this), msg.sender, noTokenId, amount, "");

        // Vault keeps YES tokens as opposite position
        // Vault effectively paid vaultCost from its liquidity

        emit TokenPurchase(msg.sender, conditionId, 0, amount, cost);
    }

    /**
     * @notice Set market price for YES (oracle only)
     * @param conditionId The condition to update price for
     * @param newYesPrice New YES price (0-1 ether)
     */
    function setPrice(
        bytes32 conditionId,
        uint256 newYesPrice
    ) external {
        Condition storage condition = conditions[conditionId];
        require(condition.oracle == msg.sender, "Only oracle can set price");
        require(condition.payouts.length == 0, "Market resolved");
        require(newYesPrice <= 1 ether, "Price must be <= 100%");

        condition.yesPrice = newYesPrice;

        emit PriceUpdate(conditionId, newYesPrice, 1 ether - newYesPrice);
    }

    /**
     * @notice Split collateral into outcome tokens (buy YES/NO tokens at 1:1)
     * @param conditionId The condition to split position for
     * @param amount Amount of collateral to split
     * @dev This is the original splitPosition - useful for providing liquidity
     */
    function splitPosition(
        bytes32 conditionId,
        uint256 amount
    ) external {
        require(conditions[conditionId].outcomeSlotCount == 2, "Condition does not exist");
        require(amount > 0, "Amount must be positive");

        // Transfer collateral from user
        collateralToken.transferFrom(msg.sender, address(this), amount);

        // Mint YES and NO tokens (1:1 backed by collateral)
        uint256 yesTokenId = getTokenId(conditionId, 1); // index 1 = YES
        uint256 noTokenId = getTokenId(conditionId, 0);  // index 0 = NO

        _mintWithTracking(msg.sender, yesTokenId, amount, "");
        _mintWithTracking(msg.sender, noTokenId, amount, "");

        emit PositionSplit(msg.sender, conditionId, amount);
    }

    /**
     * @notice Merge outcome tokens back into collateral
     * @param conditionId The condition to merge positions for
     * @param amount Amount of outcome tokens to merge
     */
    function mergePositions(
        bytes32 conditionId,
        uint256 amount
    ) external {
        require(conditions[conditionId].outcomeSlotCount == 2, "Condition does not exist");
        require(amount > 0, "Amount must be positive");

        uint256 yesTokenId = getTokenId(conditionId, 1);
        uint256 noTokenId = getTokenId(conditionId, 0);

        // Burn both YES and NO tokens
        _burnWithTracking(msg.sender, yesTokenId, amount);
        _burnWithTracking(msg.sender, noTokenId, amount);

        // Return collateral
        collateralToken.transfer(msg.sender, amount);

        emit PositionsMerge(msg.sender, conditionId, amount);
    }

    /**
     * @notice Resolve a condition (set the outcome)
     * @param questionId The question ID
     * @param payouts Array of payouts [NO payout, YES payout], must sum to 1 ether (representing 100%)
     */
    function reportPayouts(
        bytes32 questionId,
        uint256[] calldata payouts
    ) external {
        require(payouts.length == 2, "Must provide 2 payouts");
        require(payouts[0] + payouts[1] == 1 ether, "Payouts must sum to 1 ether");

        bytes32 conditionId = keccak256(
            abi.encodePacked(msg.sender, questionId, uint256(2))
        );

        Condition storage condition = conditions[conditionId];
        require(condition.oracle == msg.sender, "Only oracle can report");
        require(condition.payouts.length == 0, "Already resolved");

        condition.payouts = payouts;

        emit ConditionResolution(conditionId, msg.sender, payouts);
    }

    /**
     * @notice Redeem outcome tokens for collateral after resolution
     * @param conditionId The resolved condition
     * @param indexSets Array of outcome indices to redeem (e.g., [0] for NO, [1] for YES)
     */
    function redeemPositions(
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external {
        Condition storage condition = conditions[conditionId];
        require(condition.payouts.length > 0, "Condition not resolved");

        uint256 totalPayout = 0;

        for (uint256 i = 0; i < indexSets.length; i++) {
            uint256 index = indexSets[i];
            require(index < 2, "Invalid index");

            uint256 tokenId = getTokenId(conditionId, index);
            uint256 balance = balanceOf(msg.sender, tokenId);

            if (balance > 0) {
                // Calculate payout based on outcome
                uint256 payout = (balance * condition.payouts[index]) / 1 ether;
                totalPayout += payout;

                // Burn the outcome tokens
                _burnWithTracking(msg.sender, tokenId, balance);
            }
        }

        require(totalPayout > 0, "No payout available");

        // Transfer collateral
        collateralToken.transfer(msg.sender, totalPayout);

        emit PayoutRedemption(msg.sender, conditionId, indexSets, totalPayout);
    }

    /**
     * @notice Get token ID for a specific outcome
     * @param conditionId The condition
     * @param index Outcome index (0 = NO, 1 = YES)
     */
    function getTokenId(bytes32 conditionId, uint256 index) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(conditionId, index)));
    }

    /**
     * @notice Get condition status (optimized for staking contract)
     * @return isResolved Whether the market has been resolved
     * @return startTime Market start time
     * @return endTime Market end time
     */
    function getConditionStatus(bytes32 conditionId) external view returns (
        bool isResolved,
        uint256 startTime,
        uint256 endTime
    ) {
        Condition storage condition = conditions[conditionId];
        return (
            condition.payouts.length > 0,
            condition.startTime,
            condition.endTime
        );
    }

    /**
     * @notice Get condition details
     */
    function getCondition(bytes32 conditionId) external view returns (
        address oracle,
        uint256 outcomeSlotCount,
        uint256 yesPrice,
        uint256[] memory payouts,
        uint256 startTime,
        uint256 endTime
    ) {
        Condition storage condition = conditions[conditionId];
        return (
            condition.oracle,
            condition.outcomeSlotCount,
            condition.yesPrice,
            condition.payouts,
            condition.startTime,
            condition.endTime
        );
    }

    /**
     * @notice Get current prices for a market
     */
    function getPrices(bytes32 conditionId) external view returns (
        uint256 yesPrice,
        uint256 noPrice
    ) {
        Condition storage condition = conditions[conditionId];
        return (condition.yesPrice, 1 ether - condition.yesPrice);
    }

    /**
     * @notice Get user's position (YES and NO token balances) for a market
     */
    function getUserPosition(bytes32 conditionId, address user) external view returns (
        uint256 yesBalance,
        uint256 noBalance
    ) {
        uint256 yesTokenId = getTokenId(conditionId, 1);
        uint256 noTokenId = getTokenId(conditionId, 0);  // Fixed: index 0 for NO
        return (balanceOf(user, yesTokenId), balanceOf(user, noTokenId));
    }

    /**
     * @notice Helper to get conditionId
     */
    function getConditionId(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount));
    }

    /**
     * @notice Get total supply for a specific outcome token
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @return Total supply of the outcome token
     */
    function getOutcomeSupply(bytes32 conditionId, uint8 outcome) external view returns (uint256) {
        uint256 tokenId = getTokenId(conditionId, outcome);
        return totalSupply[tokenId];
    }

    /**
     * @notice Override supportsInterface to include ERC1155Receiver
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Internal helper to mint and track total supply
     */
    function _mintWithTracking(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        _mint(to, id, amount, data);
        totalSupply[id] += amount;
    }

    /**
     * @notice Internal helper to burn and track total supply
     */
    function _burnWithTracking(
        address from,
        uint256 id,
        uint256 amount
    ) internal {
        _burn(from, id, amount);
        totalSupply[id] -= amount;
    }
}
