import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const OPTIONS = [
    { label: "0.1%", value: 10 },
    { label: "0.5%", value: 50 },
    { label: "1%", value: 100 }
];
export function SlippageControl({ value, onChange }) {
    return (_jsxs("div", { className: "flex items-center justify-between rounded-2xl bg-surfaceMuted px-4 py-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-neutral-200", children: "Slippage tolerance" }), _jsx("p", { className: "text-xs text-neutral-500", children: "Protection against pool front-running." })] }), _jsx("div", { className: "flex items-center gap-2", children: OPTIONS.map((option) => (_jsx("button", { type: "button", onClick: () => onChange(option.value), className: `rounded-full px-3 py-1 text-xs ${value === option.value
                        ? "bg-primary/90 text-white shadow-focus"
                        : "bg-surfaceHighlight text-neutral-300 hover:bg-surface"} transition`, children: option.label }, option.value))) })] }));
}
