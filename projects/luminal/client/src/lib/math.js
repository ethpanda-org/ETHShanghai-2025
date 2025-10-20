import { commitmentFromState } from "./commitment";
const BPS_DIVISOR = 10000n;
export const SCALE_ETH = 10n ** 18n;
export const SCALE_USDC = 10n ** 6n;
export const formatBigint = (value, decimals, precision = 4) => {
    const scale = 10n ** BigInt(decimals);
    const integerPart = value / scale;
    const remainder = value % scale;
    const remainderStr = remainder.toString().padStart(decimals, "0");
    const trimmed = remainderStr.slice(0, precision);
    const sanitized = trimmed.replace(/0+$/, "");
    return sanitized.length > 0
        ? `${integerPart.toString()}.${sanitized}`
        : integerPart.toString();
};
export const parseAmount = (value, decimals) => {
    const sanitized = value.trim();
    if (!sanitized)
        return 0n;
    const [intPart, fracPart = ""] = sanitized.split(".");
    const normalizedFrac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
    const full = `${intPart}${normalizedFrac}`;
    return BigInt(full);
};
export const computeSwapState = (state, amountIn) => {
    const amountInAfterFee = (amountIn * (BPS_DIVISOR - state.feeBps)) / BPS_DIVISOR;
    if (amountInAfterFee <= 0n) {
        throw new Error("Amount must be greater than fee impact");
    }
    const denominator = state.reserve0 + amountInAfterFee;
    if (denominator === 0n) {
        throw new Error("Invalid pool reserves");
    }
    const amountOut = (state.reserve1 * amountInAfterFee) / denominator;
    if (amountOut <= 0n) {
        throw new Error("Amount out is zero. Pool may lack liquidity.");
    }
    const newState = {
        reserve0: state.reserve0 + amountInAfterFee,
        reserve1: state.reserve1 - amountOut,
        nonce: state.nonce + 1n,
        feeBps: state.feeBps
    };
    return { amountInAfterFee, amountOut, newState };
};
export const calculateSwap = async (state, amountIn) => {
    const { amountInAfterFee, amountOut, newState } = computeSwapState(state, amountIn);
    const [commitmentOld, commitmentNew] = await Promise.all([
        commitmentFromState(state),
        commitmentFromState(newState)
    ]);
    return {
        amountIn,
        amountInAfterFee,
        amountOut,
        commitmentOld,
        commitmentNew,
        stateOld: state,
        stateNew: newState
    };
};
export const previewSwap = (state, amountIn) => {
    return computeSwapState(state, amountIn);
};
export const calculatePriceImpactBps = (state, newState) => {
    const spotBefore = Number(state.reserve1) / Number(state.reserve0);
    const spotAfter = Number(newState.reserve1) / Number(newState.reserve0);
    const impact = ((spotBefore - spotAfter) / spotBefore) * 10000;
    return Number.isFinite(impact) ? Math.max(impact, 0) : 0;
};
export const calculateMinimumOut = (amountOut, slippageBps) => {
    const slippage = (amountOut * BigInt(slippageBps)) / BPS_DIVISOR;
    return amountOut - slippage;
};
