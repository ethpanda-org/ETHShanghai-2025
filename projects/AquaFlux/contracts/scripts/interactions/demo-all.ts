import { execSync } from "child_process";
import { displayInteractionsData, clearInteractionsData } from "./utils";

/**
 * 运行单个演示脚本
 */
function runScript(scriptName: string, network: string = "hardhat") {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🚀 Running: ${scriptName}`);
    console.log("=".repeat(70));

    try {
        execSync(`npx hardhat run scripts/interactions/${scriptName} --network ${network}`, {
            stdio: "inherit",
        });
    } catch (error) {
        console.error(`\n❌ Failed to run ${scriptName}`);
        process.exit(1);
    }
}

async function main() {
    console.log("🌊 AquaFlux Complete Demo Script");
    console.log("=".repeat(70));

    // 从命令行参数获取网络名称
    const network = process.env.HARDHAT_NETWORK || "hardhat";
    console.log(`📡 Running demo on network: ${network}\n`);

    // 询问是否清空之前的交互数据
    console.log("⚠️  This will run the complete demo flow:");
    console.log("   1. Deploy Mock RWA Token");
    console.log("   2. Mint tokens to user");
    console.log("   3. Approve AquaFluxCore");
    console.log("   4. Register asset");
    console.log("   5. Verify asset");
    console.log("   6. Wrap RWA tokens → AQ tokens");
    console.log("   7. Split AQ tokens → P + C tokens");

    console.log("\n⏳ Starting demo in 3 seconds... (Press Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 按顺序执行所有演示脚本
    const scripts = [
        "1-deployRWAMockERC20.ts",
        "2-mock-mint.ts",
        "3-mock-approve.ts",
        "4-aquaFluxCoreRegister.ts",
        "5-aquaFluxCoreVerify.ts",
        "6-aquaFluxCoreWrap.ts",
        "7-aquaFluxCoreSplit.ts",
    ];

    for (const script of scripts) {
        runScript(script, network);
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 Demo completed successfully!");
    console.log("=".repeat(70));

    // 显示所有交互数据
    displayInteractionsData();

    console.log("\n✅ AquaFlux demo finished!");
    console.log("\nYou have successfully:");
    console.log("  ✓ Deployed a Mock RWA Token");
    console.log("  ✓ Minted tokens to your account");
    console.log("  ✓ Approved AquaFluxCore to use your tokens");
    console.log("  ✓ Registered a new RWA asset");
    console.log("  ✓ Verified the asset");
    console.log("  ✓ Wrapped RWA tokens into AQ tokens");
    console.log("  ✓ Split AQ tokens into Principal and Coupon tokens");

    console.log("\n📊 Check interactions.json for all transaction details");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
