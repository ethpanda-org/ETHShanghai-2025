const hre = require("hardhat");

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
  const fs = require("fs");
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
  
  // 等待几个区块确认后验证
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await streamPayment.deploymentTransaction().wait(5);
    
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

