// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceOracle
 * @notice Mock price oracle for testing on BNB Testnet
 * @dev Allows manual price setting for testing without Chainlink dependency
 */
contract MockPriceOracle is Ownable {
    // token => price in USD (18 decimals)
    mapping(address => uint256) private prices;

    // token => last update timestamp
    mapping(address => uint256) private lastUpdated;

    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Get price of a token in USD (18 decimals)
     * @param token Token address
     * @return price Price in USD with 18 decimals
     */
    function getPrice(address token) external view returns (uint256) {
        uint256 price = prices[token];
        require(price > 0, "Price not set");
        return price;
    }

    /**
     * @notice Get latest price with timestamp
     * @param token Token address
     * @return price Price in USD with 18 decimals
     * @return timestamp Last update timestamp
     */
    function getLatestPrice(address token) external view returns (uint256 price, uint256 timestamp) {
        price = prices[token];
        require(price > 0, "Price not set");
        timestamp = lastUpdated[token];
    }

    /**
     * @notice Set price for a token (only owner)
     * @param token Token address
     * @param price Price in USD with 18 decimals
     */
    function setPrice(address token, uint256 price) external onlyOwner {
        require(price > 0, "Invalid price");
        prices[token] = price;
        lastUpdated[token] = block.timestamp;
        emit PriceUpdated(token, price, block.timestamp);
    }

    /**
     * @notice Batch set prices for multiple tokens (only owner)
     * @param tokens Array of token addresses
     * @param newPrices Array of prices (18 decimals)
     */
    function setPrices(address[] calldata tokens, uint256[] calldata newPrices) external onlyOwner {
        require(tokens.length == newPrices.length, "Length mismatch");

        for (uint256 i = 0; i < tokens.length; i++) {
            require(newPrices[i] > 0, "Invalid price");
            prices[tokens[i]] = newPrices[i];
            lastUpdated[tokens[i]] = block.timestamp;
            emit PriceUpdated(tokens[i], newPrices[i], block.timestamp);
        }
    }

    /**
     * @notice Check if price is set for a token
     */
    function isPriceSet(address token) external view returns (bool) {
        return prices[token] > 0;
    }

    /**
     * @notice Get price age in seconds
     */
    function getPriceAge(address token) external view returns (uint256) {
        require(lastUpdated[token] > 0, "Price not set");
        return block.timestamp - lastUpdated[token];
    }
}
