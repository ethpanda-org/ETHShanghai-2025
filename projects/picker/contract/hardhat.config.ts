import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    customize: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  // chainDescriptors: {
  //   11155111: {
  //     name: "Sepolia",
  //     chainType: "l1",
  //     blockExplorers: {
  //       etherscan: {
  //         name: "Sepolia Explorer",
  //         url: "https://sepolia.etherscan.io/",
  //         apiUrl: "https://api-sepolia.etherscan.io/api",
  //       },
  //     },
  //   },
  // },
  verify:{
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    }
  }
};

export default config;
