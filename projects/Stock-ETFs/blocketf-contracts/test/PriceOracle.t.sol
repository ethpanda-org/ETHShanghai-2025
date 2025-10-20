// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PriceOracle.sol";
import "../src/mocks/MockAggregatorV3.sol";
import "../src/mocks/MockERC20.sol";

contract PriceOracleTest is Test {
    PriceOracle public oracle;
    MockAggregatorV3 public btcFeed;
    MockAggregatorV3 public ethFeed;
    MockAggregatorV3 public usdtFeed;
    MockAggregatorV3 public usdcFeed;
    MockAggregatorV3 public invalidFeed;

    MockERC20 public btcToken;
    MockERC20 public ethToken;
    MockERC20 public usdtToken;
    MockERC20 public usdcToken;

    address public owner;
    address public user;

    uint256 constant STALENESS_THRESHOLD = 3600; // 1 hour

    function setUp() public {
        owner = address(this);
        user = address(0x1);

        oracle = new PriceOracle();

        btcToken = new MockERC20("Bitcoin", "BTC", 18);
        ethToken = new MockERC20("Ethereum", "ETH", 18);
        usdtToken = new MockERC20("Tether", "USDT", 6);
        usdcToken = new MockERC20("USD Coin", "USDC", 6);

        btcFeed = new MockAggregatorV3(8, "BTC/USD", 1);
        ethFeed = new MockAggregatorV3(8, "ETH/USD", 1);
        usdtFeed = new MockAggregatorV3(8, "USDT/USD", 1);
        usdcFeed = new MockAggregatorV3(6, "USDC/USD", 1);
        invalidFeed = new MockAggregatorV3(8, "INVALID", 1);

        btcFeed.setPrice(50000 * 1e8); // $50,000
        ethFeed.setPrice(3000 * 1e8); // $3,000
        usdtFeed.setPrice(1 * 1e8); // $1.00
        usdcFeed.setPrice(1 * 1e6); // $1.00 with 6 decimals
    }

    // ====================  5.1 价格获取测试 ====================

    // ORACLE-GET-001: 获取BTC价格
    function test_ORACLE_GET_001_GetBTCPrice() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-GET-002: 获取ETH价格
    function test_ORACLE_GET_002_GetETHPrice() public {
        oracle.setPriceFeed(address(ethToken), address(ethFeed));

        uint256 price = oracle.getPrice(address(ethToken));
        assertEq(price, 3000 * 1e18);
    }

    // ORACLE-GET-003: 获取稳定币价格
    function test_ORACLE_GET_003_GetStablecoinPrice() public {
        oracle.setPriceFeed(address(usdtToken), address(usdtFeed));

        uint256 price = oracle.getPrice(address(usdtToken));
        assertEq(price, 1 * 1e18);
    }

    // ORACLE-GET-004: 8位→18位精度转换
    function test_ORACLE_GET_004_ConvertFrom8To18Decimals() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-GET-005: 18位→18位精度保持
    function test_ORACLE_GET_005_Maintain18Decimals() public {
        MockAggregatorV3 feed18 = new MockAggregatorV3(18, "TEST/USD", 1);
        feed18.setPrice(1000 * 1e18);
        oracle.setPriceFeed(address(btcToken), address(feed18));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 1000 * 1e18);
    }

    // ORACLE-GET-006: 6位→18位精度转换
    function test_ORACLE_GET_006_ConvertFrom6To18Decimals() public {
        oracle.setPriceFeed(address(usdcToken), address(usdcFeed));

        uint256 price = oracle.getPrice(address(usdcToken));
        assertEq(price, 1 * 1e18);
    }

    // ORACLE-GET-007: 高精度→18位精度缩减
    function test_ORACLE_GET_007_ConvertFromHighTo18Decimals() public {
        MockAggregatorV3 feed24 = new MockAggregatorV3(24, "HIGH/USD", 1);
        feed24.setPrice(1000 * 1e24);
        oracle.setPriceFeed(address(btcToken), address(feed24));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 1000 * 1e18);
    }

    // ORACLE-GET-010: 未配置代币
    function test_ORACLE_GET_010_UnconfiguredToken() public {
        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-GET-011: Feed返回0价格
    function test_ORACLE_GET_011_FeedReturnsZeroPrice() public {
        btcFeed.setPrice(0);
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-GET-012: Feed返回负价格
    function test_ORACLE_GET_012_FeedReturnsNegativePrice() public {
        btcFeed.setPrice(-1000);
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-GET-013: Feed无响应/revert
    function test_ORACLE_GET_013_FeedReverts() public {
        btcFeed.setShouldRevert(true);
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-GET-014: 极小价格处理
    function test_ORACLE_GET_014_VerySmallPrice() public {
        btcFeed.setPrice(1); // 1 * 1e-8 = 0.00000001
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 1e10); // 0.00000001 * 1e18
    }

    // ORACLE-GET-015: 极大价格不溢出
    function test_ORACLE_GET_015_VeryLargePrice() public {
        btcFeed.setPrice(type(int256).max / 1e10); // Avoid overflow
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 price = oracle.getPrice(address(btcToken));
        assertTrue(price > 0);
    }

    // ORACLE-GET-016: 价格为1美元
    function test_ORACLE_GET_016_PriceExactlyOneDollar() public {
        btcFeed.setPrice(1 * 1e8);
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 1e18);
    }

    // ORACLE-GET-008: 批量获取价格
    function test_ORACLE_GET_008_BatchPrices() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        oracle.setPriceFeed(address(ethToken), address(ethFeed));
        oracle.setPriceFeed(address(usdtToken), address(usdtFeed));

        address[] memory tokens = new address[](3);
        tokens[0] = address(btcToken);
        tokens[1] = address(ethToken);
        tokens[2] = address(usdtToken);

        uint256[] memory prices = oracle.getPrices(tokens);

        assertEq(prices.length, 3);
        assertEq(prices[0], 50000 * 1e18); // BTC
        assertEq(prices[1], 3000 * 1e18); // ETH
        assertEq(prices[2], 1 * 1e18); // USDT
    }

    // ORACLE-GET-009: 混合精度批量获取
    function test_ORACLE_GET_009_MixedDecimalsBatch() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed)); // 8 decimals
        oracle.setPriceFeed(address(usdcToken), address(usdcFeed)); // 6 decimals

        MockAggregatorV3 feed18 = new MockAggregatorV3(18, "TEST/USD", 1);
        feed18.setPrice(1000 * 1e18); // 18 decimals
        oracle.setPriceFeed(address(ethToken), address(feed18));

        address[] memory tokens = new address[](3);
        tokens[0] = address(btcToken);
        tokens[1] = address(usdcToken);
        tokens[2] = address(ethToken);

        uint256[] memory prices = oracle.getPrices(tokens);

        assertEq(prices.length, 3);
        assertEq(prices[0], 50000 * 1e18); // BTC: 8→18 decimals
        assertEq(prices[1], 1 * 1e18); // USDC: 6→18 decimals
        assertEq(prices[2], 1000 * 1e18); // ETH: 18→18 decimals
    }

    // ====================  5.2 数据新鲜度测试 ====================

    // ORACLE-FRESH-001: 新鲜数据(<1小时)
    function test_ORACLE_FRESH_001_FreshData() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 2000); // Move forward to avoid underflow
        btcFeed.setUpdatedAt(block.timestamp - 1800); // 30 minutes ago

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-FRESH-002: 过期数据(>1小时)
    function test_ORACLE_FRESH_002_StaleData() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 4000); // Move forward to avoid underflow
        btcFeed.setUpdatedAt(block.timestamp - 3601); // 1 hour + 1 second ago

        vm.expectRevert(PriceOracle.StalePrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-FRESH-003: 边界时间(正好1小时)
    function test_ORACLE_FRESH_003_BoundaryTime() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 4000); // Move forward to avoid underflow
        btcFeed.setUpdatedAt(block.timestamp - 3600); // Exactly 1 hour ago

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-FRESH-004: 刚更新(<1分钟)
    function test_ORACLE_FRESH_004_JustUpdated() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 100); // Move forward to avoid underflow
        btcFeed.setUpdatedAt(block.timestamp - 30); // 30 seconds ago

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-FRESH-005: 未来时间戳
    function test_ORACLE_FRESH_005_FutureTimestamp() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        btcFeed.setUpdatedAt(block.timestamp + 1000); // Future timestamp

        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18); // Should still work
    }

    // ORACLE-FRESH-006: 零时间戳
    function test_ORACLE_FRESH_006_ZeroTimestamp() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 4000); // Move forward
        btcFeed.setUpdatedAt(0);

        vm.expectRevert(PriceOracle.StalePrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-FRESH-007: 时间戳回退检测
    function test_ORACLE_FRESH_007_TimestampRegression() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        vm.warp(block.timestamp + 2000);
        uint256 laterTime = block.timestamp - 100;
        uint256 earlierTime = block.timestamp - 200;

        // First set to later time
        btcFeed.setUpdatedAt(laterTime);
        uint256 price1 = oracle.getPrice(address(btcToken));
        assertEq(price1, 50000 * 1e18);

        // Then set to earlier time (regression)
        btcFeed.setUpdatedAt(earlierTime);
        // Should still work but could be a warning in real systems
        uint256 price2 = oracle.getPrice(address(btcToken));
        assertEq(price2, 50000 * 1e18);
    }

    // ORACLE-FRESH-008: 默认阈值验证
    function test_ORACLE_FRESH_008_DefaultThreshold() public {
        assertEq(oracle.stalenessThreshold(), 3600);
    }

    // ORACLE-FRESH-009: 自定义阈值(可配置)
    function test_ORACLE_FRESH_009_CustomThreshold() public {
        // Test default threshold
        assertEq(oracle.stalenessThreshold(), 3600);

        // Update threshold to 2 hours
        oracle.setStalenessThreshold(7200);
        assertEq(oracle.stalenessThreshold(), 7200);

        // Test that price just outside old threshold but inside new threshold is accepted
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        vm.warp(block.timestamp + 10000); // Move time forward enough to avoid underflow
        btcFeed.setUpdatedAt(block.timestamp - 5000);

        // Should work with new threshold (7200 seconds)
        uint256 price = oracle.getPrice(address(btcToken));
        assertGt(price, 0);

        // But should fail outside new threshold
        btcFeed.setUpdatedAt(block.timestamp - 7201);
        vm.expectRevert(PriceOracle.StalePrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ====================  5.3 Feed配置测试 ====================

    // ORACLE-CONF-001: 设置BTC feed
    function test_ORACLE_CONF_001_SetBTCFeed() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        assertEq(oracle.priceFeeds(address(btcToken)), address(btcFeed));
    }

    // ORACLE-CONF-002: 设置ETH feed
    function test_ORACLE_CONF_002_SetETHFeed() public {
        oracle.setPriceFeed(address(ethToken), address(ethFeed));

        assertEq(oracle.priceFeeds(address(ethToken)), address(ethFeed));
    }

    // ORACLE-CONF-004: 更换feed
    function test_ORACLE_CONF_004_UpdateFeed() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        MockAggregatorV3 newFeed = new MockAggregatorV3(8, "NEW_BTC/USD", 1);
        newFeed.setPrice(60000 * 1e8);
        oracle.setPriceFeed(address(btcToken), address(newFeed));

        assertEq(oracle.priceFeeds(address(btcToken)), address(newFeed));
        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 60000 * 1e18);
    }

    // ORACLE-CONF-005: 删除feed(设为0地址)
    function test_ORACLE_CONF_005_RemoveFeed() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        oracle.setPriceFeed(address(btcToken), address(0));

        assertEq(oracle.priceFeeds(address(btcToken)), address(0));

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-CONF-009: owner设置权限
    function test_ORACLE_CONF_009_OwnerCanSet() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        assertEq(oracle.priceFeeds(address(btcToken)), address(btcFeed));
    }

    // ORACLE-CONF-010: 非owner设置失败
    function test_ORACLE_CONF_010_NonOwnerCannotSet() public {
        vm.prank(user);
        vm.expectRevert();
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
    }

    // ORACLE-CONF-003: 批量设置feeds
    function test_ORACLE_CONF_003_BatchSetFeeds() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(btcToken);
        tokens[1] = address(ethToken);
        tokens[2] = address(usdtToken);

        address[] memory feeds = new address[](3);
        feeds[0] = address(btcFeed);
        feeds[1] = address(ethFeed);
        feeds[2] = address(usdtFeed);

        oracle.setPriceFeeds(tokens, feeds);

        assertEq(oracle.priceFeeds(address(btcToken)), address(btcFeed));
        assertEq(oracle.priceFeeds(address(ethToken)), address(ethFeed));
        assertEq(oracle.priceFeeds(address(usdtToken)), address(usdtFeed));
    }

    // ORACLE-CONF-006: 验证feed合约接口
    function test_ORACLE_CONF_006_ValidateFeedContract() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        // Verify it implements AggregatorV3Interface
        uint8 decimals = btcFeed.decimals();
        assertEq(decimals, 8);

        string memory description = btcFeed.description();
        assertEq(description, "BTC/USD");

        uint256 version = btcFeed.version();
        assertEq(version, 1);
    }

    // ORACLE-CONF-007: 验证feed活跃性
    function test_ORACLE_CONF_007_ValidateFeedActivity() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        // Check that feed returns fresh data
        (, uint256 updatedAt) = oracle.getChainlinkPrice(address(btcFeed));
        assertTrue(updatedAt > 0);
        assertTrue(block.timestamp - updatedAt <= oracle.stalenessThreshold());
    }

    // ORACLE-CONF-008: 错误feed地址处理
    function test_ORACLE_CONF_008_InvalidFeedAddress() public {
        // Try to set a non-contract address as feed
        address badFeed = address(0x123);
        oracle.setPriceFeed(address(btcToken), badFeed);

        // Should revert when trying to get price
        vm.expectRevert();
        oracle.getPrice(address(btcToken));
    }

    // ORACLE-CONF-011: PriceFeedSet事件
    function test_ORACLE_CONF_011_PriceFeedSetEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IPriceOracle.PriceFeedSet(address(btcToken), address(btcFeed));

        oracle.setPriceFeed(address(btcToken), address(btcFeed));
    }

    // ====================  5.4 Chainlink集成测试 ====================

    // ORACLE-LINK-001: latestRoundData调用
    function test_ORACLE_LINK_001_LatestRoundDataCall() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        (uint256 price, uint256 updatedAt) = oracle.getChainlinkPrice(address(btcFeed));
        assertEq(price, 50000 * 1e18);
        assertEq(updatedAt, block.timestamp);
    }

    // ORACLE-LINK-002: decimals调用
    function test_ORACLE_LINK_002_DecimalsCall() public {
        uint8 decimals = btcFeed.decimals();
        assertEq(decimals, 8);
    }

    // ORACLE-LINK-003: description调用
    function test_ORACLE_LINK_003_DescriptionCall() public {
        string memory description = btcFeed.description();
        assertEq(description, "BTC/USD");
    }

    // ORACLE-LINK-004: 解析价格(int256→uint256)
    function test_ORACLE_LINK_004_ParsePrice() public {
        btcFeed.setPrice(50000 * 1e8);
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        (uint256 price,) = oracle.getChainlinkPrice(address(btcFeed));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-LINK-005: 解析时间戳
    function test_ORACLE_LINK_005_ParseTimestamp() public {
        vm.warp(block.timestamp + 1000); // Move forward to avoid underflow
        uint256 expectedTimestamp = block.timestamp - 100;
        btcFeed.setUpdatedAt(expectedTimestamp);

        (, uint256 updatedAt) = oracle.getChainlinkPrice(address(btcFeed));
        assertEq(updatedAt, expectedTimestamp);
    }

    // ORACLE-LINK-006: 解析轮次ID
    function test_ORACLE_LINK_006_ParseRoundId() public {
        btcFeed.setRoundId(12345);

        (uint80 roundId,,,,) = btcFeed.latestRoundData();
        assertEq(roundId, 12345);
    }

    // ORACLE-LINK-007: 无效轮次处理
    function test_ORACLE_LINK_007_InvalidRound() public {
        btcFeed.setRoundId(0);

        (uint80 roundId,,,,) = btcFeed.latestRoundData();
        assertEq(roundId, 0);

        // Oracle should still work with roundId 0 (depends on implementation)
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ORACLE-LINK-008: 答案为0
    function test_ORACLE_LINK_008_AnswerIsZero() public {
        btcFeed.setPrice(0);

        vm.expectRevert(PriceOracle.InvalidPrice.selector);
        oracle.getChainlinkPrice(address(btcFeed));
    }

    // ORACLE-LINK-009: 未开始轮次处理
    function test_ORACLE_LINK_009_UnstartedRound() public {
        btcFeed.setStartedAt(0);

        (,, uint256 startedAt,,) = btcFeed.latestRoundData();
        assertEq(startedAt, 0);

        // Oracle should still work (depends on implementation)
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        uint256 price = oracle.getPrice(address(btcToken));
        assertEq(price, 50000 * 1e18);
    }

    // ====================  额外的边界和安全测试 ====================

    // 测试精度转换的准确性
    function test_PrecisionConversionAccuracy() public {
        // Test with various decimal places
        for (uint8 decimals = 0; decimals <= 30; decimals++) {
            if (decimals == 18) continue; // Skip 18 as it's the baseline

            MockAggregatorV3 testFeed = new MockAggregatorV3(decimals, "TEST/USD", 1);

            if (decimals < 18) {
                testFeed.setPrice(1000 * int256(10 ** decimals));
                oracle.setPriceFeed(address(btcToken), address(testFeed));

                uint256 price = oracle.getPrice(address(btcToken));
                assertEq(price, 1000 * 1e18);
            } else {
                testFeed.setPrice(1000 * int256(10 ** decimals));
                oracle.setPriceFeed(address(btcToken), address(testFeed));

                uint256 price = oracle.getPrice(address(btcToken));
                assertEq(price, 1000 * 1e18);
            }
        }
    }

    // 测试多个代币同时配置
    function test_MultipleTokenConfiguration() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));
        oracle.setPriceFeed(address(ethToken), address(ethFeed));
        oracle.setPriceFeed(address(usdtToken), address(usdtFeed));

        assertEq(oracle.getPrice(address(btcToken)), 50000 * 1e18);
        assertEq(oracle.getPrice(address(ethToken)), 3000 * 1e18);
        assertEq(oracle.getPrice(address(usdtToken)), 1 * 1e18);
    }

    // 测试价格更新后的一致性
    function test_PriceUpdateConsistency() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 initialPrice = oracle.getPrice(address(btcToken));
        assertEq(initialPrice, 50000 * 1e18);

        btcFeed.setPrice(55000 * 1e8);
        uint256 updatedPrice = oracle.getPrice(address(btcToken));
        assertEq(updatedPrice, 55000 * 1e18);
    }

    // 测试gas消耗
    function test_GasConsumption() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        uint256 gasBefore = gasleft();
        oracle.getPrice(address(btcToken));
        uint256 gasAfter = gasleft();

        uint256 gasUsed = gasBefore - gasAfter;
        assertTrue(gasUsed < 50000); // Should be efficient
    }

    // 测试权限转移后的功能
    function test_OwnershipTransferFunctionality() public {
        oracle.setPriceFeed(address(btcToken), address(btcFeed));

        address newOwner = address(0x2);
        oracle.transferOwnership(newOwner);

        // With OpenZeppelin Ownable, ownership is transferred immediately
        vm.prank(newOwner);
        oracle.setPriceFeed(address(ethToken), address(ethFeed));

        assertEq(oracle.priceFeeds(address(ethToken)), address(ethFeed));
    }
}
