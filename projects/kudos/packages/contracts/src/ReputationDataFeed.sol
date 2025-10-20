// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

/// @title ReputationDataFeed
/// @notice Stores aggregated buyer and creator statistics written by the marketplace.
contract ReputationDataFeed is Ownable {
    struct BuyerStat {
        uint256 totalPurchases;
        uint256 totalVolume;
    }

    struct CreatorStat {
        uint256 totalSales;
        uint256 totalVolume;
    }

    address public marketplace;

    mapping(address => BuyerStat) private _buyerStats;
    mapping(address => CreatorStat) private _creatorStats;

    event MarketplaceUpdated(address indexed marketplace);
    event BuyerStatSynced(address indexed account, uint256 totalPurchases, uint256 totalVolume);
    event CreatorStatSynced(address indexed account, uint256 totalSales, uint256 totalVolume);

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "ReputationDataFeed: unauthorized");
        _;
    }

    function setMarketplace(address newMarketplace) external onlyOwner {
        require(newMarketplace != address(0), "ReputationDataFeed: zero marketplace");
        marketplace = newMarketplace;
        emit MarketplaceUpdated(newMarketplace);
    }

    function syncBuyerStat(address account, BuyerStat memory stat) external onlyMarketplace {
        _buyerStats[account] = stat;
        emit BuyerStatSynced(account, stat.totalPurchases, stat.totalVolume);
    }

    function syncCreatorStat(address account, CreatorStat memory stat) external onlyMarketplace {
        _creatorStats[account] = stat;
        emit CreatorStatSynced(account, stat.totalSales, stat.totalVolume);
    }

    function getBuyerStat(address account) external view returns (BuyerStat memory) {
        return _buyerStats[account];
    }

    function getCreatorStat(address account) external view returns (CreatorStat memory) {
        return _creatorStats[account];
    }
}
