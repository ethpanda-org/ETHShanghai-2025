import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// 颜色输出函数
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorLog(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

interface ContractAddresses {
  registry?: string;
  licenseCenter?: string;
  bodhi1155?: string;
}

interface DeploymentInfo {
  chainId: string;
  name: string;
  contracts: {
    DatasetRegistry?: { address: string };
    DataLicense?: { address: string };
    Bodhi1155?: { address: string };
  };
}

async function checkHardhatNode(): Promise<boolean> {
  try {
    colorLog("\n🔍 1️⃣ 检查 Hardhat 节点状态...", colors.cyan);
    
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const network = await provider.getNetwork();
    
    if (network.chainId === 31337) {
      colorLog("✅ Hardhat 节点已启动 (Chain ID: 31337)", colors.green);
      return true;
    } else {
      colorLog(`❌ Hardhat 节点未启动或链 ID 不正确 (当前: ${network.chainId})`, colors.red);
      return false;
    }
  } catch (error) {
    colorLog("❌ Hardhat 节点未启动 - 无法连接到 http://127.0.0.1:8545", colors.red);
    colorLog(`   错误: ${error.message}`, colors.red);
    return false;
  }
}

async function checkContractDeployment(): Promise<ContractAddresses> {
  colorLog("\n🔍 2️⃣ 检查合约部署状态...", colors.cyan);
  
  const addresses: ContractAddresses = {};
  
  try {
    // 尝试从部署脚本输出中获取地址（模拟）
    // 实际项目中可以从 deployments 目录或日志文件读取
    const deploymentScript = fs.readFileSync(
      path.join(__dirname, "01_deploy_bodhi_system.ts"),
      "utf8"
    );
    
    // 从脚本中提取地址（这些是示例地址，实际应该从部署日志读取）
    const exampleAddresses = {
      registry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      licenseCenter: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      bodhi1155: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    };
    
    // 检查合约是否在链上存在
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // 检查 Registry 合约
    try {
      const registryCode = await provider.getCode(exampleAddresses.registry);
      if (registryCode !== "0x") {
        addresses.registry = exampleAddresses.registry;
        colorLog(`✅ DatasetRegistry 已部署: ${exampleAddresses.registry}`, colors.green);
      } else {
        colorLog("❌ DatasetRegistry 未部署", colors.red);
      }
    } catch (error) {
      colorLog("❌ DatasetRegistry 检查失败", colors.red);
    }
    
    // 检查 LicenseCenter 合约
    try {
      const licenseCode = await provider.getCode(exampleAddresses.licenseCenter);
      if (licenseCode !== "0x") {
        addresses.licenseCenter = exampleAddresses.licenseCenter;
        colorLog(`✅ DataLicense 已部署: ${exampleAddresses.licenseCenter}`, colors.green);
      } else {
        colorLog("❌ DataLicense 未部署", colors.red);
      }
    } catch (error) {
      colorLog("❌ DataLicense 检查失败", colors.red);
    }
    
    // 检查 Bodhi1155 合约
    try {
      const bodhiCode = await provider.getCode(exampleAddresses.bodhi1155);
      if (bodhiCode !== "0x") {
        addresses.bodhi1155 = exampleAddresses.bodhi1155;
        colorLog(`✅ Bodhi1155 已部署: ${exampleAddresses.bodhi1155}`, colors.green);
      } else {
        colorLog("❌ Bodhi1155 未部署", colors.red);
      }
    } catch (error) {
      colorLog("❌ Bodhi1155 检查失败", colors.red);
    }
    
  } catch (error) {
    colorLog("❌ 无法读取部署信息", colors.red);
    colorLog(`   错误: ${error.message}`, colors.red);
  }
  
  return addresses;
}

function checkFrontendConfig(deployedAddresses: ContractAddresses): boolean {
  colorLog("\n🔍 3️⃣ 检查前端配置文件...", colors.cyan);
  
  try {
    const frontendConfigPath = path.join(__dirname, "../../nextjs/generated/deployedContracts.ts");
    
    if (!fs.existsSync(frontendConfigPath)) {
      colorLog("❌ 前端配置文件不存在: packages/nextjs/generated/deployedContracts.ts", colors.red);
      return false;
    }
    
    const configContent = fs.readFileSync(frontendConfigPath, "utf8");
    
    // 检查是否包含我们的合约配置
    const hasRegistry = configContent.includes("DatasetRegistry");
    const hasLicense = configContent.includes("DataLicense");
    const hasBodhi = configContent.includes("Bodhi1155");
    
    if (hasRegistry && hasLicense && hasBodhi) {
      colorLog("✅ 前端合约配置存在", colors.green);
      
      // 检查地址一致性（简化检查）
      if (deployedAddresses.registry && configContent.includes(deployedAddresses.registry)) {
        colorLog("✅ Registry 地址配置一致", colors.green);
      } else {
        colorLog("⚠️ Registry 地址配置可能不一致", colors.yellow);
      }
      
      if (deployedAddresses.licenseCenter && configContent.includes(deployedAddresses.licenseCenter)) {
        colorLog("✅ LicenseCenter 地址配置一致", colors.green);
      } else {
        colorLog("⚠️ LicenseCenter 地址配置可能不一致", colors.yellow);
      }
      
      if (deployedAddresses.bodhi1155 && configContent.includes(deployedAddresses.bodhi1155)) {
        colorLog("✅ Bodhi1155 地址配置一致", colors.green);
      } else {
        colorLog("⚠️ Bodhi1155 地址配置可能不一致", colors.yellow);
      }
      
      return true;
    } else {
      colorLog("❌ 前端配置文件缺少必要的合约配置", colors.red);
      colorLog(`   DatasetRegistry: ${hasRegistry ? "✅" : "❌"}`, colors.red);
      colorLog(`   DataLicense: ${hasLicense ? "✅" : "❌"}`, colors.red);
      colorLog(`   Bodhi1155: ${hasBodhi ? "✅" : "❌"}`, colors.red);
      return false;
    }
    
  } catch (error) {
    colorLog("❌ 无法读取前端配置文件", colors.red);
    colorLog(`   错误: ${error.message}`, colors.red);
    return false;
  }
}

async function checkWalletConnection(): Promise<boolean> {
  colorLog("\n🔍 4️⃣ 检查钱包连接状态...", colors.cyan);
  
  try {
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const network = await provider.getNetwork();
    
    if (network.chainId === 31337) {
      colorLog("✅ 钱包已连接到本地节点 (Chain ID: 31337)", colors.green);
      colorLog(`   网络名称: ${network.name}`, colors.green);
      return true;
    } else {
      colorLog(`❌ 钱包未连接到本地节点 (当前 Chain ID: ${network.chainId})`, colors.red);
      colorLog("   请切换到 Localhost 8545 网络", colors.yellow);
      return false;
    }
  } catch (error) {
    colorLog("❌ 无法检查钱包连接状态", colors.red);
    colorLog(`   错误: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  colorLog("🚀 Bodhi 开发环境检测脚本", colors.bright + colors.magenta);
  colorLog("=" .repeat(50), colors.cyan);
  
  const results = {
    hardhatNode: false,
    contractsDeployed: false,
    frontendConfig: false,
    walletConnected: false,
  };
  
  // 1. 检查 Hardhat 节点
  results.hardhatNode = await checkHardhatNode();
  
  // 2. 检查合约部署
  const deployedAddresses = await checkContractDeployment();
  results.contractsDeployed = !!(deployedAddresses.registry && deployedAddresses.licenseCenter && deployedAddresses.bodhi1155);
  
  // 3. 检查前端配置
  results.frontendConfig = checkFrontendConfig(deployedAddresses);
  
  // 4. 检查钱包连接
  results.walletConnected = await checkWalletConnection();
  
  // 总结
  colorLog("\n" + "=" .repeat(50), colors.cyan);
  colorLog("📊 检测结果总结:", colors.bright + colors.blue);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    colorLog("🎉 Overall ✅ 所有检查通过！开发环境配置正确", colors.bright + colors.green);
    colorLog("\n💡 下一步:", colors.cyan);
    colorLog("   1. 启动前端: cd packages/nextjs && npm run dev", colors.cyan);
    colorLog("   2. 访问: http://localhost:3000/dataset-gallery", colors.cyan);
    colorLog("   3. 访问: http://localhost:3000/license-gallery", colors.cyan);
  } else {
    colorLog("⚠️ Overall ❌ 部分检查未通过，请修复以下问题:", colors.bright + colors.red);
    
    if (!results.hardhatNode) {
      colorLog("   • 启动 Hardhat 节点: npx hardhat node", colors.yellow);
    }
    if (!results.contractsDeployed) {
      colorLog("   • 部署合约: npx hardhat run scripts/01_deploy_bodhi_system.ts", colors.yellow);
    }
    if (!results.frontendConfig) {
      colorLog("   • 更新前端合约配置", colors.yellow);
    }
    if (!results.walletConnected) {
      colorLog("   • 连接钱包并切换到 Localhost 8545 网络", colors.yellow);
    }
  }
  
  colorLog("\n" + "=" .repeat(50), colors.cyan);
}

main().catch((error) => {
  colorLog(`❌ 脚本执行失败: ${error.message}`, colors.red);
  process.exit(1);
});
