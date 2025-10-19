require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config({ path: "./config/.env" });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,  // Enable IR compiler for deep stack issues
    },
  },
  networks: {
    // 本地开发网络
    hardhat: {
      chainId: 1337
    },
    
    // Optimism Sepolia 测试网
    "op-sepolia": {
      url: process.env.OPTIMISM_SEPOLIA_RPC || "https://optimism-sepolia.publicnode.com",
      accounts: [PRIVATE_KEY],
      chainId: 11155420,
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000 // 60秒超时
    },
    
    // Base Sepolia 测试网
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532
    },
    
    // Optimism 主网（谨慎使用）
    "optimism": {
      url: process.env.OPTIMISM_MAINNET_RPC || "https://mainnet.optimism.io",
      accounts: [PRIVATE_KEY],
      chainId: 10,
      gasPrice: 1000000000 // 1 gwei
    },
    
    // 原有的 Sepolia 配置
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  
  etherscan: {
    apiKey: {
      optimisticEthereum: process.env.OPTIMISM_ETHERSCAN_KEY || "",
      optimisticSepolia: process.env.OPTIMISM_ETHERSCAN_KEY || "",
      base: process.env.BASE_ETHERSCAN_KEY || "",
      baseSepolia: process.env.BASE_ETHERSCAN_KEY || ""
    }
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  
  mocha: {
    timeout: 40000
  }
};