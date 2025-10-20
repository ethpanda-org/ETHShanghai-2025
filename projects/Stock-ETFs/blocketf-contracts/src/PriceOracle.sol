// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/AggregatorV3Interface.sol";
import "./interfaces/IPriceOracle.sol";

/**
 * @title PriceOracle
 * @author BlockETF Team
 * @notice Price oracle using Chainlink feeds for ETF asset pricing
 * @dev Fetches prices from configured Chainlink price feeds with staleness protection
 */
contract PriceOracle is IPriceOracle, Ownable {
    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Default staleness threshold (1 hour)
    uint256 private constant DEFAULT_STALENESS_THRESHOLD = 3600;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum age of price data before considered stale
    uint256 public stalenessThreshold;

    /// @notice Mapping from token address to Chainlink feed address
    mapping(address => address) public priceFeeds;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    // Events are inherited from IPriceOracle interface
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidPrice();
    error StalePrice();
    error InvalidThreshold();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {
        stalenessThreshold = DEFAULT_STALENESS_THRESHOLD;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get prices for multiple tokens (USD with 18 decimals)
     * @param tokens Array of token addresses
     * @return prices Array of prices in USD
     */
    function getPrices(address[] calldata tokens) external view returns (uint256[] memory prices) {
        prices = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[i] = this.getPrice(tokens[i]);
        }
    }

    /**
     * @notice Get price for a token (USD with 18 decimals)
     * @param token Token address
     * @return price Price in USD
     */
    function getPrice(address token) external view returns (uint256 price) {
        address feed = priceFeeds[token];
        if (feed == address(0)) revert InvalidPrice();

        try this.getChainlinkPrice(feed) returns (uint256 chainlinkPrice, uint256 updatedAt) {
            // Check if price is fresh
            if (block.timestamp > updatedAt + stalenessThreshold) {
                revert StalePrice();
            }
            return chainlinkPrice;
        } catch {
            revert InvalidPrice();
        }
    }

    /**
     * @notice Internal function to get Chainlink price
     */
    function getChainlinkPrice(address feed) external view returns (uint256 price, uint256 updatedAt) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);

        (, int256 rawPrice,, uint256 timeStamp,) = priceFeed.latestRoundData();

        if (rawPrice <= 0) revert InvalidPrice();

        // Convert to 18 decimals
        uint8 feedDecimals = priceFeed.decimals();

        if (feedDecimals < 18) {
            price = uint256(rawPrice) * (10 ** (18 - feedDecimals));
        } else if (feedDecimals > 18) {
            price = uint256(rawPrice) / (10 ** (feedDecimals - 18));
        } else {
            price = uint256(rawPrice);
        }

        updatedAt = timeStamp;
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set Chainlink price feed for a token
     * @param token Token address
     * @param feed Chainlink aggregator address
     */
    function setPriceFeed(address token, address feed) external onlyOwner {
        priceFeeds[token] = feed;
        emit PriceFeedSet(token, feed);
    }

    /**
     * @notice Set multiple price feeds at once
     * @param tokens Array of token addresses
     * @param feeds Array of Chainlink aggregator addresses
     */
    function setPriceFeeds(address[] calldata tokens, address[] calldata feeds) external onlyOwner {
        if (tokens.length != feeds.length) revert InvalidPrice();

        for (uint256 i = 0; i < tokens.length; i++) {
            priceFeeds[tokens[i]] = feeds[i];
            emit PriceFeedSet(tokens[i], feeds[i]);
        }
    }

    /**
     * @notice Set the staleness threshold for price data
     * @param newThreshold New threshold in seconds
     * @dev Threshold must be at least 60 seconds and at most 24 hours
     */
    function setStalenessThreshold(uint256 newThreshold) external onlyOwner {
        // Minimum 1 minute, maximum 24 hours
        if (newThreshold < 60 || newThreshold > 86400) {
            revert InvalidThreshold();
        }

        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = newThreshold;

        emit StalenessThresholdUpdated(oldThreshold, newThreshold);
    }
}
