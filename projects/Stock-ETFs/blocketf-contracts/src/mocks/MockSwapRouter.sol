// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockERC20.sol";

/**
 * @title MockSwapRouter
 * @notice Mock implementation of PancakeSwap V3 SwapRouter for testing
 */
contract MockSwapRouter is ISwapRouter {
    // Mock exchange rate: 1 token = 1 token (simplified)
    mapping(address => uint256) public mockPrices;

    // Flag to disable minting for testing failure scenarios
    bool public mintingEnabled = true;

    constructor() {
        // Set some default mock prices for testing
        // These can be overridden in tests
    }

    function setMockPrice(address token, uint256 price) external {
        mockPrices[token] = price;
    }

    function setMintingEnabled(bool enabled) external {
        mintingEnabled = enabled;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        require(!shouldFail, "Mock V3 router failure");
        require(!feeFailFlags[params.fee], "Mock V3 router fee tier failure");
        exactInputSingleWasCalled = true;

        // Mock swap logic - transfer tokens and return mock output
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        // Calculate mock output based on simple price ratio
        uint256 priceIn = mockPrices[params.tokenIn];
        uint256 priceOut = mockPrices[params.tokenOut];

        if (priceIn == 0) priceIn = 1e18;
        if (priceOut == 0) priceOut = 1e18;

        amountOut = (params.amountIn * priceIn) / priceOut;

        // Apply mock slippage based on slippagePercent
        amountOut = (amountOut * (10000 - slippagePercent)) / 10000;

        // Check minimum output
        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");

        // Mint output tokens to recipient (simplified mock behavior)
        _mint(params.tokenOut, params.recipient, amountOut);

        return amountOut;
    }

    function exactInput(ExactInputParams calldata params) external payable override returns (uint256 amountOut) {
        // Simplified multi-hop swap
        // For testing, just implement single-hop logic
        IERC20 tokenIn = IERC20(_getTokenFromPath(params.path, 0));
        IERC20 tokenOut = IERC20(_getTokenFromPath(params.path, _getPathLength(params.path) - 1));

        tokenIn.transferFrom(msg.sender, address(this), params.amountIn);

        // Mock calculation
        uint256 priceIn = mockPrices[address(tokenIn)];
        uint256 priceOut = mockPrices[address(tokenOut)];

        if (priceIn == 0) priceIn = 1e18;
        if (priceOut == 0) priceOut = 1e18;

        amountOut = (params.amountIn * priceIn) / priceOut;
        amountOut = (amountOut * (10000 - slippagePercent)) / 10000; // Mock slippage

        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");

        _mint(address(tokenOut), params.recipient, amountOut);

        return amountOut;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountIn)
    {
        require(!shouldFail, "Mock V3 router failure");
        require(!feeFailFlags[params.fee], "Mock V3 router fee tier failure");
        exactOutputSingleWasCalled = true;

        // Mock exact output swap
        uint256 priceIn = mockPrices[params.tokenIn];
        uint256 priceOut = mockPrices[params.tokenOut];

        if (priceIn == 0) priceIn = 1e18;
        if (priceOut == 0) priceOut = 1e18;

        amountIn = (params.amountOut * priceOut) / priceIn;
        amountIn = (amountIn * 101) / 100; // Mock slippage for exact output

        require(amountIn <= params.amountInMaximum, "Excessive input amount");

        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
        _mint(params.tokenOut, params.recipient, params.amountOut);

        return amountIn;
    }

    function exactOutput(ExactOutputParams calldata params) external payable override returns (uint256 amountIn) {
        // Simplified multi-hop exact output
        IERC20 tokenIn = IERC20(_getTokenFromPath(params.path, 0));
        IERC20 tokenOut = IERC20(_getTokenFromPath(params.path, _getPathLength(params.path) - 1));

        uint256 priceIn = mockPrices[address(tokenIn)];
        uint256 priceOut = mockPrices[address(tokenOut)];

        if (priceIn == 0) priceIn = 1e18;
        if (priceOut == 0) priceOut = 1e18;

        amountIn = (params.amountOut * priceOut) / priceIn;
        amountIn = (amountIn * 101) / 100;

        require(amountIn <= params.amountInMaximum, "Excessive input amount");

        tokenIn.transferFrom(msg.sender, address(this), amountIn);
        _mint(address(tokenOut), params.recipient, params.amountOut);

        return amountIn;
    }

    // Helper functions for mock implementation
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

    function _getTokenFromPath(bytes memory path, uint256 index) internal pure returns (address) {
        // Simplified path parsing - in real implementation this would be more complex
        // For testing, assume simple token addresses
        return address(0); // Placeholder
    }

    function _getPathLength(bytes memory path) internal pure returns (uint256) {
        // Simplified path length calculation
        return 2; // Assume 2-hop for testing
    }

    // Emergency functions for testing
    function withdraw(address token, uint256 amount) external {
        IERC20(token).transfer(msg.sender, amount);
    }

    // Additional testing functions
    function setDefaultSlippage(uint256 slippage) external {
        // Mock function for testing - does nothing
    }

    // Slippage simulation (in basis points, e.g., 100 = 1%)
    uint256 private slippagePercent = 100; // Default 1% slippage

    function setSlippagePercent(uint256 _slippagePercent) external {
        slippagePercent = _slippagePercent;
    }

    /// @notice Helper function for testing - swap USDT to BTC
    function swapUSDTToBTC(uint256 usdtAmount) external returns (uint256 btcReceived) {
        address usdt = address(0); // Will be set by caller
        address btc = address(0); // Will be set by caller

        IERC20(usdt).transferFrom(msg.sender, address(this), usdtAmount);

        uint256 usdtPrice = mockPrices[usdt];
        uint256 btcPrice = mockPrices[btc];

        if (usdtPrice == 0) usdtPrice = 1e18;
        if (btcPrice == 0) btcPrice = 50000e18;

        btcReceived = (usdtAmount * usdtPrice) / btcPrice;
        btcReceived = (btcReceived * (10000 - slippagePercent)) / 10000;

        _mint(btc, msg.sender, btcReceived);
        return btcReceived;
    }

    // Test helper variables
    bool private shouldFail;
    bool private exactInputSingleWasCalled;
    bool private exactOutputSingleWasCalled;

    // Fee-specific failure flags
    mapping(uint24 => bool) private feeFailFlags;

    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }

    /// @notice Set failure flag for specific fee tier
    function setFailForFeesTiers(uint24 fee, bool _shouldFail) external {
        feeFailFlags[fee] = _shouldFail;
    }

    function exactInputSingleCalled() external view returns (bool) {
        return exactInputSingleWasCalled;
    }

    function exactOutputSingleCalled() external view returns (bool) {
        return exactOutputSingleWasCalled;
    }

    function resetCallFlags() external {
        exactInputSingleWasCalled = false;
        exactOutputSingleWasCalled = false;
    }

    receive() external payable {}
}
