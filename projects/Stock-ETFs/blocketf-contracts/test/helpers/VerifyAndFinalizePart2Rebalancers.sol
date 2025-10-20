// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IRebalanceCallback.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockPriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Helper Rebalancers for VerifyAndFinalize Part2 Tests
 * @notice Rebalancers for testing value loss, weight improvement, orphaned tokens, and state updates
 */

/**
 * @notice Rebalancer with controlled total value loss
 */
contract ValueLossControlledRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    int256 public valueLossBps; // Can be negative (gain) or positive (loss)

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setValueLossBps(int256 _lossBps) external {
        valueLossBps = _lossBps;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Simulate value loss through sell slippage (burn all sold assets)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    // Always burn ALL sold assets (they're consumed in the swap)
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys - mint 100% (no buy slippage)
        // Value loss is simulated through other means (not buy reduction)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), targetAmount);
            }
        }

        // Return ALL assets (must have 0 balance to pass OrphanedTokens check)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that crashes asset price during callback
 */
contract PriceCrashRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    uint256 public priceCrashBps;

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setPriceCrashBps(uint256 _crashBps) external {
        priceCrashBps = _crashBps;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Crash BTC price
        if (priceCrashBps > 0) {
            uint256 currentPrice = oracle.getPrice(btc);
            uint256 newPrice = currentPrice * (10000 - priceCrashBps) / 10000;
            oracle.setPrice(btc, newPrice);
        }

        // Burn sold assets first
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys - mint all requested assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return ALL assets (must have 0 balance to pass OrphanedTokens check)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Good rebalancer for weight improvement testing
 */
contract WeightImprovementRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn sold assets first (simulate DEX consumption)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Properly execute swaps to improve weights
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return ALL assets (must have 0 balance to pass OrphanedTokens check)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that can worsen or maintain weight deviation
 */
contract NoImprovementRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    int256 public improvementBps; // Negative = worsens, 0 = no change, positive = improves

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setImprovementBps(int256 _improvement) external {
        improvementBps = _improvement;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn sold assets first (simulate DEX consumption)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Return wrong amounts to worsen/not improve weights
        // Strategy: buy less than target (if negative improvement) or more (if positive)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                uint256 actualAmount;

                if (improvementBps >= 0) {
                    // Positive: buy more (improves weights more)
                    actualAmount = targetAmount * (10000 + uint256(improvementBps)) / 10000;
                } else {
                    // Negative: buy less (worsens weights)
                    uint256 reduction = uint256(-improvementBps);
                    if (reduction >= 10000) {
                        reduction = 9999; // Cap to avoid underflow
                    }
                    actualAmount = targetAmount * (10000 - reduction) / 10000;
                }

                MockERC20(assets[i]).mint(address(this), actualAmount);
            }
        }

        // Return ALL assets (must have 0 balance to pass OrphanedTokens check)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Well-behaved rebalancer for general testing
 */
contract GoodRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn sold assets first
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return ALL assets (must have 0 balance to pass OrphanedTokens check)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that keeps orphaned tokens
 */
contract OrphanedTokensRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    mapping(address => bool) public keepAsset;
    mapping(address => uint256) public keepAmount;

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setKeepAsset(address asset, bool keep) external {
        keepAsset[asset] = keep;
    }

    function setKeepAmount(address asset, uint256 amount) external {
        keepAmount[asset] = amount;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn sold assets (except those we want to keep)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0 && !keepAsset[assets[i]]) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    uint256 toBurn = balance;
                    // If keepAmount is set, only burn excess
                    if (keepAmount[assets[i]] > 0 && balance > keepAmount[assets[i]]) {
                        toBurn = balance - keepAmount[assets[i]];
                    } else if (keepAmount[assets[i]] > 0) {
                        toBurn = 0; // Keep all if balance <= keepAmount
                    }

                    if (toBurn > 0) {
                        MockERC20(assets[i]).burn(address(this), toBurn);
                    }
                }
            }
        }

        // Handle buys
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return assets, but keep some if configured
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));

            if (keepAsset[assets[i]]) {
                // Keep all - don't return
                continue;
            }

            if (keepAmount[assets[i]] > 0) {
                // Keep specific amount
                if (balance > keepAmount[assets[i]]) {
                    IERC20(assets[i]).safeTransfer(etf, balance - keepAmount[assets[i]]);
                }
            } else if (balance > 0) {
                // Return all
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Price Manipulating Rebalancer - worsens weight deviation via price changes
 * @dev This rebalancer changes prices during callback to worsen final weight deviation
 */
contract PriceManipulatingRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    uint256 public priceDropBps = 1000; // 10% price drop for first sell asset

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setPriceDropBps(uint256 _drop) external {
        priceDropBps = _drop;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Phase 1: Burn sold assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Phase 2: Buy all assets as requested
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), targetAmount);
            }
        }

        // Phase 3: Find first sell asset and drop its price dramatically
        // Decreasing price of sold asset makes its remaining weight lower, worsening deviation
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 currentPrice = oracle.getPrice(assets[i]);
                // Drop price by specified bps (e.g., 30% drop)
                uint256 newPrice = currentPrice * (10000 - priceDropBps) / 10000;
                oracle.setPrice(assets[i], newPrice);
                break; // Only manipulate first sell asset
            }
        }

        // Phase 4: Return all assets
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}
