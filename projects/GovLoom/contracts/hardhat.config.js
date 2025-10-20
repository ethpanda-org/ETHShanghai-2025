require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

const { PRIVATE_KEY, BSC_TESTNET_RPC_URL, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bsctestnet: {
      url: BSC_TESTNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  // etherscan: {
  //   apiKey: {
  //     bscTestnet: BSCSCAN_API_KEY || ""
  //   }
  // },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // ✅ 新格式
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  sourcify: {
  enabled: true
}
};
