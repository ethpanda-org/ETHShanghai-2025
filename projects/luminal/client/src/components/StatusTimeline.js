import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "clsx";
const STEP_ORDER = [
    "calculating",
    "proving",
    "awaitingSignature",
    "pending",
    "confirmed"
];
const STEPS = [
    {
        phase: "calculating",
        label: "Compute state delta",
        description: "Apply AMM formula off-chain"
    },
    {
        phase: "proving",
        label: "Generate zkSNARK",
        description: "Poseidon commitment & Groth16 proof"
    },
    {
        phase: "awaitingSignature",
        label: "Wallet confirmation",
        description: "Sign & submit swap transaction"
    },
    {
        phase: "pending",
        label: "Proof verification",
        description: "Groth16 verifier checks calldata"
    },
    {
        phase: "confirmed",
        label: "State updated",
        description: "Vault commitment replaced on-chain"
    }
];
const getStepIndex = (phase) => STEP_ORDER.indexOf(phase);
const resolveState = (currentPhase, stepPhase) => {
    if (currentPhase === "idle")
        return "upcoming";
    if (currentPhase === "error") {
        return getStepIndex(stepPhase) <= getStepIndex("pending")
            ? "error"
            : "upcoming";
    }
    const currentIndex = getStepIndex(currentPhase);
    const stepIndex = getStepIndex(stepPhase);
    if (currentIndex === -1 || stepIndex === -1)
        return "upcoming";
    if (currentIndex > stepIndex)
        return "completed";
    if (currentIndex === stepIndex)
        return "active";
    return "upcoming";
};
export function StatusTimeline({ phase }) {
    return (_jsx("ol", { className: "space-y-4", children: STEPS.map((step) => {
            const state = resolveState(phase, step.phase);
            return (_jsxs("li", { className: "flex items-start gap-3 rounded-2xl bg-surfaceMuted px-4 py-3", children: [_jsx("span", { className: clsx("mt-1 h-3 w-3 rounded-full", state === "completed" && "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]", state === "active" && "bg-primary shadow-[0_0_0_4px_rgba(255,0,122,0.15)] animate-pulse", state === "upcoming" && "bg-neutral-700", state === "error" && "bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.25)]") }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-neutral-100", children: step.label }), _jsx("p", { className: "text-xs text-neutral-500", children: step.description })] })] }, step.phase));
        }) }));
}
