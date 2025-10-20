require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Hardhat本地网络
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
    },
    // 本地私链
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
    // Holesky测试网
    holesky: {
      url: process.env.WEB3_PROVIDER_URL || "https://ethereum-holesky-rpc.publicnode.com",
      chainId: 17000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : {
        mnemonic: "test test test test test test test test test test test junk",
      },
      gas: 6000000,
      gasPrice: 20000000000, // 20 gwei
    },

  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  // 合约验证配置
  etherscan: {
    apiKey: {
      holesky: process.env.ETHEREUM_API_KEY || "your_etherscan_api_key_here",
    },
  },
  // Gas报告配置
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};