import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";
// Load unified root .env only
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function normalizePk(): string[] {
  const raw = process.env.PRIVATE_KEY || process.env.HYPER_TRADER_PRIVATE_KEY || "";
  if (!raw) return [];
  // strip quotes/spaces
  let t = raw.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (!t.startsWith("0x")) t = "0x" + t;
  if (/^0x[0-9a-fA-F]{64}$/.test(t)) return [t];
  // Fallback: ignore invalid key to prevent config-time crashes
  console.warn("[hardhat] Invalid PRIVATE_KEY format; expected 0x-prefixed 64-hex. Ignoring for safety.");
  return [];
}
import "solidity-coverage";
import "./tasks/vault";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: process.env.RPC_URL || "",
      accounts: normalizePk(),
      chainId: 84532,
    },
    arbitrumSepolia: {
      url: process.env.RPC_URL || "",
      accounts: normalizePk(),
      chainId: 421614,
    },
    hyperTestnet: {
      url: process.env.HYPER_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm",
      accounts: normalizePk(),
      chainId: 998,
    },
  },
};

export default config;
