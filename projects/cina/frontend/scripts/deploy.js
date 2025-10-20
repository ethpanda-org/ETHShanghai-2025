const hre = require("hardhat");

async function main() {
  console.log("🚀 开始部署本地测试合约...");
  
  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // 部署MockDiamond合约
  console.log("\n📦 部署MockDiamond合约...");
  const MockDiamond = await hre.ethers.getContractFactory("MockDiamond");
  const mockDiamond = await MockDiamond.deploy();
  await mockDiamond.waitForDeployment();
  const diamondAddress = await mockDiamond.getAddress();
  console.log("✅ MockDiamond部署成功:", diamondAddress);
  
  // 部署测试代币
  console.log("\n🪙 部署测试代币...");
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  
  const wrmb = await MockToken.deploy("WRMB Token", "WRMB");
  await wrmb.waitForDeployment();
  const wrmbAddress = await wrmb.getAddress();
  console.log("✅ WRMB代币部署成功:", wrmbAddress);
  
  const wbtc = await MockToken.deploy("WBTC Token", "WBTC");
  await wbtc.waitForDeployment();
  const wbtcAddress = await wbtc.getAddress();
  console.log("✅ WBTC代币部署成功:", wbtcAddress);
  
  const fxusd = await MockToken.deploy("FXUSD Token", "FXUSD");
  await fxusd.waitForDeployment();
  const fxusdAddress = await fxusd.getAddress();
  console.log("✅ FXUSD代币部署成功:", fxusdAddress);
  
  const usdc = await MockToken.deploy("USDC Token", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC代币部署成功:", usdcAddress);
  
  // 给部署者一些测试代币
  console.log("\n💰 铸造测试代币...");
  const mintAmount = hre.ethers.parseEther("10000"); // 10000个代币
  
  await wrmb.mint(deployer.address, mintAmount);
  await wbtc.mint(deployer.address, mintAmount);
  await fxusd.mint(deployer.address, mintAmount);
  await usdc.mint(deployer.address, mintAmount);
  
  console.log("✅ 测试代币铸造完成");
  
  // 输出配置信息
  console.log("\n📋 本地测试配置:");
  console.log("==================");
  console.log("RPC URL: http://127.0.0.1:8545");
  console.log("Chain ID: 1337");
  console.log("Diamond合约:", diamondAddress);
  console.log("WRMB代币:", wrmbAddress);
  console.log("WBTC代币:", wbtcAddress);
  console.log("FXUSD代币:", fxusdAddress);
  console.log("USDC代币:", usdcAddress);
  
  console.log("\n🔑 测试账户:");
  console.log("部署者地址:", deployer.address);
  console.log("私钥:", deployer.privateKey);
  
  console.log("\n✨ 部署完成！现在可以启动前端应用进行测试。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
