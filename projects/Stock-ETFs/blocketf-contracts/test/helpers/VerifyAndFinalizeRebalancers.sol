// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IRebalanceCallback.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockPriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Helper Rebalancers for VerifyAndFinalize Tests
 * @notice Collection of rebalancer contracts that simulate various swap behaviors
 * @dev These rebalancers are designed to test Core's verification logic by controlling:
 *      - Sell slippage (how much less is returned vs. what was received)
 *      - Buy variance (how much more/less is bought vs. target)
 *      - Value loss (total portfolio value change)
 *      - Weight improvement (deviation change)
 */

/**
 * @notice Normal rebalancer that properly executes swaps with configurable precision
 */
contract NormalRebalancer is IRebalanceCallback {
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

        // Simulate swap: burn sold assets (they're "consumed" in the swap)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys: mint exact target amount
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), targetAmount);
            }
        }

        // Return only bought assets (sold assets were burned)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer with controlled sell slippage
 * @dev Keeps a percentage of sold assets to simulate slippage
 */
contract SlippageControlledRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    uint256 public sellSlippageBps; // Amount to keep (100 = 1%)

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setSellSlippageBps(uint256 _slippage) external {
        sellSlippageBps = _slippage;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Simulate sell slippage by burning additional assets from Core's balance
        // If sellSlippageBps = 200 (2%), we burn an extra 2% from Core directly
        // This simulates a scenario where more assets were taken than planned
        if (sellSlippageBps > 0) {
            for (uint256 i = 0; i < assets.length; i++) {
                if (amounts[i] > 0) {
                    uint256 slippageAmount = uint256(amounts[i]) * sellSlippageBps / 10000;
                    if (slippageAmount > 0) {
                        // Burn extra from Core to simulate excessive slippage
                        MockERC20(assets[i]).burn(etf, slippageAmount);
                    }
                }
            }
        }

        // Simulate swap: burn ALL sold assets (including slippage)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys: mint exact target amount
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), targetAmount);
            }
        }

        // Return only bought assets (sold assets were burned)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Malicious rebalancer that returns MORE on sell (impossible scenario)
 */
contract MaliciousSellRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;

    constructor(address _etf, address _usdt, address _btc) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Maliciously return MORE than received for sell orders
        // This simulates an attack where the rebalancer returns extra assets
        // causing Core's balance to INCREASE instead of decrease
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 received = IERC20(assets[i]).balanceOf(address(this));
                if (received > 0) {
                    // Burn all received assets first (simulate swap)
                    MockERC20(assets[i]).burn(address(this), received);
                    // Then mint 120% of what was received (20% extra)
                    // This will cause Core's balance to increase
                    MockERC20(assets[i]).mint(address(this), received * 120 / 100);
                }
            }
        }

        // Handle buys normally
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return all assets
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that doesn't sell (returns everything)
 */
contract NoSellRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;

    constructor(address _etf, address _usdt, address _btc) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Don't burn any sold assets (simulate not selling)
        // This tests the case where actualSold = 0

        // Handle buys
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return all assets (including unsold assets)
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer with controlled buy variance (can be +/- percentage)
 */
contract BuySlippageControlledRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    int256 public buyVarianceBps; // Can be negative (less) or positive (more)

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setBuyVarianceBps(int256 _variance) external {
        buyVarianceBps = _variance;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn all sold assets (perfect swap, no sell slippage)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys with variance
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 targetAmount = uint256(-amounts[i]);
                uint256 actualAmount;

                if (buyVarianceBps >= 0) {
                    // Positive variance: buy more
                    actualAmount = targetAmount * uint256(10000 + buyVarianceBps) / 10000;
                } else {
                    // Negative variance: buy less
                    actualAmount = targetAmount * uint256(10000 - uint256(-buyVarianceBps)) / 10000;
                }

                MockERC20(assets[i]).mint(address(this), actualAmount);
            }
        }

        // Return all assets
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Malicious rebalancer that steals buy tokens (doesn't return them)
 */
contract MaliciousBuyRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;

    constructor(address _etf, address _usdt, address _btc) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Properly burn sold assets (simulate DEX consumption)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Maliciously don't mint/return bought assets
        // This causes buy order balance to not increase (or decrease if sold assets leak through)
    }
}

/**
 * @notice Rebalancer that doesn't buy anything (returns 0)
 */
