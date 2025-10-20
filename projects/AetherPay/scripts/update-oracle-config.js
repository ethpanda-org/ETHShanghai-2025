const { ethers } = require("hardhat");
require("dotenv").config({ path: "./config/.env" });

async function main() {
    console.log("🔧 更新 AetherOracleV2 配置...");

    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);

    // 合约地址
    const ORACLE_ADDRESS = "0x1D323b80710c1d0c833B920CB7Ace09c49e237d7";

    // ABI
    const ABI = [
        "function setMinOracleNodes(uint256 _minNodes) external",
        "function setRequiredSubmissions(uint256 _required) external",
        "function minOracleNodes() external view returns (uint256)",
        "function requiredSubmissions() external view returns (uint256)",
        "function owner() external view returns (address)"
    ];

    // 连接合约
    const oracle = await ethers.getContractAt(ABI, ORACLE_ADDRESS);

    // 检查当前配置
    const currentMin = await oracle.minOracleNodes();
    const currentRequired = await oracle.requiredSubmissions();
    const owner = await oracle.owner();

    console.log("\n📊 当前配置:");
    console.log("  - 合约 Owner:", owner);
    console.log("  - 当前 minOracleNodes:", currentMin.toString());
    console.log("  - 当前 requiredSubmissions:", currentRequired.toString());
    console.log("  - 部署者地址:", deployer.address);

    // 检查权限
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error("❌ 错误: 部署者不是合约的 Owner!");
        console.error("  需要使用 Owner 账户:", owner);
        return;
    }

    console.log("\n🚀 开始更新配置...");

    // 更新为1个节点即可（测试环境）
    try {
        console.log("1. 设置 minOracleNodes = 1...");
        const tx1 = await oracle.setMinOracleNodes(1);
        await tx1.wait();
        console.log("   ✅ 成功! Tx:", tx1.hash);

        console.log("2. 设置 requiredSubmissions = 1...");
        const tx2 = await oracle.setRequiredSubmissions(1);
        await tx2.wait();
        console.log("   ✅ 成功! Tx:", tx2.hash);

        // 验证更新
        const newMin = await oracle.minOracleNodes();
        const newRequired = await oracle.requiredSubmissions();

        console.log("\n✅ 配置更新成功!");
        console.log("  - 新 minOracleNodes:", newMin.toString());
        console.log("  - 新 requiredSubmissions:", newRequired.toString());
        console.log("\n🎉 现在单个 Oracle 节点就可以提交汇率了!");

    } catch (error) {
        console.error("❌ 更新失败:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });