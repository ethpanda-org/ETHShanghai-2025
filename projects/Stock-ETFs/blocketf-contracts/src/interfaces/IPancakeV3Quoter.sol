// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IPancakeV3Quoter
 * @notice Interface for PancakeSwap V3 QuoterV2
 * @dev This is the interface for the deployed QuoterV2 contract on BSC
 *      Address on BSC Testnet: 0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2
 */
interface IPancakeV3Quoter {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }

    struct QuoteExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amount;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }

    /**
     * @notice Returns the amount out received for a given exact input swap without executing the swap
     * @param params The params for the quote, encoded as `QuoteExactInputSingleParams`
     * tokenIn The token being swapped in
     * tokenOut The token being swapped out
     * fee The fee of the token pool to consider for the pair
     * amountIn The desired input amount
     * sqrtPriceLimitX96 The price limit of the pool that cannot be exceeded by the swap
     * @return amountOut The amount of `tokenOut` that would be received
     * @return sqrtPriceX96After The sqrt price of the pool after the swap
     * @return initializedTicksCrossed The number of initialized ticks that the swap crossed
     * @return gasEstimate The estimate of the gas that the swap consumes
     */
    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external
        returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);

    /**
     * @notice Returns the amount in required for a given exact output swap without executing the swap
     * @param params The params for the quote, encoded as `QuoteExactOutputSingleParams`
     * tokenIn The token being swapped in
     * tokenOut The token being swapped out
     * fee The fee of the token pool to consider for the pair
     * amount The desired output amount
     * sqrtPriceLimitX96 The price limit of the pool that cannot be exceeded by the swap
     * @return amountIn The amount required as the input for the swap in order to receive `amountOut`
     * @return sqrtPriceX96After The sqrt price of the pool after the swap
     * @return initializedTicksCrossed The number of initialized ticks that the swap crossed
     * @return gasEstimate The estimate of the gas that the swap consumes
     */
    function quoteExactOutputSingle(QuoteExactOutputSingleParams memory params)
        external
        returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);

    /**
     * @notice Returns the amount out received for a given exact input but for a swap of a single pool
     * @param path The path of the swap, i.e. each token pair and the pool fee
     * @param amountIn The amount of the first token to swap
     * @return amountOut The amount of the last token that would be received
     * @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
     * @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
     * @return gasEstimate The estimate of the gas that the swap consumes
     */
    function quoteExactInput(bytes memory path, uint256 amountIn)
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    /**
     * @notice Returns the amount in required to receive the given exact output amount but for a swap of a single pool
     * @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
     * @param amountOut The amount of the last token to receive
     * @return amountIn The amount of first token required to be paid
     * @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
     * @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
     * @return gasEstimate The estimate of the gas that the swap consumes
     */
    function quoteExactOutput(bytes memory path, uint256 amountOut)
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}
