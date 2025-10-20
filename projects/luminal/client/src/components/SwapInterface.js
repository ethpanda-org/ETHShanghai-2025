import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { TokenInput } from "./TokenInput";
import { SlippageControl } from "./SlippageControl";
import { StatusTimeline } from "./StatusTimeline";
import { CommitmentBadge } from "./CommitmentBadge";
import { usePoolState } from "../hooks/usePoolState";
import { useSwap } from "../hooks/useSwap";
import { calculateMinimumOut, calculatePriceImpactBps, formatBigint, parseAmount, previewSwap } from "../lib/math";
import { formatPercent } from "../lib/format";
const sanitizeInput = (value) => {
    const normalized = value.replace(/,/g, ".");
    if (normalized === ".")
        return "0.";
    return normalized.replace(/[^0-9.]/g, "");
};
export function SwapInterface() {
    const { isConnected } = useAccount();
    const { poolState, commitment } = usePoolState();
    const [amountInRaw, setAmountInRaw] = useState("1.0");
    const [slippageBps, setSlippageBps] = useState(50); // 0.5%
    const amountIn = useMemo(() => parseAmount(amountInRaw || "0", 18), [amountInRaw]);
    const preview = useMemo(() => {
        if (!poolState || amountIn <= 0n)
            return null;
        try {
            const { amountOut, amountInAfterFee, newState } = previewSwap(poolState, amountIn);
            const priceImpactBps = calculatePriceImpactBps(poolState, newState);
            const minimumOut = calculateMinimumOut(amountOut, slippageBps);
            return {
                amountOut,
                amountInAfterFee,
                feePaid: amountIn - amountInAfterFee,
                priceImpactBps,
                minimumOut
            };
        }
        catch (calcError) {
            console.warn("Preview failed", calcError);
            return null;
        }
    }, [poolState, amountIn, slippageBps]);
    const swap = useSwap(poolState ?? null);
    const buttonLabel = useMemo(() => {
        if (!isConnected)
            return "Connect wallet";
        switch (swap.phase) {
            case "calculating":
                return "Calculating swap";
            case "proving":
                return "Generating proof";
            case "awaitingSignature":
                return "Confirm in wallet";
            case "pending":
                return "Waiting for verifier";
            case "confirmed":
                return "Swap confirmed";
            case "error":
                return "Retry swap";
            default:
                return "Swap privately";
        }
    }, [swap.phase, isConnected]);
    const buttonDisabled = !isConnected ||
        !poolState ||
        !preview ||
        amountIn === 0n ||
        ["calculating", "proving", "awaitingSignature", "pending"].includes(swap.phase);
    const handleAmountChange = (next) => {
        setAmountInRaw(sanitizeInput(next));
    };
    const handleSwap = async () => {
        if (!preview || amountIn === 0n)
            return;
        try {
            await swap.executeSwap({ amountIn, slippageBps });
        }
        catch (executeError) {
            console.error(executeError);
        }
    };
    const statusMessage = useMemo(() => {
        if (swap.error)
            return swap.error;
        return null;
    }, [swap.error]);
    const formattedAmountOut = preview
        ? formatBigint(preview.amountOut, 6, 3)
        : "0";
    const formattedMinimumOut = preview
        ? formatBigint(preview.minimumOut, 6, 3)
        : "0";
    return (_jsx("section", { className: "w-full max-w-3xl rounded-3xl bg-surface/90 p-8 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.45)]", children: _jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("header", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-primary/80", children: "zkSwap \u00B7 ETH \u21C4 USDC" }), _jsx("h1", { className: "mt-3 text-4xl font-semibold tracking-tight", children: "Swap anytime, stay unseen." }), _jsx("p", { className: "mt-2 text-sm text-neutral-400", children: "Computation runs entirely in your browser. The chain only sees a new Poseidon commitment and a Groth16 proof." })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[2fr,1fr]", children: [_jsxs("div", { className: "space-y-5", children: [_jsx(TokenInput, { label: "You pay", value: amountInRaw, tokenSymbol: "ETH", tokenLabel: "Shielded", onChange: handleAmountChange, placeholder: "0.0", caption: `~ ${formatBigint(amountIn, 18, 4)} ETH` }), _jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "rounded-full bg-surfaceHighlight px-3 py-1 text-xs text-neutral-400", children: "zkSNARK" }) }), _jsx(TokenInput, { label: "You receive", value: preview ? formattedAmountOut : "0", tokenSymbol: "USDC", tokenLabel: "Shielded", readOnly: true, caption: preview
                                        ? `Min ${formattedMinimumOut} USDC (${formatPercent(preview.priceImpactBps)} impact)`
                                        : undefined }), preview ? (_jsxs("div", { className: "rounded-2xl bg-surfaceMuted px-4 py-3 text-xs text-neutral-400", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "After fee" }), _jsxs("span", { className: "text-neutral-200", children: [formatBigint(preview.amountInAfterFee, 18, 4), " ETH"] })] }), _jsxs("div", { className: "mt-1 flex justify-between", children: [_jsx("span", { children: "Protocol fee" }), _jsxs("span", { className: "text-neutral-200", children: [formatBigint(preview.feePaid, 18, 6), " ETH"] })] })] })) : null, _jsx(SlippageControl, { value: slippageBps, onChange: setSlippageBps }), _jsx("button", { type: "button", onClick: handleSwap, disabled: buttonDisabled, className: `w-full rounded-2xl py-4 text-lg font-semibold transition ${buttonDisabled
                                        ? "cursor-not-allowed bg-neutral-700 text-neutral-500"
                                        : "bg-primary text-white shadow-[0_18px_40px_rgba(255,0,122,0.35)] hover:brightness-110"}`, children: buttonLabel }), statusMessage ? (_jsx("p", { className: "rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300", children: statusMessage })) : null, _jsx(CommitmentBadge, { commitment: commitment })] }), _jsxs("aside", { className: "space-y-5", children: [_jsxs("div", { className: "rounded-2xl bg-surfaceMuted p-5", children: [_jsx("p", { className: "text-sm font-medium text-neutral-200", children: "Proof workflow" }), _jsx("p", { className: "text-xs text-neutral-500", children: "Follow each phase of the private execution pipeline." }), _jsx("div", { className: "mt-4", children: _jsx(StatusTimeline, { phase: swap.phase }) })] }), _jsxs("div", { className: "rounded-2xl bg-surfaceMuted p-5", children: [_jsx("p", { className: "text-sm font-medium text-neutral-200", children: "Pool snapshot" }), poolState ? (_jsxs("ul", { className: "mt-3 space-y-2 text-xs text-neutral-400", children: [_jsxs("li", { children: [_jsx("span", { className: "text-neutral-500", children: "Reserves:" }), " ", _jsxs("span", { className: "text-neutral-200", children: [formatBigint(poolState.reserve0, 18, 3), " ETH \u00B7", " ", formatBigint(poolState.reserve1, 6, 3), " USDC"] })] }), _jsxs("li", { children: [_jsx("span", { className: "text-neutral-500", children: "Nonce:" }), " ", _jsxs("span", { className: "text-neutral-200", children: ["#", poolState.nonce.toString()] })] }), _jsxs("li", { children: [_jsx("span", { className: "text-neutral-500", children: "Fee:" }), " ", _jsxs("span", { className: "text-neutral-200", children: [(Number(poolState.feeBps) / 100).toFixed(2), " bps"] })] })] })) : null] }), swap.summary ? (_jsxs("div", { className: "rounded-2xl bg-emerald-500/10 p-5 text-xs text-neutral-100", children: [_jsx("p", { className: "text-sm font-semibold text-emerald-300", children: "Latest swap" }), _jsx("p", { className: "text-neutral-400", children: swap.summary.reservesText }), _jsxs("p", { className: "mt-2", children: ["Expected out:", " ", _jsxs("span", { className: "font-mono", children: [formatBigint(swap.summary.expectedOut, 6, 3), " USDC"] })] }), _jsxs("p", { children: ["Minimum out:", " ", _jsxs("span", { className: "font-mono", children: [formatBigint(swap.summary.minimumOut, 6, 3), " USDC"] })] }), swap.summary.txHash ? (_jsxs("p", { className: "mt-2 break-all font-mono text-[0.65rem] text-neutral-400", children: ["Tx: ", swap.summary.txHash] })) : null] })) : null] })] })] }) }));
}
