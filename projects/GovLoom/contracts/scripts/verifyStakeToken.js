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
    process.env.STAKE_TOKEN_ADDRESS ||
    params.stakeToken.deployedAddress ||
    extractAddressFromArgs();

  if (!address || address === "") {
    throw new Error(
      "缺少质押代币合约地址，请在 .env 设置 STAKE_TOKEN_ADDRESS 或通过命令参数传入，例如: npm run verify:stake -- --address 0x..."
    );
  }

  const initialSupply = hre.ethers.parseUnits(params.stakeToken.initialSupply, 18);

  await hre.run("verify:verify", {
    address,
    constructorArguments: [params.stakeToken.name, params.stakeToken.symbol, initialSupply],
    contract: "src/VotingStakeToken.sol:VotingStakeToken"
  });

  console.log(`VotingStakeToken verify submitted for ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
