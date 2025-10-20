import 'dotenv/config';
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import '@openzeppelin/hardhat-upgrades';

export function compileSetting(
  version: string,
  runs: number,
  bytecodeHash: "ipfs" | "bzzr1" | "none" = "none"
) {
  const settings: any = {
    optimizer: {
      enabled: true,
      runs,
    },
    viaIR: true, // 开启 IR
  };

  if (parseFloat(version) >= 0.7 && bytecodeHash) {
    settings.metadata = { bytecodeHash };
  }

  return {
    version,
    settings,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      compileSetting("0.8.24", 200, "none"),
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [
        `${process.env.TEST_PRIVATE_KEY}`,                    // Admin/Deployer
      ],
    },
  },
  sourcify: {
    enabled: false,
  },
  etherscan: {
    apiKey: {
      sepolia: `${process.env.ETHERSCAN_API_KEY}`,
    },
  },
};

export default config;
