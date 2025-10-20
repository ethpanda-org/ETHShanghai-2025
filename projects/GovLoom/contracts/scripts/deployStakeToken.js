const hre = require("hardhat");

const params = require("./params");

const TOKEN_NAME = params.stakeToken.name;
const TOKEN_SYMBOL = params.stakeToken.symbol;
const INITIAL_SUPPLY = hre.ethers.parseUnits(params.stakeToken.initialSupply, 18);
const CONFIRMATIONS_TO_WAIT = parseInt(process.env.BLOCK_CONFIRMATIONS || "5", 10);

async function main() {
  const StakeToken = await hre.ethers.getContractFactory("VotingStakeToken");
  const stakeToken = await StakeToken.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    INITIAL_SUPPLY
  );

  await stakeToken.waitForDeployment();
  if (CONFIRMATIONS_TO_WAIT > 0) {
    const deploymentTx = stakeToken.deploymentTransaction();
    if (deploymentTx) {
      console.log(`Waiting for ${CONFIRMATIONS_TO_WAIT} block confirmations...`);
      await deploymentTx.wait(CONFIRMATIONS_TO_WAIT);
    }
  }
  const deployedAddress = await stakeToken.getAddress();
  console.log(`VotingStakeToken deployed to ${deployedAddress}`);
  console.log(
    `保存此地址以便后续在 .env 中设置 STAKE_TOKEN_ADDRESS 或直接用于验证: ${deployedAddress}`
  );

  if (process.env.BSCSCAN_API_KEY) {
    console.log("Attempting contract verification on BscScan Testnet...");
    try {
      await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [
          TOKEN_NAME,
          TOKEN_SYMBOL,
          INITIAL_SUPPLY
        ],
        contract: "src/VotingStakeToken.sol:VotingStakeToken"
      });
      console.log("VotingStakeToken verification submitted.");
    } catch (verificationError) {
      console.warn(
        "Verification attempt failed. You can retry manually with `npm run verify:stake` after replacing placeholders.",
        verificationError
      );
    }
  } else {
    console.log(
      "Skipping verification - set BSCSCAN_API_KEY in .env 并运行 `npm run verify:stake` 手动验证。"
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
