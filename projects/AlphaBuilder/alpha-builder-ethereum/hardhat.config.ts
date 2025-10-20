import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env" });

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ZERO_DEV_RPC = process.env.ZERODEV_RPC_URL;

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    zerodev: {
      url: ZERO_DEV_RPC ?? "",
      accounts,
      chainId: process.env.ZERODEV_CHAIN_ID
        ? Number.parseInt(process.env.ZERODEV_CHAIN_ID, 10)
        : undefined
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
