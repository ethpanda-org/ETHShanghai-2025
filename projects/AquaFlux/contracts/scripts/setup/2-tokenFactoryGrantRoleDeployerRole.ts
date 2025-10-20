import { ethers } from "hardhat";
import { requireAddress } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Granting DEPLOYER_ROLE with account:", deployer.address);

    // 从 addresses.json 读取地址
    const tokenFactoryAddress = requireAddress("TokenFactory");
    const aquaFluxCoreAddress = requireAddress("AquaFluxCore");

    console.log("\n📋 Using deployed contracts:");
    console.log("   TokenFactory:", tokenFactoryAddress);
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);

    const TokenFactory = await ethers.getContractAt("TokenFactory", tokenFactoryAddress);

    // Grant DEPLOYER_ROLE to AquaFluxCore
    const DEPLOYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEPLOYER_ROLE"));

    console.log("\n🔧 Granting DEPLOYER_ROLE to AquaFluxCore...");
    const tx = await TokenFactory.grantRole(DEPLOYER_ROLE, aquaFluxCoreAddress);
    console.log(`   📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);

    // 验证角色授权
    console.log("\n🔍 Verifying role assignment...");
    const hasRole = await TokenFactory.hasRole(DEPLOYER_ROLE, aquaFluxCoreAddress);

    if (hasRole) {
        console.log(`   ✅ AquaFluxCore has DEPLOYER_ROLE`);
    } else {
        console.error(`   ❌ Failed to grant DEPLOYER_ROLE to AquaFluxCore`);
        process.exit(1);
    }

    console.log("\n✅ DEPLOYER_ROLE granted successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
