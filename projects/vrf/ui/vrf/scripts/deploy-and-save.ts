import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying TradeBook contract...");
  
  const TradeBook = await ethers.getContractFactory("TradeBook");
  const tradeBook = await TradeBook.deploy();

  await tradeBook.waitForDeployment();

  const address = await tradeBook.getAddress();
  console.log(`\n✅ TradeBook deployed to: ${address}\n`);

  // Save the contract address to a file
  const deploymentInfo = {
    address: address,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId)
  };

  const outputPath = path.join(__dirname, "..", "contract-address.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`📝 Contract address saved to: contract-address.json`);
  console.log(`\n📋 Copy this address to use in the UI: ${address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
