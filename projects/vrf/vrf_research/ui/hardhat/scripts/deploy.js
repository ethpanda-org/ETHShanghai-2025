const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying DarkPool contract...");

  const DarkPool = await ethers.getContractFactory("DarkPool");
  const darkPool = await DarkPool.deploy();

  await darkPool.deployed();
  const contractAddress = darkPool.address;

  console.log("DarkPool deployed to:", contractAddress);

  // Save contract address and ABI for frontend
  const contractsDir = "../dark-pool-frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ DarkPool: contractAddress }, undefined, 2)
  );

  const DarkPoolArtifact = artifacts.readArtifactSync("DarkPool");

  fs.writeFileSync(
    contractsDir + "/DarkPool.json",
    JSON.stringify(DarkPoolArtifact, null, 2)
  );

  console.log("Contract artifacts saved to frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });