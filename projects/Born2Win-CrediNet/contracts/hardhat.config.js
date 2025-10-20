require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

const { SEPOLIA_RPC_URL, BASE_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY, BASESCAN_API_KEY } = process.env;

const networks = { hardhat: {} };
if (SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY) {
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    accounts: [DEPLOYER_PRIVATE_KEY],
  };
}
if (BASE_SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY) {
  networks.base_sepolia = {
    url: BASE_SEPOLIA_RPC_URL,
    accounts: [DEPLOYER_PRIVATE_KEY],
    chainId: 84532,
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks,
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "",
      base_sepolia: BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};


