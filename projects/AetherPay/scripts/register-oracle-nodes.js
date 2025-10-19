const { ethers } = require("hardhat");
require("dotenv").config({ path: "./config/.env" });

async function main() {
    console.log("🚀 注册多个Oracle节点到AetherOracleV2...\n");

    const [deployer] = await ethers.getSigners();
    console.log("使用部署账户:", deployer.address);

    // Oracle节点地址
    const ORACLE_NODES = [
        "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c",  // Node 1 (当前已注册)
        "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",  // Node 2
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"   // Node 3
    ];

    // 合约地址
    const ORACLE_ADDRESS = "0x1D323b80710c1d0c833B920CB7Ace09c49e237d7";

    // ABI
    const ABI = [
        "function addOracleNode(address nodeAddress) external",
        "function removeOracleNode(address nodeAddress) external",
        "function getActiveOracles() external view returns (address[] memory)",
        "function getOracleInfo(address nodeAddress) external view returns (bool isActive, uint256 reputation, uint256 totalSubmissions, uint256 successfulSubmissions, uint256 lastSubmitTime)",
        "function owner() external view returns (address)"
    ];

    // 连接合约
    const oracle = await ethers.getContractAt(ABI, ORACLE_ADDRESS);

    // 检查当前Oracle节点
    console.log("📊 检查当前Oracle节点状态...");
    const activeOracles = await oracle.getActiveOracles();
    console.log("当前活跃节点数:", activeOracles.length);
    console.log("活跃节点列表:", activeOracles);
    console.log("");

    // 注册新节点
    for (let i = 0; i < ORACLE_NODES.length; i++) {
        const nodeAddress = ORACLE_NODES[i];
        console.log(`\n📝 处理节点 #${i+1}: ${nodeAddress}`);

        try {
            // 检查节点状态
            const info = await oracle.getOracleInfo(nodeAddress);

            if (info.isActive) {
                console.log(`   ✅ 节点已经注册并激活`);
                console.log(`      信誉: ${info.reputation}`);
                console.log(`      提交次数: ${info.totalSubmissions}`);
            } else {
                console.log(`   ⏳ 注册新节点...`);
                const tx = await oracle.addOracleNode(nodeAddress);
                await tx.wait();
                console.log(`   ✅ 节点注册成功! Tx: ${tx.hash}`);
            }
        } catch (error) {
            // 如果节点不存在，会报错，这时需要注册
            if (error.message.includes("Oracle not active")) {
                console.log(`   ⏳ 注册新节点...`);
                const tx = await oracle.addOracleNode(nodeAddress);
                await tx.wait();
                console.log(`   ✅ 节点注册成功! Tx: ${tx.hash}`);
            } else {
                console.log(`   ❌ 错误: ${error.message}`);
            }
        }
    }

    // 验证最终状态
    console.log("\n\n✅ 最终状态检查:");
    const finalOracles = await oracle.getActiveOracles();
    console.log("活跃Oracle节点总数:", finalOracles.length);

    for (const node of finalOracles) {
        const info = await oracle.getOracleInfo(node);
        console.log(`\n节点: ${node}`);
        console.log(`  状态: ${info.isActive ? '✅ 活跃' : '❌ 非活跃'}`);
        console.log(`  信誉分: ${info.reputation}/1000`);
    }

    console.log("\n🎉 Oracle网络配置完成！现在可以启动3个节点了。");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });