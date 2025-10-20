import { ethers } from "hardhat";
import { loadDeployedAddress, requireInteractionData, saveInteractionsData } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Verifying RWA asset with account:", deployer.address);

    // 从 deploy/addresses.json 读取 AquaFluxCore 地址
    const aquaFluxCoreAddress = loadDeployedAddress("AquaFluxCore");

    // 从 interactions.json 读取 assetId
    const assetId = requireInteractionData(
        "assetId",
        "Please run 4-aquaFluxCoreRegister.ts first"
    );

    console.log("\n📋 Verification details:");
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);
    console.log("   Asset ID:", assetId);

    const AquaFluxCore = await ethers.getContractAt("AquaFluxCore", aquaFluxCoreAddress);

    console.log("\n🔧 Verifying asset...");
    const tx = await AquaFluxCore.verify(assetId);
    console.log("   📤 Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Verified in block:", receipt.blockNumber);

    // 保存验证时间
    saveInteractionsData({
        verifiedAt: new Date().toISOString(),
    });

    console.log("\n✅ Asset verified successfully!");
    console.log("   Now you can wrap RWA tokens into AQ tokens");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
