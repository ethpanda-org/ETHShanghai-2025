// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/ETFRouterV1.sol";
import "../../src/mocks/MockBlockETFCore.sol";
import "../../src/mocks/MockPriceOracle.sol";
import "../../src/mocks/MockSwapRouter.sol";
import "../../src/mocks/MockPancakeV2Router.sol";
import "../../src/mocks/MockQuoterV3.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title ETFRouterV1 Test Base
 * @notice Base contract for ETFRouterV1 testing
 */
abstract contract ETFRouterV1TestBase is Test {
    // Test accounts
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public admin = makeAddr("admin");

    // Mock contracts (will be deployed in tests as needed)
    MockBlockETFCore public etfCore;
    MockPriceOracle public priceOracle;
    MockSwapRouter public v3Router;
    MockPancakeV2Router public v2Router;
    MockQuoterV3 public quoterV3;

    // Mock tokens
    MockERC20 public usdt;
    MockERC20 public wbnb;
    MockERC20 public btc;
    MockERC20 public eth;

    // The contract we're testing (will be deployed in specific tests)
    ETFRouterV1 public router;

    function setUp() public virtual {
        // Deploy mock tokens (using 18 decimals for simplicity in testing)
        usdt = new MockERC20("USDT", "USDT", 18);
        wbnb = new MockERC20("WBNB", "WBNB", 18);
        btc = new MockERC20("Bitcoin", "BTC", 18);
        eth = new MockERC20("Ethereum", "ETH", 18);

        // Deploy mock external dependencies
        priceOracle = new MockPriceOracle();
        etfCore = new MockBlockETFCore(address(priceOracle));
        v3Router = new MockSwapRouter();
        v2Router = new MockPancakeV2Router();
        quoterV3 = new MockQuoterV3(address(priceOracle));

        // Setup price oracle with realistic prices
        priceOracle.setPrice(address(usdt), 1e18); // $1
        priceOracle.setPrice(address(wbnb), 300e18); // $300
        priceOracle.setPrice(address(btc), 50000e18); // $50,000
        priceOracle.setPrice(address(eth), 3000e18); // $3,000

        // Setup mock router prices
        v3Router.setMockPrice(address(usdt), 1e18); // $1
        v3Router.setMockPrice(address(wbnb), 300e18); // $300
        v3Router.setMockPrice(address(btc), 50000e18); // $50,000
        v3Router.setMockPrice(address(eth), 3000e18); // $3,000

        v2Router.setMockPrice(address(usdt), 1e18); // $1
        v2Router.setMockPrice(address(wbnb), 300e18); // $300
        v2Router.setMockPrice(address(btc), 50000e18); // $50,000
        v2Router.setMockPrice(address(eth), 3000e18); // $3,000

        // Initialize ETF with some assets
        _setupETFCore();

        // Fund routers with tokens for swapping
        _fundRouters();
    }

    function _setupETFCore() internal {
        // Setup ETF with 4 assets: USDT(40%), WBNB(20%), BTC(20%), ETH(20%)
        address[] memory assets = new address[](4);
        uint32[] memory weights = new uint32[](4);

        assets[0] = address(usdt);
        assets[1] = address(wbnb);
        assets[2] = address(btc);
        assets[3] = address(eth);

        weights[0] = 4000; // 40%
        weights[1] = 2000; // 20%
        weights[2] = 2000; // 20%
        weights[3] = 2000; // 20%

        // Fund this contract with initial assets for ETF initialization
        uint256 targetValueUSD = 100000e18; // $100,000 total

        // Calculate required amounts using the same formula as MockBlockETFCore
        // Formula: (assetValueUSD * 1e18) / assetPrice
        uint256 usdtValueUSD = (targetValueUSD * 4000) / 10000; // $40,000
        uint256 wbnbValueUSD = (targetValueUSD * 2000) / 10000; // $20,000
        uint256 btcValueUSD = (targetValueUSD * 2000) / 10000; // $20,000
        uint256 ethValueUSD = (targetValueUSD * 2000) / 10000; // $20,000

        uint256 usdtAmount = (usdtValueUSD * 1e18) / 1e18; // USDT price is 1e18
        uint256 wbnbAmount = (wbnbValueUSD * 1e18) / 300e18; // WBNB price is 300e18
        uint256 btcAmount = (btcValueUSD * 1e18) / 50000e18; // BTC price is 50000e18
        uint256 ethAmount = (ethValueUSD * 1e18) / 3000e18; // ETH price is 3000e18

        usdt.mint(address(this), usdtAmount);
        wbnb.mint(address(this), wbnbAmount);
        btc.mint(address(this), btcAmount);
        eth.mint(address(this), ethAmount);

        // Approve ETF Core to spend our tokens
        usdt.approve(address(etfCore), type(uint256).max);
        wbnb.approve(address(etfCore), type(uint256).max);
        btc.approve(address(etfCore), type(uint256).max);
        eth.approve(address(etfCore), type(uint256).max);

        // Initialize the ETF
        etfCore.initialize(assets, weights, targetValueUSD);
    }

    function _fundRouters() internal {
        // Fund routers with lots of tokens for swapping
        uint256 largeAmount = 1000000e18; // 1M tokens

        // Mint tokens to routers (all 18 decimals now)
        usdt.mint(address(v3Router), largeAmount);
        wbnb.mint(address(v3Router), largeAmount);
        btc.mint(address(v3Router), largeAmount);
        eth.mint(address(v3Router), largeAmount);

        usdt.mint(address(v2Router), largeAmount);
        wbnb.mint(address(v2Router), largeAmount);
        btc.mint(address(v2Router), largeAmount);
        eth.mint(address(v2Router), largeAmount);
    }
}
