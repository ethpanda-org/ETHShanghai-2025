import { ethers } from "hardhat";

async function main() {
  const TradeBook = await ethers.getContractFactory("TradeBook");
  const tradeBook = await TradeBook.deploy();

  await tradeBook.waitForDeployment();

  const address = await tradeBook.getAddress();
  console.log(`TradeBook deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
