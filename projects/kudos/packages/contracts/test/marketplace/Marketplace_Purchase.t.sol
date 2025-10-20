// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Marketplace} from "../../src/Marketplace.sol";
import {ReputationDataFeed} from "../../src/ReputationDataFeed.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {IMintableERC20} from "../../src/interfaces/IMintableERC20.sol";
import {BadgeRuleRegistry} from "../../src/BadgeRuleRegistry.sol";
import {BaseReputationTest} from "../utils/BaseReputationTest.sol";

contract MarketplacePurchaseTest is BaseReputationTest {
    Marketplace internal marketplace;
    ReputationDataFeed internal dataFeed;
    MockERC20 internal usdt;

    bytes32 internal constant WORK_ID = keccak256("work-1");
    bytes32 internal constant WORK_ID_TWO = keccak256("work-2");
    uint256 internal constant WORK_PRICE = 10_000_000;
    uint256 internal constant WELCOME_AMOUNT = 10_000_000;
    string internal constant BUYER_METADATA = "ipfs://identity/buyer-custom.json";

    function setUp() public virtual override {
        BaseReputationTest.setUp();

        usdt = new MockERC20("Mock USDT", "mUSDT", 6);
        dataFeed = new ReputationDataFeed();

        badgeRuleRegistry.createRule(defaultBadgeRule());

        BadgeRuleRegistry.BadgeRuleInput memory creatorRule = BadgeRuleRegistry.BadgeRuleInput({
            ruleId: 3,
            trigger: BadgeRuleRegistry.TriggerType.Passive,
            target: BadgeRuleRegistry.BadgeTarget.Creator,
            threshold: 1,
            metadataURI: "ipfs://badge/creator-one-sale.json",
            enabled: true
        });
        badgeRuleRegistry.createRule(creatorRule);

        marketplace = new Marketplace(
            IMintableERC20(address(usdt)),
            identityToken,
            reputationBadge,
            badgeRuleRegistry,
            dataFeed,
            "ipfs://identity/default.json",
            WELCOME_AMOUNT
        );

        identityToken.transferOwnership(address(marketplace));
        reputationBadge.transferOwnership(address(marketplace));

        dataFeed.setMarketplace(address(marketplace));

        assertFalse(identityToken.hasIdentity(creator), "creator identity should not exist before listing");

        vm.prank(creator);
        marketplace.listWork(WORK_ID, WORK_PRICE); // 10 USDT with 6 decimals

        assertTrue(identityToken.hasIdentity(creator), "creator identity should be minted on listing");
    }

    function _approveBuyer(uint256 amount) internal {
        vm.prank(buyer);
        usdt.approve(address(marketplace), amount);
    }

    function _listWork(bytes32 workId, address workCreator, uint256 price) internal {
        vm.prank(workCreator);
        marketplace.listWork(workId, price);
    }

    function testPurchaseMintsIdentityAndAwardsBadges() public {
        _approveBuyer(WORK_PRICE);

        vm.expectEmit(true, true, true, true);
        emit Marketplace.PurchaseCompleted(buyer, creator, WORK_ID, WORK_PRICE);

        vm.prank(buyer);
        marketplace.purchase(WORK_ID);

        assertTrue(identityToken.hasIdentity(buyer), "identity not minted");
        assertTrue(reputationBadge.hasBadge(buyer, 1), "buyer badge missing");
        assertTrue(reputationBadge.hasBadge(creator, 3), "creator badge missing");

        assertEq(usdt.balanceOf(creator), WORK_PRICE, "creator payment mismatch");

        ReputationDataFeed.BuyerStat memory buyerStat = dataFeed.getBuyerStat(buyer);
        assertEq(buyerStat.totalPurchases, 1, "buyer purchase count mismatch");
        assertEq(buyerStat.totalVolume, WORK_PRICE, "buyer volume mismatch");

        ReputationDataFeed.CreatorStat memory creatorStat = dataFeed.getCreatorStat(creator);
        assertEq(creatorStat.totalSales, 1, "creator sales mismatch");
        assertEq(creatorStat.totalVolume, WORK_PRICE, "creator volume mismatch");
    }

    function testDuplicatePurchaseReverts() public {
        _approveBuyer(WORK_PRICE);

        vm.prank(buyer);
        marketplace.purchase(WORK_ID);

        vm.prank(buyer);
        vm.expectRevert(Marketplace.AlreadyPurchased.selector);
        marketplace.purchase(WORK_ID);
    }

    function testListWorkMintsIdentityForFreshCreator() public {
        address anotherCreator = makeAddr("creator-two");
        bytes32 anotherWork = keccak256("work-two");

        assertFalse(identityToken.hasIdentity(anotherCreator), "unexpected identity before listing");

        _listWork(anotherWork, anotherCreator, WORK_PRICE);

        assertTrue(identityToken.hasIdentity(anotherCreator), "identity should be minted on listing");

        Marketplace.Listing memory listing = marketplace.getWork(anotherWork);
        assertEq(listing.creator, anotherCreator, "creator mismatch after listing");
        assertTrue(listing.active, "listing should be active");
    }

    function testPurchaseWithExistingBuyerIdentityKeepsTokenId() public {
        vm.prank(buyer);
        uint256 existingTokenId = identityToken.mintSelf(BUYER_METADATA);

        _approveBuyer(WORK_PRICE);

        vm.prank(buyer);
        marketplace.purchase(WORK_ID);

        assertEq(identityToken.tokenIdOf(buyer), existingTokenId, "identity token id should be unchanged");
        assertTrue(reputationBadge.hasBadge(buyer, 1), "buyer badge should still be issued");
    }

    function testPurchaseWhenBuyerBadgeRuleDisabledSkipsBadge() public {
        badgeRuleRegistry.setRuleStatus(1, false);

        _approveBuyer(WORK_PRICE);

        vm.prank(buyer);
        marketplace.purchase(WORK_ID);

        assertFalse(reputationBadge.hasBadge(buyer, 1), "buyer badge should not mint while disabled");
        assertTrue(reputationBadge.hasBadge(creator, 3), "creator badge should still mint");
        assertEq(reputationBadge.totalSupply(), 1, "only creator badge should exist");
    }

    function testRepeatPurchasesDoNotDuplicateBadges() public {
        usdt.mint(buyer, WORK_PRICE);

        _approveBuyer(WORK_PRICE);
        vm.prank(buyer);
        marketplace.purchase(WORK_ID);

        uint256 badgeSupplyAfterFirst = reputationBadge.totalSupply();

        _listWork(WORK_ID_TWO, creator, WORK_PRICE);

        _approveBuyer(WORK_PRICE);
        vm.prank(buyer);
        marketplace.purchase(WORK_ID_TWO);

        assertEq(reputationBadge.totalSupply(), badgeSupplyAfterFirst, "badge supply should not grow");

        Marketplace.BuyerStat memory buyerStat = marketplace.getBuyerStat(buyer);
        assertEq(buyerStat.totalPurchases, 2, "buyer purchase count mismatch after repeat");
        assertEq(buyerStat.totalVolume, 2 * WORK_PRICE, "buyer volume mismatch after repeat");
    }

    function testBadgeAwardedAfterRuleReenabled() public {
        badgeRuleRegistry.setRuleStatus(1, false);

        _approveBuyer(WORK_PRICE);
        vm.prank(buyer);
        marketplace.purchase(WORK_ID);
        assertFalse(reputationBadge.hasBadge(buyer, 1), "buyer badge should be absent while disabled");

        badgeRuleRegistry.setRuleStatus(1, true);

        usdt.mint(buyer, WORK_PRICE);
        _listWork(WORK_ID_TWO, creator, WORK_PRICE);
        _approveBuyer(WORK_PRICE);

        vm.prank(buyer);
        marketplace.purchase(WORK_ID_TWO);

        assertTrue(reputationBadge.hasBadge(buyer, 1), "buyer badge should mint after re-enable");
    }
}
