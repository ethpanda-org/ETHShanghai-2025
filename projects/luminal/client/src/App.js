import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Background } from "./components/Background";
import { SwapInterface } from "./components/SwapInterface";
import { TopNav } from "./components/TopNav";
import { WithdrawInterface } from "./components/WithdrawInterface";
function App() {
    return (_jsxs("div", { className: "relative min-h-screen overflow-hidden", children: [_jsx(Background, {}), _jsxs("div", { className: "relative z-10 flex min-h-screen flex-col", children: [_jsx(TopNav, {}), _jsx("main", { className: "flex flex-1 items-center justify-center px-4 py-12", children: _jsxs("div", { className: "flex w-full max-w-5xl flex-col items-center gap-10", children: [_jsx(SwapInterface, {}), _jsx(WithdrawInterface, {})] }) })] })] }));
}
export default App;
