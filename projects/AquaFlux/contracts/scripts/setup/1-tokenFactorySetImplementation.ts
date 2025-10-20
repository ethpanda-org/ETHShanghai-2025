import { ethers } from "hardhat";
import { requireAddress } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Setting TokenFactory implementations with account:", deployer.address);

    // 从 addresses.json 读取所有需要的地址
    const tokenFactoryAddress = requireAddress("TokenFactory");
    const aqTokenAddress = requireAddress("AqToken");
    const pTokenAddress = requireAddress("PToken");
    const cTokenAddress = requireAddress("CToken");
    const sTokenAddress = requireAddress("SToken");

    console.log("\n📋 Using deployed contracts:");
    console.log("   TokenFactory:", tokenFactoryAddress);
    console.log("   AqToken:", aqTokenAddress);
    console.log("   PToken:", pTokenAddress);
    console.log("   CToken:", cTokenAddress);
    console.log("   SToken:", sTokenAddress);

    const TokenFactory = await ethers.getContractAt("TokenFactory", tokenFactoryAddress);

    // 定义要设置的实现合约
    const impls = [
        ["AQ", aqTokenAddress],
        ["P", pTokenAddress],
        ["C", cTokenAddress],
        ["S", sTokenAddress],
    ] as const;

    console.log("\n🔧 Setting token implementations...");

    for (const [key, address] of impls) {
        const tx = await TokenFactory.setImplementation(key, address);
        console.log(`   📤 Sent ${key} setImplementation tx: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   ✅ ${key} confirmed in block: ${receipt.blockNumber}`);
    }

    // 验证配置
    console.log("\n🔍 Verifying implementations...");
    for (const [key, expectedAddress] of impls) {
        const actualAddress = await TokenFactory.getImplementation(key);
        if (actualAddress.toLowerCase() === expectedAddress.toLowerCase()) {
            console.log(`   ✅ ${key}: ${actualAddress}`);
        } else {
            console.error(`   ❌ ${key}: Expected ${expectedAddress}, got ${actualAddress}`);
        }
    }

    console.log("\n✅ TokenFactory implementations configured successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
