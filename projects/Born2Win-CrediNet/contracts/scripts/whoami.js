const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const bal = await ethers.provider.getBalance(addr);
  console.log("Deployer:", addr);
  console.log("Balance(ETH):", Number(ethers.formatEther(bal)));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


