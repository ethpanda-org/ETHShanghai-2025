require("dotenv").config();

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = {
  stakeToken: {
    name: process.env.STAKE_TOKEN_NAME || "Voting Stake Test Token",
    symbol: process.env.STAKE_TOKEN_SYMBOL || "VSTT",
    initialSupply: process.env.STAKE_TOKEN_SUPPLY || "1000000000", // 单位：代币基础单位（默认 18 位小数前的人类可读数）
    deployedAddress: process.env.STAKE_TOKEN_ADDRESS || ""
  },
  votingSystem: {
    stakeRequirement: process.env.STAKE_REQUIREMENT || "100", // 单位：人类可读数量
    stakeTokenAddress: process.env.STAKE_TOKEN_ADDRESS || ZERO_ADDRESS,
    gateNftAddress: process.env.GATE_NFT_ADDRESS || ZERO_ADDRESS,
    deployedAddress: process.env.VOTING_SYSTEM_ADDRESS || ""
  },
  proposal: {
    metadataHash: process.env.PROPOSAL_METADATA_HASH || "ipfs://REPLACE_METADATA_HASH",
    privilegedOnly:
      process.env.PROPOSAL_PRIVILEGED_ONLY === "true" ||
      process.env.PROPOSAL_PRIVILEGED_ONLY === "1"
  }
};
