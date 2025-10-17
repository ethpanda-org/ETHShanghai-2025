// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IQuoterV3.sol";
import "../interfaces/IPriceOracle.sol";

/**
 * @title MockQuoterV3
 * @notice Mock implementation of view-only QuoterV3 for testing
 */
contract MockQuoterV3 is IQuoterV3 {
    IPriceOracle public immutable priceOracle;
    bool public shouldRevert;

    constructor(address _priceOracle) {
        priceOracle = IPriceOracle(_priceOracle);
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /// @notice Mock implementation of quoteExactInputSingle
    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external
        view
        returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)
    {
        require(!shouldRevert, "MockQuoterV3: forced revert");

        uint256 tokenInPrice = priceOracle.getPrice(params.tokenIn);
        uint256 tokenOutPrice = priceOracle.getPrice(params.tokenOut);

        // Calculate amount out with 0.3% fee deduction
        amountOut = (params.amountIn * tokenInPrice * 997) / (tokenOutPrice * 1000);

        // Mock values
        sqrtPriceX96After = 0;
        initializedTicksCrossed = 0;
        gasEstimate = 100000;
    }

    /// @notice Mock implementation of quoteExactOutputSingle
    function quoteExactOutputSingle(QuoteExactOutputSingleParams memory params)
        external
        view
        returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)
    {
        require(!shouldRevert, "MockQuoterV3: forced revert");

        uint256 tokenInPrice = priceOracle.getPrice(params.tokenIn);
        uint256 tokenOutPrice = priceOracle.getPrice(params.tokenOut);

        // Calculate amount in with 0.3% fee addition
        amountIn = (params.amountOut * tokenOutPrice * 1003) / (tokenInPrice * 1000);

        // Mock values
        sqrtPriceX96After = 0;
        initializedTicksCrossed = 0;
        gasEstimate = 100000;
    }

    /// @notice Mock implementation of quoteExactInput
    function quoteExactInput(bytes memory, /* path */ uint256 amountIn)
        external
        pure
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        )
    {
        // Simplified mock - assume direct conversion with fee
        amountOut = (amountIn * 997) / 1000;
        sqrtPriceX96AfterList = new uint160[](0);
        initializedTicksCrossedList = new uint32[](0);
        gasEstimate = 150000;
    }

    /// @notice Mock implementation of quoteExactOutput
    function quoteExactOutput(bytes memory, /* path */ uint256 amountOut)
        external
        pure
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        )
    {
        // Simplified mock - assume direct conversion with fee
        amountIn = (amountOut * 1003) / 1000;
        sqrtPriceX96AfterList = new uint160[](0);
        initializedTicksCrossedList = new uint32[](0);
        gasEstimate = 150000;
    }

    // Additional testing functions
    function setDefaultSlippage(uint256 slippage) external {
        // Mock function for testing - does nothing
    }
}
