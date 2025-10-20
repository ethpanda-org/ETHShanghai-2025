const { ethers } = require("hardhat");

async function main() {
  const name = process.env.SBT_NAME || "CrediNet SBT";
  const symbol = process.env.SBT_SYMBOL || "CNSBT";
  const baseURI = process.env.SBT_BASE_URI || "";

  const CrediNetSBT = await ethers.getContractFactory("CrediNetSBT");
  const contract = await CrediNetSBT.deploy(name, symbol, baseURI);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CrediNetSBT deployed:", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


