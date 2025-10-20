import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Background } from "./components/Background";
import { SwapInterface } from "./components/SwapInterface";
import { TopNav } from "./components/TopNav";
function App() {
    return (_jsxs("div", { className: "relative min-h-screen overflow-hidden", children: [_jsx(Background, {}), _jsxs("div", { className: "relative z-10 flex min-h-screen flex-col", children: [_jsx(TopNav, {}), _jsx("main", { id: "swap", className: "flex flex-1 items-center justify-center px-4 py-12", children: _jsx(SwapInterface, {}) })] })] }));
}
export default App;