contract NoBuyRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;

    constructor(address _etf, address _usdt, address _btc) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
    }

    function rebalanceCallback(address[] calldata, int256[] calldata, bytes calldata) external override {
        require(msg.sender == etf, "Not ETF");

        // Burn received USDT (sold asset) but don't buy anything
        uint256 usdtBalance = IERC20(usdt).balanceOf(address(this));
        if (usdtBalance > 0) {
            MockERC20(usdt).burn(address(this), usdtBalance);
        }

        // Don't buy/return BTC (actualBought = 0)
    }
}

/**
 * @notice Rebalancer that leaves zero-change assets untouched
 */
contract ZeroChangeRebalancer is IRebalanceCallback {
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

        // Burn sold assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Handle buys - mint all assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return all assets
        // Zero-change assets (WBNB, ETH) are never touched
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that causes tiny balance changes in zero-change assets
 */
contract TinyChangeRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    address public immutable wbnb;
    MockPriceOracle public immutable oracle;

    int256 public changePercentBps; // Can be negative or positive

    constructor(address _etf, address _usdt, address _btc, address _wbnb, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        wbnb = _wbnb;
        oracle = MockPriceOracle(_oracle);
    }

    function setChangePercentBps(int256 _changeBps) external {
        changePercentBps = _changeBps;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Phase 1: Burn all sold assets (critical!)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Phase 2: Handle buys - mint all required assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Phase 3: Cause tiny change in WBNB (zero-change asset)
        // Strategy: Mint a small additional amount to simulate natural drift/rounding
        if (changePercentBps > 0) {
            // Get WBNB's current balance in Core to calculate the tiny change
            uint256 coreWBNBBalance = IERC20(wbnb).balanceOf(etf);
            uint256 toAdd = coreWBNBBalance * uint256(changePercentBps) / 10000;
            if (toAdd > 0) {
                MockERC20(wbnb).mint(address(this), toAdd);
            }
        }
        // Note: changePercentBps < 0 (decrease) is not supported in this design
        // because rebalancer doesn't receive zero-change assets, so can't decrease them

        // Phase 4: Return all assets to ETF
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer for mixed operations testing (handles multiple asset types)
 */
contract MixedOperationsRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address[] public assets;
    MockPriceOracle public immutable oracle;

    mapping(uint256 => uint256) public sellSlippages; // asset index => slippage bps

    constructor(address _etf, address[] memory _assets, address _oracle) {
        etf = _etf;
        assets = _assets;
        oracle = MockPriceOracle(_oracle);
    }

    function setSellSlippageBps(uint256 assetIndex, uint256 slippage) external {
        sellSlippages[assetIndex] = slippage;
    }

    function rebalanceCallback(address[] calldata callAssets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Burn sold assets with controlled slippage
        for (uint256 i = 0; i < callAssets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(callAssets[i]).balanceOf(address(this));
                if (balance > 0) {
                    uint256 slippage = sellSlippages[i];
                    uint256 toBurn = balance * (10000 - slippage) / 10000;
                    if (toBurn > 0) {
                        MockERC20(callAssets[i]).burn(address(this), toBurn);
                    }
                    // Keep slippage% as unsold
                }
            }
        }

        // Handle buys - mint exact target amount
        for (uint256 i = 0; i < callAssets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(callAssets[i]).mint(address(this), amount);
            }
        }

        // Return all remaining assets
        for (uint256 i = 0; i < callAssets.length; i++) {
            uint256 balance = IERC20(callAssets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(callAssets[i]).safeTransfer(etf, balance);
            }
        }
    }
}

/**
 * @notice Rebalancer that changes price during callback
 */
contract PriceChangingRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public immutable etf;
    address public immutable usdt;
    address public immutable btc;
    MockPriceOracle public immutable oracle;

    uint256 public priceDrop; // in bps (10000 = 100%)

    constructor(address _etf, address _usdt, address _btc, address _oracle) {
        etf = _etf;
        usdt = _usdt;
        btc = _btc;
        oracle = MockPriceOracle(_oracle);
    }

    function setPriceDrop(uint256 _priceDrop) external {
        priceDrop = _priceDrop;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata)
        external
        override
    {
        require(msg.sender == etf, "Not ETF");

        // Handle sells - burn sold assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            }
        }

        // Change BTC price during callback (after handling sells, before buys)
        if (priceDrop > 0) {
            uint256 currentPrice = oracle.getPrice(btc);
            uint256 newPrice = currentPrice * (10000 - priceDrop) / 10000;
            oracle.setPrice(btc, newPrice);
        }

        // Handle buys - mint all assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                uint256 amount = uint256(-amounts[i]);
                MockERC20(assets[i]).mint(address(this), amount);
            }
        }

        // Return all bought assets
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etf, balance);
            }
        }
    }
}
