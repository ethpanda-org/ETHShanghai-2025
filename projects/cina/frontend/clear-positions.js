const hre = require("hardhat");

async function main() {
  console.log("🧹 清空仓位...");
  
  const diamondAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  try {
    // 获取合约实例
    const MockDiamond = await hre.ethers.getContractFactory("MockDiamond");
    const diamond = MockDiamond.attach(diamondAddress);
    
    // 检查当前仓位数量
    const nextId = await diamond.getNextPositionId();
    console.log(`📊 当前仓位数量: ${nextId.toString()}`);
    
    if (nextId.toString() === "1") {
      console.log("✅ 没有仓位需要清空");
      return;
    }
    
    // 清空所有仓位
    console.log("🧹 正在清空所有仓位...");
    const tx = await diamond.clearAllPositions();
    console.log("✅ 清空交易已发送:", tx.hash);
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log("✅ 交易确认成功！状态:", receipt.status);
    
    // 检查清空后的状态
    const newNextId = await diamond.getNextPositionId();
    console.log(`📊 清空后仓位数量: ${newNextId.toString()}`);
    
    console.log("🎉 所有仓位已清空！");
    
  } catch (error) {
    console.error("❌ 清空仓位失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本失败:", error);
    process.exit(1);
  });