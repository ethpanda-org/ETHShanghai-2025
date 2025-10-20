import { ethers } from "hardhat";

async function main() {
  console.log("🚀 开始部署 Router 系统到 Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 部署账户:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 余额:", ethers.formatEther(balance), "ETH\n");

  const addresses: { [key: string]: string } = {
    PoolManager: "0xbb644076500ea106d9029b382c4d49f56225cb82",
    MultiPathConverter: "0xc6719ba6caf5649be53273a77ba812f86dcdb951",
    FxUSDBasePool: "0x420D6b8546F14C394A703F5ac167619760A721A9",
    Morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Morpho Blue (存在于多链)
  };

  // ============ 1. 部署所有 Facets ============
  console.log("═══════════════════════════════════════");
  console.log("1️⃣  部署 ERC2535 Facets");
  console.log("═══════════════════════════════════════\n");

  const facets = [];

  // DiamondCutFacet
  console.log("部署 DiamondCutFacet...");
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  const diamondCutAddr = await diamondCutFacet.getAddress();
  console.log("✅ DiamondCutFacet:", diamondCutAddr);
  facets.push({ name: "DiamondCutFacet", address: diamondCutAddr });

  // DiamondLoupeFacet
  console.log("\n部署 DiamondLoupeFacet...");
  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  const diamondLoupeAddr = await diamondLoupeFacet.getAddress();
  console.log("✅ DiamondLoupeFacet:", diamondLoupeAddr);
  facets.push({ name: "DiamondLoupeFacet", address: diamondLoupeAddr });

  // OwnershipFacet
  console.log("\n部署 OwnershipFacet...");
  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  const ownershipAddr = await ownershipFacet.getAddress();
  console.log("✅ OwnershipFacet:", ownershipAddr);
  facets.push({ name: "OwnershipFacet", address: ownershipAddr });

  // RouterManagementFacet
  console.log("\n部署 RouterManagementFacet...");
  const RouterManagementFacet = await ethers.getContractFactory("RouterManagementFacet");
  const routerManagementFacet = await RouterManagementFacet.deploy();
  await routerManagementFacet.waitForDeployment();
  const routerManagementAddr = await routerManagementFacet.getAddress();
  console.log("✅ RouterManagementFacet:", routerManagementAddr);
  facets.push({ name: "RouterManagementFacet", address: routerManagementAddr });

  // MorphoFlashLoanCallbackFacet
  console.log("\n部署 MorphoFlashLoanCallbackFacet...");
  const MorphoFlashLoanCallbackFacet = await ethers.getContractFactory("MorphoFlashLoanCallbackFacet");
  const morphoFlashLoanCallbackFacet = await MorphoFlashLoanCallbackFacet.deploy(addresses.Morpho);
  await morphoFlashLoanCallbackFacet.waitForDeployment();
  const morphoFlashLoanCallbackAddr = await morphoFlashLoanCallbackFacet.getAddress();
  console.log("✅ MorphoFlashLoanCallbackFacet:", morphoFlashLoanCallbackAddr);
  facets.push({ name: "MorphoFlashLoanCallbackFacet", address: morphoFlashLoanCallbackAddr });

  // PositionOperateFlashLoanFacetV2
  console.log("\n部署 PositionOperateFlashLoanFacetV2...");
  const PositionOperateFlashLoanFacetV2 = await ethers.getContractFactory("PositionOperateFlashLoanFacetV2");
  const positionOperateFlashLoanFacetV2 = await PositionOperateFlashLoanFacetV2.deploy(
    addresses.Morpho,
    addresses.PoolManager,
    ethers.ZeroAddress // whitelist
  );
  await positionOperateFlashLoanFacetV2.waitForDeployment();
  const positionOperateFlashLoanV2Addr = await positionOperateFlashLoanFacetV2.getAddress();
  console.log("✅ PositionOperateFlashLoanFacetV2:", positionOperateFlashLoanV2Addr);
  facets.push({ name: "PositionOperateFlashLoanFacetV2", address: positionOperateFlashLoanV2Addr });

  // FxUSDBasePoolV2Facet
  console.log("\n部署 FxUSDBasePoolV2Facet...");
  const FxUSDBasePoolV2Facet = await ethers.getContractFactory("FxUSDBasePoolV2Facet");
  const fxUSDBasePoolV2Facet = await FxUSDBasePoolV2Facet.deploy(addresses.FxUSDBasePool);
  await fxUSDBasePoolV2Facet.waitForDeployment();
  const fxUSDBasePoolV2Addr = await fxUSDBasePoolV2Facet.getAddress();
  console.log("✅ FxUSDBasePoolV2Facet:", fxUSDBasePoolV2Addr);
  facets.push({ name: "FxUSDBasePoolV2Facet", address: fxUSDBasePoolV2Addr });

  // ============ 2. 准备 Diamond Cut ============
  console.log("\n═══════════════════════════════════════");
  console.log("2️⃣  准备 Diamond Cuts");
  console.log("═══════════════════════════════════════\n");

  const getAllSignatures = (contractFactory: any): string[] => {
    const sigs: string[] = [];
    const iface = contractFactory.interface;
    iface.forEachFunction((func: any) => {
      sigs.push(func.selector);
    });
    return sigs;
  };

  const diamondCuts = [
    {
      facetAddress: diamondCutAddr,
      action: 0, // Add
      functionSelectors: getAllSignatures(DiamondCutFacet),
    },
    {
      facetAddress: diamondLoupeAddr,
      action: 0,
      functionSelectors: getAllSignatures(DiamondLoupeFacet),
    },
    {
      facetAddress: ownershipAddr,
      action: 0,
      functionSelectors: getAllSignatures(OwnershipFacet),
    },
    {
      facetAddress: routerManagementAddr,
      action: 0,
      functionSelectors: getAllSignatures(RouterManagementFacet),
    },
    {
      facetAddress: morphoFlashLoanCallbackAddr,
      action: 0,
      functionSelectors: getAllSignatures(MorphoFlashLoanCallbackFacet),
    },
    {
      facetAddress: positionOperateFlashLoanV2Addr,
      action: 0,
      functionSelectors: getAllSignatures(PositionOperateFlashLoanFacetV2),
    },
    {
      facetAddress: fxUSDBasePoolV2Addr,
      action: 0,
      functionSelectors: getAllSignatures(FxUSDBasePoolV2Facet),
    },
  ];

  console.log("准备了", diamondCuts.length, "个 Facet Cuts");

  // ============ 3. 部署 Diamond (Router) ============
  console.log("\n═══════════════════════════════════════");
  console.log("3️⃣  部署 Diamond (Router)");
  console.log("═══════════════════════════════════════\n");

  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(
    diamondCuts,
    {
      owner: deployer.address,
      init: ethers.ZeroAddress,
      initCalldata: "0x",
    }
  );
  await diamond.waitForDeployment();
  const diamondAddr = await diamond.getAddress();
  console.log("✅ Diamond (Router):", diamondAddr);

  // ============ 4. 配置 Router ============
  console.log("\n═══════════════════════════════════════");
  console.log("4️⃣  配置 Router");
  console.log("═══════════════════════════════════════\n");

  // 连接到 RouterManagementFacet
  const router = await ethers.getContractAt("RouterManagementFacet", diamondAddr);

  // 批准 MultiPathConverter
  console.log("批准 MultiPathConverter...");
  const approveTx = await router.approveTarget(addresses.MultiPathConverter, addresses.MultiPathConverter);
  await approveTx.wait();
  console.log("✅ 已批准 MultiPathConverter");

  // 授予 PoolManager OPERATOR_ROLE
  console.log("\n授予 Router OPERATOR_ROLE...");
  const poolManager = await ethers.getContractAt("PoolManager", addresses.PoolManager);
  const operatorRole = ethers.id("OPERATOR_ROLE");
  
  try {
    const grantRoleTx = await poolManager.grantRole(operatorRole, diamondAddr);
    await grantRoleTx.wait();
    console.log("✅ 已授予 Router OPERATOR_ROLE");
  } catch (e: any) {
    console.log("⚠️  授予 OPERATOR_ROLE 失败:", e.message.split('\n')[0]);
    console.log("   可能需要管理员手动授权");
  }

  // ============ 总结 ============
  console.log("\n═══════════════════════════════════════");
  console.log("📋 部署总结");
  console.log("═══════════════════════════════════════\n");

  console.log("✅ 已部署的 Facets:");
  facets.forEach(facet => {
    console.log(`   - ${facet.name.padEnd(35)} ${facet.address}`);
  });

  console.log("\n✅ Router (Diamond):", diamondAddr);

  console.log("\n📝 部署地址已保存\n");

  // 保存部署地址
  const fs = require("fs");
  const deploymentInfo = `
# Router 系统部署地址 (Sepolia)
部署时间: ${new Date().toISOString()}
部署账户: ${deployer.address}

## Facets
${facets.map(f => `- **${f.name}**: \`${f.address}\``).join('\n')}

## Router (Diamond)
- **Diamond**: \`${diamondAddr}\`

## 配置
- MultiPathConverter 已批准
- OPERATOR_ROLE ${addresses.PoolManager === diamondAddr ? '✅' : '⚠️ 需要手动授予'}
`;

  fs.appendFileSync("DEPLOYMENT_ADDRESSES.md", deploymentInfo);

  console.log("✅ 完成!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

