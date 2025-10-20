import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import * as dotenv from "dotenv";

// 加载 .env 文件
dotenv.config();

// 环境变量获取函数（可选，如果未设置则返回空字符串）
function getEnvVar(name: string): string {
  return process.env[name] || "";
}

// 添加私钥验证函数
function getValidPrivateKey(name: string): string[] {
  const key = process.env[name];
  if (!key || key.length !== 64) {
    return []; // 返回空数组，不添加账户
  }
  return [key];
}
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,  // 启用 IR 编译器解决 Stack too deep
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Ethereum Mainnet
    // mainnet: {
    //   url: getEnvVar("MAINNET_RPC_URL") || "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    //   accounts: getValidPrivateKey("MAINNET_PRIVATE_KEY") ? [getEnvVar("MAINNET_PRIVATE_KEY")] : [],
    //   chainId: 1,
    //   gasPrice: "auto",
    // },
    // Ethereum Sepolia Testnet
    sepolia: {
      url: getEnvVar("SEPOLIA_RPC_URL") || "https://sepolia.gateway.tenderly.co",
      accounts: getEnvVar("SEPOLIA_PRIVATE_KEY") ? [getEnvVar("SEPOLIA_PRIVATE_KEY")] : [],
      chainId: 11155111,
      gasPrice: "auto",
    },
    // // Ethereum Goerli Testnet
    // goerli: {
    //   url: getEnvVar("GOERLI_RPC_URL") || "https://goerli.gateway.tenderly.co",
    //   accounts: getEnvVar("GOERLI_PRIVATE_KEY") ? [getEnvVar("GOERLI_PRIVATE_KEY")] : [],
    //   chainId: 5,
    //   gasPrice: "auto",
    // },
    // // Polygon Mainnet
    // polygon: {
    //   url: getEnvVar("POLYGON_RPC_URL") || "https://polygon-rpc.com",
    //   accounts: getEnvVar("POLYGON_PRIVATE_KEY") ? [getEnvVar("POLYGON_PRIVATE_KEY")] : [],
    //   chainId: 137,
    //   gasPrice: "auto",
    // },
    // // Polygon Mumbai Testnet
    // mumbai: {
    //   url: getEnvVar("MUMBAI_RPC_URL") || "https://rpc-mumbai.maticvigil.com",
    //   accounts: getEnvVar("MUMBAI_PRIVATE_KEY") ? [getEnvVar("MUMBAI_PRIVATE_KEY")] : [],
    //   chainId: 80001,
    //   gasPrice: "auto",
    // },
    // // Binance Smart Chain Mainnet
    // bsc: {
    //   url: getEnvVar("BSC_RPC_URL") || "https://bsc-dataseed.binance.org",
    //   accounts: getEnvVar("BSC_PRIVATE_KEY") ? [getEnvVar("BSC_PRIVATE_KEY")] : [],
    //   chainId: 56,
    //   gasPrice: "auto",
    // },
    // // Binance Smart Chain Testnet
    // bscTestnet: {
    //   url: getEnvVar("BSC_TESTNET_RPC_URL") || "https://data-seed-prebsc-1-s1.binance.org:8545",
    //   accounts: getEnvVar("BSC_TESTNET_PRIVATE_KEY") ? [getEnvVar("BSC_TESTNET_PRIVATE_KEY")] : [],
    //   chainId: 97,
    //   gasPrice: "auto",
    // },
    // // Arbitrum One
    // arbitrum: {
    //   url: getEnvVar("ARBITRUM_RPC_URL") || "https://arb1.arbitrum.io/rpc",
    //   accounts: getEnvVar("ARBITRUM_PRIVATE_KEY") ? [getEnvVar("ARBITRUM_PRIVATE_KEY")] : [],
    //   chainId: 42161,
    //   gasPrice: "auto",
    // },
    // // Arbitrum Goerli Testnet
    // arbitrumGoerli: {
    //   url: getEnvVar("ARBITRUM_GOERLI_RPC_URL") || "https://goerli-rollup.arbitrum.io/rpc",
    //   accounts: getEnvVar("ARBITRUM_GOERLI_PRIVATE_KEY") ? [getEnvVar("ARBITRUM_GOERLI_PRIVATE_KEY")] : [],
    //   chainId: 421613,
    //   gasPrice: "auto",
    // },
    // // Optimism Mainnet
    // optimism: {
    //   url: getEnvVar("OPTIMISM_RPC_URL") || "https://mainnet.optimism.io",
    //   accounts: getEnvVar("OPTIMISM_PRIVATE_KEY") ? [getEnvVar("OPTIMISM_PRIVATE_KEY")] : [],
    //   chainId: 10,
    //   gasPrice: "auto",
    // },
    // // Optimism Goerli Testnet
    // optimismGoerli: {
    //   url: getEnvVar("OPTIMISM_GOERLI_RPC_URL") || "https://goerli.optimism.io",
    //   accounts: getEnvVar("OPTIMISM_GOERLI_PRIVATE_KEY") ? [getEnvVar("OPTIMISM_GOERLI_PRIVATE_KEY")] : [],
    //   chainId: 420,
    //   gasPrice: "auto",
    // },
    // // Avalanche Mainnet
    // avalanche: {
    //   url: getEnvVar("AVALANCHE_RPC_URL") || "https://api.avax.network/ext/bc/C/rpc",
    //   accounts: getEnvVar("AVALANCHE_PRIVATE_KEY") ? [getEnvVar("AVALANCHE_PRIVATE_KEY")] : [],
    //   chainId: 43114,
    //   gasPrice: "auto",
    // },
    // // Avalanche Fuji Testnet
    // fuji: {
    //   url: getEnvVar("FUJI_RPC_URL") || "https://api.avax-test.network/ext/bc/C/rpc",
    //   accounts: getEnvVar("FUJI_PRIVATE_KEY") ? [getEnvVar("FUJI_PRIVATE_KEY")] : [],
    //   chainId: 43113,
    //   gasPrice: "auto",
    // },
    // // Fantom Mainnet
    // fantom: {
    //   url: getEnvVar("FANTOM_RPC_URL") || "https://rpc.ftm.tools",
    //   accounts: getEnvVar("FANTOM_PRIVATE_KEY") ? [getEnvVar("FANTOM_PRIVATE_KEY")] : [],
    //   chainId: 250,
    //   gasPrice: "auto",
    // },
    // Fantom Testnet
    // fantomTestnet: {
    //   url: getEnvVar("FANTOM_TESTNET_RPC_URL") || "https://rpc.testnet.fantom.network",
    //   accounts: getEnvVar("FANTOM_TESTNET_PRIVATE_KEY") ? [getEnvVar("FANTOM_TESTNET_PRIVATE_KEY")] : [],
    //   chainId: 4002,
    //   gasPrice: "auto",
    // },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  // etherscan: {
  //   apiKey: {
  //     mainnet: getEnvVar("ETHERSCAN_API_KEY"),
  //     sepolia: getEnvVar("ETHERSCAN_API_KEY"),
  //     goerli: getEnvVar("ETHERSCAN_API_KEY"),
  //     polygon: getEnvVar("POLYGONSCAN_API_KEY"),
  //     polygonMumbai: getEnvVar("POLYGONSCAN_API_KEY"),
  //     bsc: getEnvVar("BSCSCAN_API_KEY"),
  //     bscTestnet: getEnvVar("BSCSCAN_API_KEY"),
  //     arbitrumOne: getEnvVar("ARBISCAN_API_KEY"),
  //     arbitrumGoerli: getEnvVar("ARBISCAN_API_KEY"),
  //     optimisticEthereum: getEnvVar("OPTIMISTIC_ETHERSCAN_API_KEY"),
  //     optimisticGoerli: getEnvVar("OPTIMISTIC_ETHERSCAN_API_KEY"),
  //     avalanche: getEnvVar("SNOWTRACE_API_KEY"),
  //     avalancheFujiTestnet: getEnvVar("SNOWTRACE_API_KEY"),
  //     opera: getEnvVar("FTMSCAN_API_KEY"),
  //     ftmTestnet: getEnvVar("FTMSCAN_API_KEY"),
  //   },
  // },
};

export default config;