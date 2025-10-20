import { ethers } from "hardhat";

async function main() {
  console.log("🔧 修复 PoolManager Configuration...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 操作账户:", deployer.address);
  
  const addresses = {
    PoolManager: "0xbb644076500ea106d9029b382c4d49f56225cb82",
    PoolConfiguration: "0x35456038942C91eb16fe2E33C213135E75f8d188",
  };

  // 连接 PoolManager
  const poolManager = await ethers.getContractAt("PoolManager", addresses.PoolManager);

  //  检查当前 configuration
  console.log("1️⃣  检查当前 configuration...");
  const currentConfig = await poolManager.configuration();
  console.log("   当前 Configuration:", currentConfig);

  if (currentConfig !== ethers.ZeroAddress) {
    console.log("   ✅ Configuration 已设置，无需修复");
    
    if (currentConfig.toLowerCase() !== addresses.PoolConfiguration.toLowerCase()) {
      console.log("   ⚠️  但地址不匹配!");
      console.log("   期望:", addresses.PoolConfiguration);
      console.log("   实际:", currentConfig);
    }
    return;
  }

  console.log("   ❌ Configuration 未设置，需要修复\n");

  // 检查权限
  console.log("2️⃣  检查管理员权限...");
  const hasAdminRole = await poolManager.hasRole(ethers.ZeroHash, deployer.address);
  console.log("   DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");

  if (!hasAdminRole) {
    console.log("\n❌ 错误: 当前账户没有管理员权限，无法设置 configuration");
    console.log("   需要使用部署账户或获得授权");
    return;
  }

  // 检查 PoolManager 是否有 updateConfiguration 方法
  console.log("\n3️⃣  检查合约方法...");
  const poolManagerInterface = poolManager.interface;
  
  // 尝试查找设置 configuration 的方法
  let methodFound = false;
  let methodName = "";
  
  const possibleMethods = [
    "updateConfiguration",
    "setConfiguration", 
    "changeConfiguration",
    "initializeConfiguration"
  ];

  for (const method of possibleMethods) {
    try {
      poolManagerInterface.getFunction(method);
      methodFound = true;
      methodName = method;
      console.log(`   ✅ 找到方法: ${method}()`);
      break;
    } catch {
      // 方法不存在
    }
  }

  if (!methodFound) {
    console.log("\n⚠️  警告: 未找到标准的设置 configuration 方法");
    console.log("   这可能意味着:");
    console.log("   1. Configuration 应该在初始化时设置");
    console.log("   2. 需要升级 PoolManager Implementation");
    console.log("   3. Configuration 是通过构造函数传入的");
    
    console.log("\n📝 建议:");
    console.log("   - 检查 PoolManager 的构造函数参数");
    console.log("   - 可能需要重新部署 PoolManager Implementation");
    console.log("   - 然后通过 ProxyAdmin 升级代理");
    
    return;
  }

  // 执行设置
  console.log(`\n4️⃣  执行 ${methodName}()...`);
  try {
    const tx = await poolManager.updateConfiguration(addresses.PoolConfiguration);
    console.log("   交易已发送:", tx.hash);
    
    console.log("   ⏳ 等待确认...");
    const receipt = await tx.wait();
    console.log("   ✅ 交易已确认! Gas 使用:", receipt.gasUsed.toString());

    // 验证设置
    console.log("\n5️⃣  验证设置...");
    const newConfig = await poolManager.configuration();
    console.log("   新的 Configuration:", newConfig);
    
    if (newConfig.toLowerCase() === addresses.PoolConfiguration.toLowerCase()) {
      console.log("   ✅ 设置成功!");
    } else {
      console.log("   ❌ 设置失败，地址不匹配");
    }

  } catch (error: any) {
    console.log("\n❌ 设置失败:", error.message);
    
    if (error.message.includes("revert")) {
      console.log("\n可能的原因:");
      console.log("   - 权限不足");
      console.log("   - Configuration 地址无效");
      console.log("   - 合约逻辑不允许此操作");
    }
  }

  console.log("\n✅ 完成!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

