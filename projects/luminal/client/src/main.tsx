import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiConfig } from "wagmi";
import {
  RainbowKitProvider,
  midnightTheme,
  DisclaimerComponent
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import "./polyfills";
import "./index.css";
import App from "./App";
import { queryClient } from "./queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { chains, wagmiConfig } from "./wallet";

const Disclaimer: DisclaimerComponent = ({ Text, Link }) => (
  <Text>
    Zero-knowledge swap prototype. Review docs before committing funds.{" "}
    <Link href="https://github.com/luminal">Learn more</Link>
  </Text>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={midnightTheme()} chains={chains} coolMode
          appInfo={{
            appName: "Luminal Swap",
            disclaimer: Disclaimer
          }}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>
);
