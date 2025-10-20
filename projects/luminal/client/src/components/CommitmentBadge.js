import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const truncate = (value) => `${value.slice(0, 6)}…${value.slice(value.length - 4)}`;
export function CommitmentBadge({ commitment, label = "Current commitment" }) {
    return (_jsxs("div", { className: "rounded-2xl bg-surfaceMuted px-4 py-3 text-xs text-neutral-400", children: [_jsx("p", { className: "mb-1 uppercase tracking-wide text-[0.6rem] text-neutral-600", children: label }), _jsx("p", { className: "font-mono text-sm text-neutral-200", children: commitment ? truncate(commitment) : "—" })] }));
}
