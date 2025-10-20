import { execSync } from "child_process";
import { displayAddresses } from "./utils";

/**
 * 运行单个部署脚本
 */
function runScript(scriptName: string, network: string = "hardhat") {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🚀 Running: ${scriptName}`);
    console.log("=".repeat(70));

    try {
        execSync(
            `npx hardhat run scripts/deploy/${scriptName} --network ${network}`,
            { stdio: "inherit" }
        );
    } catch (error) {
        console.error(`\n❌ Failed to run ${scriptName}`);
        process.exit(1);
    }
}

async function main() {
    console.log("🌊 AquaFlux Complete Deployment Script");
    console.log("=".repeat(70));

    // 从命令行参数获取网络名称
    const network = process.env.HARDHAT_NETWORK || "hardhat";
    console.log(`📡 Deploying to network: ${network}\n`);

    // 按顺序执行所有部署脚本
    const scripts = [
        "1-deployAqToken.ts",
        "2-deployPToken.ts",
        "3-deployCToken.ts",
        "4-deploySToken.ts",
        "5-deployTokenFactory.ts",
        "6-deployAquaFluxTimelock.ts",
        "7-deployAquaFluxCore.ts",
    ];

    for (const script of scripts) {
        runScript(script, network);
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 All contracts deployed successfully!");
    console.log("=".repeat(70));

    // 显示所有已部署的合约地址
    displayAddresses();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
