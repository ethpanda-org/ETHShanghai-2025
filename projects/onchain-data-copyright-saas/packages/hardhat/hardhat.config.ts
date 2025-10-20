import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { PRIVATE_KEY = "", RPC_URL = "https://rpc.ankr.com/eth_sepolia", ETHERSCAN_API_KEY = "" } = process.env;

const config: HardhatUserConfig = {
  solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    sepolia: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    holesky: {
      url: process.env.RPC_URL || "https://ethereum-holesky.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 17000,
    },
  },
  etherscan: {
    apiKey: {
      holesky: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  namedAccounts: { deployer: { default: 0 }, user: { default: 1 } },
};
export default config;