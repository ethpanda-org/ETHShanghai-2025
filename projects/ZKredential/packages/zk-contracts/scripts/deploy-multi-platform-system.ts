import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * 部署多平台 ZK-RWA 系统（推荐方案）
 * 
 * 架构：
 * 1. 三个独立验证器（PropertyFy, RealT, RealestateIO）
 * 2. ZKRWARegistryMultiPlatform（多平台身份注册）
 * 3. ZKComplianceModule（ERC-3643 即插即用）
 * 
 * 使用方法:
 * npx hardhat run scripts/deploy-multi-platform-system.ts --network sepolia
 * 或本地测试:
 * npx hardhat run scripts/deploy-multi-platform-system.ts --network localhost
 */
async function main() {
  console.log("\n🚀 开始部署多平台 ZK-RWA 系统...");
  console.log("="​.repeat(80));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n📝 部署信息:");
  console.log("  网络:", network.name);
  console.log("  链ID:", network.chainId);
  console.log("  部署账户:", deployer.address);
  console.log("  账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  console.log("\n" + "=".repeat(80));
  
  const deployedContracts: any = {};

  // ============ 步骤 1: 部署三个验证器合约 ============
  
  console.log("\n📋 步骤 1/4: 部署验证器合约");
  console.log("-".repeat(80));
  
  // 1.1 PropertyFy 验证器 (12 信号)
  console.log("\n1.1 部署 PropertyFyVerifier (12 个公共信号)...");
  const PropertyFyVerifier = await ethers.getContractFactory("PropertyFyVerifier");
  const propertyfyVerifier = await PropertyFyVerifier.deploy();
  await propertyfyVerifier.waitForDeployment();
  deployedContracts.propertyfyVerifier = await propertyfyVerifier.getAddress();
  console.log("    ✅ PropertyFyVerifier:", deployedContracts.propertyfyVerifier);
  
  // 1.2 RealT 验证器 (12 信号)
  console.log("\n1.2 部署 RealTVerifier (12 个公共信号)...");
  const RealTVerifier = await ethers.getContractFactory("RealTVerifier");
  const realtVerifier = await RealTVerifier.deploy();
  await realtVerifier.waitForDeployment();
  deployedContracts.realtVerifier = await realtVerifier.getAddress();
  console.log("    ✅ RealTVerifier:", deployedContracts.realtVerifier);
  
  // 1.3 RealestateIO 验证器 (16 信号)
  console.log("\n1.3 部署 RealestateVerifier (16 个公共信号)...");
  const RealestateVerifier = await ethers.getContractFactory("RealestateVerifier");
  const realestateVerifier = await RealestateVerifier.deploy();
  await realestateVerifier.waitForDeployment();
  deployedContracts.realestateVerifier = await realestateVerifier.getAddress();
  console.log("    ✅ RealestateVerifier:", deployedContracts.realestateVerifier);
  
  // ============ 步骤 2: 部署多平台注册合约 ============
  
  console.log("\n\n📋 步骤 2/4: 部署 ZKRWARegistryMultiPlatform");
  console.log("-".repeat(80));
  
  const ZKRWARegistryMultiPlatform = await ethers.getContractFactory("ZKRWARegistryMultiPlatform");
  const registry = await ZKRWARegistryMultiPlatform.deploy(
    deployedContracts.propertyfyVerifier,
    deployedContracts.realtVerifier,
    deployedContracts.realestateVerifier
  );
  await registry.waitForDeployment();
  deployedContracts.registry = await registry.getAddress();
  
  console.log("\n✅ ZKRWARegistryMultiPlatform 已部署:", deployedContracts.registry);
  console.log("  支持平台:");
  console.log("    - PropertyFy (12 信号)");
  console.log("    - RealT (12 信号)");
  console.log("    - RealestateIO (16 信号)");
  
  // ============ 步骤 3: 部署 ZKComplianceModule ============
  
  console.log("\n\n📋 步骤 3/4: 部署 ZKComplianceModule（即插即用）");
  console.log("-".repeat(80));
  
  const ZKComplianceModule = await ethers.getContractFactory("ZKComplianceModule");
  const complianceModule = await ZKComplianceModule.deploy(
    deployedContracts.registry,
    ethers.ZeroAddress,  // complianceGateway 暂时为空
    "propertyfy"         // 默认平台
  );
  await complianceModule.waitForDeployment();
  deployedContracts.complianceModule = await complianceModule.getAddress();
  
  console.log("\n✅ ZKComplianceModule 已部署:", deployedContracts.complianceModule);
  console.log("  ERC-3643 即插即用合规模块");
  console.log("  默认平台: PropertyFy");
  
  // ============ 步骤 4: 保存部署信息 ============
  
  console.log("\n\n📋 步骤 4/4: 保存部署信息");
  console.log("-".repeat(80));
  
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    architecture: "Registry + Adapter (Two-Step)",
    contracts: {
      verifiers: {
        propertyfy: {
          address: deployedContracts.propertyfyVerifier,
          publicSignals: 12,
          modules: ["KYC", "ASSET"]
        },
        realt: {
          address: deployedContracts.realtVerifier,
          publicSignals: 12,
          modules: ["KYC", "AML"]
        },
        realestate: {
          address: deployedContracts.realestateVerifier,
          publicSignals: 16,
          modules: ["KYC", "ASSET", "AML"]
        }
      },
      core: {
        zkRegistry: {
          address: deployedContracts.registry,
          description: "Multi-platform identity registry"
        },
        complianceModule: {
          address: deployedContracts.complianceModule,
          description: "ERC-3643 plug-and-play compliance module"
        }
      }
    },
    integrationGuide: {
      step1: "User generates ZK proof for their chosen platform",
      step2: "User calls zkRegistry.registerIdentity(platform, proof...)",
      step3: "RWA project: rwaToken.setComplianceModule(complianceModule.address)",
      step4: "Users can trade RWA tokens anonymously"
    }
  };

  // 保存部署信息
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const deploymentFile = path.join(
    deploymentsDir,
    `multi-platform-${network.name}-${timestamp}.json`
  );
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存:", deploymentFile);
  
  // ============ 部署总结 ============
  
  console.log("\n\n" + "=".repeat(80));
  console.log("🎉 部署完成！");
  console.log("=".repeat(80));
  
  console.log("\n📍 合约地址:");
  console.log("  PropertyFyVerifier:    ", deployedContracts.propertyfyVerifier);
  console.log("  RealTVerifier:         ", deployedContracts.realtVerifier);
  console.log("  RealestateVerifier:    ", deployedContracts.realestateVerifier);
  console.log("  ZKRWARegistry:         ", deployedContracts.registry);
  console.log("  ZKComplianceModule:    ", deployedContracts.complianceModule);
  
  console.log("\n📝 前端配置更新:");
  console.log("请更新 lib/contracts/addresses.ts:");
  console.log("```typescript");
  console.log(`  ${network.name}: {`);
  console.log(`    verifiers: {`);
  console.log(`      propertyfy: "${deployedContracts.propertyfyVerifier}",`);
  console.log(`      realt: "${deployedContracts.realtVerifier}",`);
  console.log(`      realestate: "${deployedContracts.realestateVerifier}",`);
  console.log(`    },`);
  console.log(`    registry: "${deployedContracts.registry}",`);
  console.log(`    complianceModule: "${deployedContracts.complianceModule}",`);
  console.log(`  },`);
  console.log("```");
  
  console.log("\n📚 RWA 项目集成示例:");
  console.log("```solidity");
  console.log("// 任何 ERC-3643 RWA 代币都可以即插即用：");
  console.log(`await rwaToken.setComplianceModule("${deployedContracts.complianceModule}")`);
  console.log("// ✅ 完成！代币立即支持隐私保护！");
  console.log("```");
  
  console.log("\n🧪 测试步骤:");
  console.log("1. 更新前端配置文件");
  console.log("2. 重启前端: npm run dev");
  console.log("3. 访问: http://localhost:3000/proof-generation");
  console.log("4. 选择平台并生成证明");
  console.log("5. 测试链上注册");
  
  console.log("\n✨ 部署完成！\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:");
    console.error(error);
    process.exit(1);
  });

