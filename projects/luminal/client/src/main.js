import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiConfig } from "wagmi";
import { RainbowKitProvider, midnightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import "./polyfills";
import "./index.css";
import App from "./App";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { chains, wagmiConfig } from "./wallet";
const Disclaimer = ({ Text, Link }) => (_jsxs(Text, { children: ["Zero-knowledge swap prototype. Review docs before committing funds.", " ", _jsx(Link, { href: "https://github.com/luminial", children: "Learn more" })] }));
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(WagmiConfig, { config: wagmiConfig, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(RainbowKitProvider, { theme: midnightTheme(), chains: chains, coolMode: true, appInfo: {
                    appName: "Luminial AMM",
                    disclaimer: Disclaimer
                }, children: _jsx(App, {}) }) }) }) }));
