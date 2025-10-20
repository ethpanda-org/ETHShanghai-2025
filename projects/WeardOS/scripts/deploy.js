const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("开始部署智能合约到私链...");


  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  console.log("\n部署 RiskAnalyzer 合约...");
  const RiskAnalyzer = await ethers.getContractFactory("RiskAnalyzer");
  const riskAnalyzer = await RiskAnalyzer.deploy();
  await riskAnalyzer.waitForDeployment();
  const riskAnalyzerAddress = await riskAnalyzer.getAddress();
  console.log("RiskAnalyzer 部署地址:", riskAnalyzerAddress);

 
  console.log("\n部署 AIRiskController 合约...");
  const AIRiskController = await ethers.getContractFactory("AIRiskController");
  const aiRiskController = await AIRiskController.deploy();
  await aiRiskController.waitForDeployment();
  const aiRiskControllerAddress = await aiRiskController.getAddress();
  console.log("AIRiskController 部署地址:", aiRiskControllerAddress);


  console.log("\n验证合约部署...");
  try {

    const testAddress = "YOUR_TEST_ADDRESS_HERE";
    await riskAnalyzer.updateContractRisk(testAddress, 75, "测试合约");
    console.log("✅ RiskAnalyzer 合约功能正常");

  
    const criticalThreshold = await aiRiskController.CRITICAL_RISK_THRESHOLD();
    console.log("✅ AIRiskController 合约功能正常，临界风险阈值:", criticalThreshold.toString());
  } catch (error) {
    console.error("❌ 合约验证失败:", error.message);
  }

  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      RiskAnalyzer: {
        address: riskAnalyzerAddress,
        transactionHash: riskAnalyzer.deploymentTransaction()?.hash
      },
      AIRiskController: {
        address: aiRiskControllerAddress,
        transactionHash: aiRiskController.deploymentTransaction()?.hash
      }
    }
  };

  // 创建部署信息文件
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n部署信息已保存到:", deploymentFile);

  // 更新后端配置文件
  const backendEnvPath = path.join(__dirname, "../backend/.env");
  if (fs.existsSync(backendEnvPath)) {
    let envContent = fs.readFileSync(backendEnvPath, "utf8");
    
    // 更新或添加合约地址配置
    const contractConfigs = [
      `RISK_ANALYZER_CONTRACT_ADDRESS=${riskAnalyzerAddress}`,
      `AI_RISK_CONTROLLER_CONTRACT_ADDRESS=${aiRiskControllerAddress}`,
      `CONTRACT_DEPLOYMENT_BLOCK=${await ethers.provider.getBlockNumber()}`
    ];

    contractConfigs.forEach(config => {
      const [key] = config.split("=");
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, config);
      } else {
        envContent += `\n${config}`;
      }
    });

    fs.writeFileSync(backendEnvPath, envContent);
    console.log("✅ 后端配置文件已更新");
  }

  console.log("\n🎉 智能合约部署完成!");
  console.log("📋 部署摘要:");
  console.log(`   RiskAnalyzer: ${riskAnalyzerAddress}`);
  console.log(`   AIRiskController: ${aiRiskControllerAddress}`);
  console.log(`   网络: ${deploymentInfo.network.name} (Chain ID: ${deploymentInfo.network.chainId})`);
}

// 错误处理
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });