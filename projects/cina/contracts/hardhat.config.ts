import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { ethers } from "ethers";
import "./tasks/mock-owner";

dotenv.config();

const testAccounts = process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];
const mainnetAccounts = process.env.PRIVATE_KEY_MAINNET !== undefined && process.env.PRIVATE_KEY_MAINNET.length === 66 ? [process.env.PRIVATE_KEY_MAINNET] : [];
const hermezAccounts = process.env.PRIVATE_KEY_HERMEZ !== undefined && process.env.PRIVATE_KEY_HERMEZ.length === 66 ? [process.env.PRIVATE_KEY_HERMEZ] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    ],
    overrides: {
      "contracts/core/PoolManager.sol": {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          evmVersion: "cancun",
        },
      },
    },
  },
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://rpc.ankr.com/eth",
      chainId: 1,
      accounts: mainnetAccounts,
      ignition: {
        maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei"),
        maxFeePerGasLimit: ethers.parseUnits("100", "gwei"),
      },
    },
    hermez: {
      url: process.env.HERMEZ_RPC_URL || "https://zkevm-rpc.com",
      chainId: 1101,
      accounts: hermezAccounts,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc2.sepolia.org",
      chainId: 11155111,
      accounts: testAccounts,
      gasPrice: 3000000000, // 3gwei 进一步提高
    },
    arbitrum_sepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: testAccounts,
    },
    phalcon: {
      url: `https://rpc.phalcon.blocksec.com/${process.env.PHALCON_RPC_ID || ""}`,
      chainId: parseInt(process.env.PHALCON_CHAIN_ID || "1"),
      accounts: testAccounts,
    },
    tenderly: {
      url: `https://virtual.mainnet.rpc.tenderly.co/${process.env.TENDERLY_ETHEREUM_RPC_ID || ""}`,
      chainId: parseInt(process.env.TENDERLY_ETHEREUM_CHAIN_ID || "1"),
      accounts: testAccounts,
      ignition: {
        maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei"),
      },
    },
    fork: {
      url: process.env.FORK_RPC_URL || "",
      chainId: parseInt(process.env.FORK_CHAIN_ID || "31337"),
      accounts: testAccounts,
      gasPrice: 3000000000,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: testAccounts,
    },
  },
  typechain: {
    outDir: "./src/@types",
    target: "ethers-v6",
  },
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 3,
    disableFeeBumping: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      arbitrum_sepolia: process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      hermez: process.env.POLYGON_SCAN_API_KEY || "",
      phalcon: process.env.PHALCON_FORK_ACCESS_KEY || "",
      tenderly: process.env.TENDERLY_ACCESS_TOKEN || "",
    },
    customChains: [
      {
        network: "arbitrum_sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
      {
        network: "hermez",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com",
        },
      },
      {
        network: "phalcon",
        chainId: parseInt(process.env.PHALCON_CHAIN_ID || "1"),
        urls: {
          apiURL: `https://api.phalcon.xyz/api/${process.env.PHALCON_RPC_ID || ""}`,
          browserURL: `https://scan.phalcon.xyz/${process.env.PHALCON_FORK_ID || ""}`,
        },
      },
      {
        network: "tenderly",
        chainId: parseInt(process.env.TENDERLY_ETHEREUM_CHAIN_ID || "1"),
        urls: {
          apiURL: `https://virtual.mainnet.rpc.tenderly.co/${process.env.TENDERLY_ETHEREUM_RPC_ID || ""}/verify/etherscan`,
          browserURL: `https://dashboard.tenderly.co/${process.env.TENDERLY_USERNAME}/${process.env.TENDERLY_PROJECT}/testnet/${process.env.TENDERLY_ETHEREUM_TESTNET_ID}/contract/virtual/`,
        },
      },
    ],
  },
  paths: {
    artifacts: "./artifacts-hardhat",
    cache: "./cache-hardhat",
    sources: "./contracts",
    tests: "./test",
  },
  sourcify: {
    enabled: false,
  },
  mocha: {
    timeout: 400000,
  },
};

export default config;
