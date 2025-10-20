// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPancakeV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockERC20.sol";

/**
 * @title MockPancakeV2Router
 * @notice Mock implementation of PancakeSwap V2 Router for testing
 */
contract MockPancakeV2Router is IPancakeV2Router {
    // Mock exchange rates
    mapping(address => uint256) public mockPrices;

    // Flag to disable minting for testing failure scenarios
    bool public mintingEnabled = true;

    constructor() {
        // Set some default mock prices
    }

    function setMockPrice(address token, uint256 price) external {
        mockPrices[token] = price;
    }

    function setMintingEnabled(bool enabled) external {
        mintingEnabled = enabled;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "EXPIRED");
        require(path.length >= 2, "INVALID_PATH");
        require(!shouldFail, "Mock V2 router failure");

        // Store path for testing
        lastUsedPath = path;
        swapExactTokensForTokensWasCalled = true;

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        uint256 finalAmount;
        if (expectedAmountOut > 0) {
            finalAmount = expectedAmountOut;
        } else {
            // Calculate output for each step in path
            for (uint256 i = 0; i < path.length - 1; i++) {
                uint256 priceIn = mockPrices[path[i]];
                uint256 priceOut = mockPrices[path[i + 1]];

                if (priceIn == 0) priceIn = 1e18;
                if (priceOut == 0) priceOut = 1e18;

                amounts[i + 1] = (amounts[i] * priceIn) / priceOut;
                // Apply slippage/fee
                amounts[i + 1] = (amounts[i + 1] * (10000 - slippagePercent)) / 10000;
            }
            finalAmount = amounts[amounts.length - 1];
        }

        amounts[amounts.length - 1] = finalAmount;
        require(finalAmount >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        // Transfer tokens
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        _mint(path[path.length - 1], to, finalAmount);

        return amounts;
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "EXPIRED");
        require(path.length >= 2, "INVALID_PATH");
        require(!shouldFail, "Mock V2 router failure");

        // Store path for testing
        lastUsedPath = path;
        swapTokensForExactTokensWasCalled = true;

        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;

        uint256 requiredInput;
        if (expectedAmountIn > 0) {
            requiredInput = expectedAmountIn;
        } else {
            // Calculate required input working backwards
            for (uint256 i = path.length - 1; i > 0; i--) {
                uint256 priceIn = mockPrices[path[i - 1]];
                uint256 priceOut = mockPrices[path[i]];

                if (priceIn == 0) priceIn = 1e18;
                if (priceOut == 0) priceOut = 1e18;

                amounts[i - 1] = (amounts[i] * priceOut) / priceIn;
                // Add 0.3% fee
                amounts[i - 1] = (amounts[i - 1] * 1000) / 997;
            }
            requiredInput = amounts[0];
        }

        amounts[0] = requiredInput;
        require(requiredInput <= amountInMax, "EXCESSIVE_INPUT_AMOUNT");

        // Transfer tokens
        IERC20(path[0]).transferFrom(msg.sender, address(this), requiredInput);
        _mint(path[path.length - 1], to, amountOut);

        return amounts;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "INVALID_PATH");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            uint256 priceIn = mockPrices[path[i]];
            uint256 priceOut = mockPrices[path[i + 1]];

            if (priceIn == 0) priceIn = 1e18;
            if (priceOut == 0) priceOut = 1e18;

            amounts[i + 1] = (amounts[i] * priceIn) / priceOut;
            amounts[i + 1] = (amounts[i + 1] * (10000 - slippagePercent)) / 10000; // Apply slippage
        }
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "INVALID_PATH");

        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;

        for (uint256 i = path.length - 1; i > 0; i--) {
            uint256 priceIn = mockPrices[path[i - 1]];
            uint256 priceOut = mockPrices[path[i]];

            if (priceIn == 0) priceIn = 1e18;
            if (priceOut == 0) priceOut = 1e18;

            amounts[i - 1] = (amounts[i] * priceOut) / priceIn;
            amounts[i - 1] = (amounts[i - 1] * 1000) / 997; // Add fee
        }
    }

    // Additional functions for testing (not in interface)
    function factory() external pure returns (address) {
        return address(0); // Mock factory
    }

    function WETH() external pure returns (address) {
        return address(0); // Mock WETH
    }

    // Helper function for minting tokens (mock behavior)
    function _mint(address token, address to, uint256 amount) internal {
        // Check if we have enough tokens to transfer
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance >= amount) {
            IERC20(token).transfer(to, amount);
        } else {
            // If we don't have enough tokens, try to mint them (for MockERC20)
            if (mintingEnabled) {
                try MockERC20(token).mint(address(this), amount) {
                    IERC20(token).transfer(to, amount);
                } catch {
                    // If minting fails, revert with insufficient balance
                    revert("Insufficient liquidity");
                }
            } else {
                // Minting disabled, revert with insufficient liquidity
                revert("Insufficient liquidity");
            }
        }
    }

    // Emergency withdraw for testing
    function withdraw(address token, uint256 amount) external {
        if (token == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(token).transfer(msg.sender, amount);
        }
    }

    // Additional testing functions
    function setDefaultSlippage(uint256 slippage) external {
        // Mock function for testing - does nothing
    }

    // Slippage simulation (in basis points, e.g., 100 = 1%)
    uint256 private slippagePercent = 30; // Default 0.3% like V2 fee

    function setSlippagePercent(uint256 _slippagePercent) external {
        slippagePercent = _slippagePercent;
    }

    // Test helper variables
    uint256 private expectedAmountIn;
    uint256 private expectedAmountOut;
    bool private swapTokensForExactTokensWasCalled;
    bool private swapExactTokensForTokensWasCalled;
    bool private shouldFail;
    bool private lowLiquidity;
    address[] private lastUsedPath;

    function setExpectedAmountIn(uint256 amount) external {
        expectedAmountIn = amount;
    }

    function setExpectedAmountOut(uint256 amount) external {
        expectedAmountOut = amount;
    }

    function setShouldFail(bool fail) external {
        shouldFail = fail;
    }

    function setLowLiquidity(bool low) external {
        lowLiquidity = low;
    }

    function swapTokensForExactTokensCalled() external view returns (bool) {
        return swapTokensForExactTokensWasCalled;
    }

    function swapExactTokensForTokensCalled() external view returns (bool) {
        return swapExactTokensForTokensWasCalled;
    }

    function lastPath() external view returns (address[] memory) {
        return lastUsedPath;
    }

    function resetCallFlags() external {
        swapTokensForExactTokensWasCalled = false;
        swapExactTokensForTokensWasCalled = false;
    }

    receive() external payable {}
}
