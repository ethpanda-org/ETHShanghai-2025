const hre = require("hardhat");

const params = require("./params");

const STAKE_REQUIREMENT = hre.ethers.parseUnits(params.votingSystem.stakeRequirement, 18);
const STAKE_TOKEN_ADDRESS = params.votingSystem.stakeTokenAddress;
const GATE_NFT_ADDRESS = params.votingSystem.gateNftAddress;
const CONFIRMATIONS_TO_WAIT = parseInt(process.env.BLOCK_CONFIRMATIONS || "5", 10);

async function main() {
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(
    STAKE_REQUIREMENT,
    STAKE_TOKEN_ADDRESS,
    GATE_NFT_ADDRESS
  );

  await votingSystem.waitForDeployment();
  if (CONFIRMATIONS_TO_WAIT > 0) {
    const deploymentTx = votingSystem.deploymentTransaction();
    if (deploymentTx) {
      console.log(`Waiting for ${CONFIRMATIONS_TO_WAIT} block confirmations...`);
      await deploymentTx.wait(CONFIRMATIONS_TO_WAIT);
    }
  }
  const deployedAddress = await votingSystem.getAddress();
  console.log(`VotingSystem deployed to ${deployedAddress}`);
  console.log(
    `保存此地址以便在 .env 中设置 VOTING_SYSTEM_ADDRESS 或用于后续验证: ${deployedAddress}`
  );

  if (process.env.BSCSCAN_API_KEY) {
    console.log("Attempting contract verification on BscScan Testnet...");
    try {
      await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [
          STAKE_REQUIREMENT,
          STAKE_TOKEN_ADDRESS,
          GATE_NFT_ADDRESS
        ],
        contract: "src/VotingSystem.sol:VotingSystem"
      });
      console.log("VotingSystem verification submitted.");
    } catch (verificationError) {
      console.warn(
        "Verification attempt failed. You can retry manually with `npm run verify:voting` after replacing placeholders.",
        verificationError
      );
    }
  } else {
    console.log(
      "Skipping verification - set BSCSCAN_API_KEY in .env 并运行 `npm run verify:voting` 手动验证。"
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
