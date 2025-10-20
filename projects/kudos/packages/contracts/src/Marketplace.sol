// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMintableERC20} from "./interfaces/IMintableERC20.sol";
import {ReputationController} from "./ReputationController.sol";
import {ReputationDataFeed} from "./ReputationDataFeed.sol";
import {BadgeRuleRegistry} from "./BadgeRuleRegistry.sol";
import {IdentityToken} from "./IdentityToken.sol";
import {ReputationBadge} from "./ReputationBadge.sol";

contract Marketplace is ReputationController {
    struct Listing {
        address creator;
        uint256 price;
        bool active;
        uint256 sold;
    }

    struct BuyerStat {
        uint256 totalPurchases;
        uint256 totalVolume;
    }

    struct CreatorStat {
        uint256 totalSales;
        uint256 totalVolume;
    }

    IMintableERC20 public settlementToken;
    ReputationDataFeed public dataFeed;
    string public identityMetadataURI;
    uint256 public buyerWelcomeAmount;

    mapping(bytes32 => Listing) private _works;
    mapping(bytes32 => mapping(address => bool)) private _hasPurchased;

    mapping(address => BuyerStat) private _buyerStats;
    mapping(address => CreatorStat) private _creatorStats;

    address[] private _creatorRegistry;
    mapping(address => bool) private _creatorRegistered;

    event WorkListed(bytes32 indexed workId, address indexed creator, uint256 price);
    event WorkDeactivated(bytes32 indexed workId, address indexed caller);
    event PurchaseCompleted(address indexed buyer, address indexed creator, bytes32 indexed workId, uint256 price);

    error InvalidPrice();
    error WorkAlreadyActive();
    error WorkNotFound();
    error WorkNotActive();
    error NotWorkCreator();
    error AlreadyPurchased();

    constructor(
        IMintableERC20 token,
        IdentityToken identityToken_,
        ReputationBadge reputationBadge_,
        BadgeRuleRegistry badgeRuleRegistry_,
        ReputationDataFeed dataFeed_,
        string memory identityURI,
        uint256 welcomeAmount
    ) ReputationController(identityToken_, reputationBadge_, badgeRuleRegistry_) {
        settlementToken = token;
        dataFeed = dataFeed_;
        identityMetadataURI = identityURI;
        buyerWelcomeAmount = welcomeAmount;
    }

    function listWork(bytes32 workId, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        Listing storage listing = _works[workId];
        if (listing.active) revert WorkAlreadyActive();

        _ensureIdentity(msg.sender, identityMetadataURI);

        listing.creator = msg.sender;
        listing.price = price;
        listing.active = true;

        emit WorkListed(workId, msg.sender, price);

        if (!_creatorRegistered[msg.sender]) {
            _creatorRegistered[msg.sender] = true;
            _creatorRegistry.push(msg.sender);
        }
    }

    function deactivateWork(bytes32 workId) external {
        Listing storage listing = _works[workId];
        if (listing.creator == address(0)) revert WorkNotFound();
        if (!listing.active) revert WorkNotActive();
        if (msg.sender != listing.creator && msg.sender != owner()) revert NotWorkCreator();

        listing.active = false;
        emit WorkDeactivated(workId, msg.sender);
    }

    function purchase(bytes32 workId) external {
        Listing storage listing = _works[workId];
        if (listing.creator == address(0)) revert WorkNotFound();
        if (!listing.active) revert WorkNotActive();

        address buyer = msg.sender;
        address creator = listing.creator;
        uint256 price = listing.price;

        if (_hasPurchased[workId][buyer]) revert AlreadyPurchased();

        BuyerStat storage buyerStat = _buyerStats[buyer];
        if (buyerStat.totalPurchases == 0 && buyerWelcomeAmount > 0) {
            settlementToken.mint(buyer, buyerWelcomeAmount);
        }

        require(settlementToken.transferFrom(buyer, creator, price), "Marketplace: transfer failed");

        listing.sold += 1;
        _hasPurchased[workId][buyer] = true;

        _ensureIdentity(buyer, identityMetadataURI);

        buyerStat.totalPurchases += 1;
        buyerStat.totalVolume += price;

        CreatorStat storage creatorStat = _creatorStats[creator];
        creatorStat.totalSales += 1;
        creatorStat.totalVolume += price;

        _evaluatePassiveRules(
            buyer, BadgeRuleRegistry.BadgeTarget.Buyer, buyerStat.totalPurchases, buyerStat.totalVolume
        );
        _evaluatePassiveRules(
            creator, BadgeRuleRegistry.BadgeTarget.Creator, creatorStat.totalSales, creatorStat.totalVolume
        );

        if (address(dataFeed) != address(0)) {
            dataFeed.syncBuyerStat(
                buyer,
                ReputationDataFeed.BuyerStat({
                    totalPurchases: buyerStat.totalPurchases,
                    totalVolume: buyerStat.totalVolume
                })
            );
            dataFeed.syncCreatorStat(
                creator,
                ReputationDataFeed.CreatorStat({
                    totalSales: creatorStat.totalSales,
                    totalVolume: creatorStat.totalVolume
                })
            );
        }

        emit PurchaseCompleted(buyer, creator, workId, price);
    }

    function getWork(bytes32 workId) external view returns (Listing memory) {
        return _works[workId];
    }

    function getBuyerStat(address account) external view returns (BuyerStat memory) {
        return _buyerStats[account];
    }

    function getCreatorStat(address account) external view returns (CreatorStat memory) {
        return _creatorStats[account];
    }

    function creatorRegistryLength() external view returns (uint256) {
        return _creatorRegistry.length;
    }

    function creatorAt(uint256 index) external view returns (address) {
        require(index < _creatorRegistry.length, "Marketplace: index out of bounds");
        return _creatorRegistry[index];
    }

    function getEligibleRules(address account, BadgeRuleRegistry.BadgeTarget target)
        external
        view
        returns (uint256[] memory)
    {
        (uint256 countMetric, uint256 volumeMetric) = _currentMetrics(account, target);

        uint256 totalRules = badgeRuleRegistry.ruleCount();
        uint256[] memory buffer = new uint256[](totalRules);
        uint256 eligible;

        for (uint256 i = 0; i < totalRules; i++) {
            uint256 ruleId = badgeRuleRegistry.ruleIdAt(i);
            BadgeRuleRegistry.BadgeRule memory rule = badgeRuleRegistry.getRule(ruleId);
            if (!_canConsiderRule(rule, target)) continue;

            if (_meetsThreshold(rule, countMetric, volumeMetric) && !reputationBadge.hasBadge(account, rule.ruleId)) {
                buffer[eligible] = rule.ruleId;
                eligible++;
            }
        }

        uint256[] memory result = new uint256[](eligible);
        for (uint256 j = 0; j < eligible; j++) {
            result[j] = buffer[j];
        }
        return result;
    }

    function setBadgeContract(ReputationBadge newBadge) external onlyOwner {
        _setBadgeContract(newBadge);
    }

    function setBadgeRuleRegistry(BadgeRuleRegistry newRegistry) external onlyOwner {
        _setBadgeRuleRegistry(newRegistry);
    }

    function setDataFeed(ReputationDataFeed newFeed) external onlyOwner {
        dataFeed = newFeed;
    }

    function setIdentityMetadataURI(string calldata newURI) external onlyOwner {
        identityMetadataURI = newURI;
    }

    function setBuyerWelcomeAmount(uint256 newAmount) external onlyOwner {
        buyerWelcomeAmount = newAmount;
    }

    function _evaluatePassiveRules(
        address account,
        BadgeRuleRegistry.BadgeTarget target,
        uint256 countMetric,
        uint256 volumeMetric
    ) internal {
        uint256 totalRules = badgeRuleRegistry.ruleCount();
        for (uint256 i = 0; i < totalRules; i++) {
            uint256 ruleId = badgeRuleRegistry.ruleIdAt(i);
            BadgeRuleRegistry.BadgeRule memory rule = badgeRuleRegistry.getRule(ruleId);
            if (!_canConsiderRule(rule, target)) continue;
            if (!_meetsThreshold(rule, countMetric, volumeMetric)) continue;
            _awardBadge(account, rule);
        }
    }

    function _canConsiderRule(BadgeRuleRegistry.BadgeRule memory rule, BadgeRuleRegistry.BadgeTarget target)
        internal
        pure
        returns (bool)
    {
        return rule.enabled && rule.trigger == BadgeRuleRegistry.TriggerType.Passive && rule.target == target;
    }

    function _meetsThreshold(BadgeRuleRegistry.BadgeRule memory rule, uint256 countMetric, uint256 volumeMetric)
        internal
        pure
        returns (bool)
    {
        if (rule.threshold == 0) return true;
        return countMetric >= rule.threshold || volumeMetric >= rule.threshold;
    }

    function _currentMetrics(address account, BadgeRuleRegistry.BadgeTarget target)
        internal
        view
        returns (uint256 countMetric, uint256 volumeMetric)
    {
        if (target == BadgeRuleRegistry.BadgeTarget.Buyer) {
            BuyerStat memory stat = _buyerStats[account];
            countMetric = stat.totalPurchases;
            volumeMetric = stat.totalVolume;
        } else {
            CreatorStat memory stat = _creatorStats[account];
            countMetric = stat.totalSales;
            volumeMetric = stat.totalVolume;
        }
    }
}
