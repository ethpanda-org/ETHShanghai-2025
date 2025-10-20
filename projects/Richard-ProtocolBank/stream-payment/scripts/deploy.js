import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying StreamPayment contract...");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // 获取账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // 部署合约
  const StreamPayment = await hre.ethers.getContractFactory("StreamPayment");
  const streamPayment = await StreamPayment.deploy();
  
  await streamPayment.waitForDeployment();
  const contractAddress = await streamPayment.getAddress();

  console.log("✅ StreamPayment deployed to:", contractAddress);
  console.log("\n📋 Contract deployment info:");
  console.log("   Network:", hre.network.name);
  console.log("   Contract Address:", contractAddress);
  console.log("   Deployer:", deployer.address);
  console.log("   Block:", await hre.ethers.provider.getBlockNumber());
  
  // 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };
  
  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n💾 Deployment info saved to deployment.json");
  console.log("\n🎉 Deployment completed!");
  console.log("\n📝 Next steps:");
  console.log("1. Update VITE_STREAM_PAYMENT_CONTRACT in .env:");
  console.log(`   VITE_STREAM_PAYMENT_CONTRACT=${contractAddress}`);
  console.log("\n2. View on Sepolia Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

