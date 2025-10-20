import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { PRIVATE_KEY = "", RPC_URL = "https://ethereum-holesky-rpc.publicnode.com", ETHERSCAN_API_KEY = "" } = process.env;

const config: HardhatUserConfig = {
  solidity: { 
    version: "0.8.20", 
    settings: { optimizer: { enabled: true, runs: 200 } } 
  },
  networks: {
    holesky: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 17000,
    },
  },
  etherscan: {
    apiKey: {
      holesky: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "holesky",
        chainId: 17000,
        urls: {
          apiURL: "https://api-holesky.etherscan.io/api",
          browserURL: "https://holesky.etherscan.io"
        }
      }
    ]
  },
};

export default config;

