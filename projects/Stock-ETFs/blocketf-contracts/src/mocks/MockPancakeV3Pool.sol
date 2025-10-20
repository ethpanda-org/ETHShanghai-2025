// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPancakeV3Pool.sol";

contract MockPancakeV3Pool is IPancakeV3Pool {
    address public immutable override token0;
    address public immutable override token1;
    uint24 public immutable override fee;
    uint160 public sqrtPriceX96 = 1 << 96;
    int24 public tick = 0;

    constructor(address _token0, address _token1, uint24 _fee) {
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
    }

    function setSqrtPriceX96(uint160 _sqrtPriceX96) external {
        sqrtPriceX96 = _sqrtPriceX96;
    }

    function setTick(int24 _tick) external {
        tick = _tick;
    }

    function factory() external view returns (address) {
        return address(0);
    }

    function tickSpacing() external view returns (int24) {
        return 60;
    }

    function maxLiquidityPerTick() external view returns (uint128) {
        return type(uint128).max;
    }

    function slot0()
        external
        view
        override
        returns (
            uint160 sqrtPriceX96_,
            int24 tick_,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        )
    {
        return (sqrtPriceX96, tick, 0, 1, 1, 0, true);
    }

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityX128s)
    {
        tickCumulatives = new int56[](secondsAgos.length);
        secondsPerLiquidityX128s = new uint160[](secondsAgos.length);
    }

    function liquidity() external view override returns (uint128) {
        return 1000000e18;
    }

    function tickBitmap(int16) external view returns (uint256) {
        return 0;
    }

    function positions(bytes32)
        external
        view
        returns (
            uint128 liquidity_,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        )
    {
        return (0, 0, 0, 0, 0);
    }

    function feeGrowthGlobal0X128() external view returns (uint256) {
        return 0;
    }

    function feeGrowthGlobal1X128() external view returns (uint256) {
        return 0;
    }

    function protocolFees() external view returns (uint128 token0_, uint128 token1_) {
        return (0, 0);
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        // Mock implementation
        return (amountSpecified, -amountSpecified);
    }

    function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external {
        // Mock implementation
    }

    function mint(address recipient, int24 tickLower, int24 tickUpper, uint128 amount, bytes calldata data)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        // Mock implementation
        return (0, 0);
    }

    function burn(int24 tickLower, int24 tickUpper, uint128 amount)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        // Mock implementation
        return (0, 0);
    }

    function collect(
        address recipient,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Requested,
        uint128 amount1Requested
    ) external returns (uint128 amount0, uint128 amount1) {
        // Mock implementation
        return (0, 0);
    }

    function increaseObservationCardinalityNext(uint16 observationCardinalityNext) external {
        // Mock implementation
    }

    function setFeeProtocol() external {
        // Mock implementation
    }

    function collectProtocol(address recipient, uint128 amount0Requested, uint128 amount1Requested)
        external
        returns (uint128 amount0, uint128 amount1)
    {
        // Mock implementation
        return (0, 0);
    }
}
