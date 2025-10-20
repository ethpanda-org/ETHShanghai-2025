const hre = require("hardhat");
const params = require("./params");

function extractAddressFromArgs() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--address" && argv[i + 1]) {
      return argv[i + 1];
    }
    if (current.startsWith("0x") && current.length === 42) {
      return current;
    }
  }
  return "";
}

async function main() {
  const address =
    process.env.VOTING_SYSTEM_ADDRESS || params.votingSystem.deployedAddress || extractAddressFromArgs();

  if (!address || address === "") {
    throw new Error(
      "缺少 VotingSystem 合约地址，请在 .env 设置 VOTING_SYSTEM_ADDRESS 或通过命令参数传入，例如: npm run verify:voting -- --address 0x..."
    );
  }

  const stakeRequirementWei = hre.ethers.parseUnits(params.votingSystem.stakeRequirement, 18);

  await hre.run("verify:verify", {
    address,
    constructorArguments: [
      stakeRequirementWei,
      params.votingSystem.stakeTokenAddress,
      params.votingSystem.gateNftAddress
    ],
    contract: "src/VotingSystem.sol:VotingSystem"
  });

  console.log(`VotingSystem verify submitted for ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
