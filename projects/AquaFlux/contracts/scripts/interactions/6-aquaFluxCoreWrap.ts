import { ethers } from "hardhat";
import { loadDeployedAddress, requireInteractionData, saveInteractionsData } from "./utils";

async function main() {
    const [user] = await ethers.getSigners();

    console.log("Wrapping RWA tokens into AQ tokens");
    console.log("User account:", user.address);

    // 从 deploy/addresses.json 读取 AquaFluxCore 地址
    const aquaFluxCoreAddress = loadDeployedAddress("AquaFluxCore");

    // 从 interactions.json 读取 assetId
    const assetId = requireInteractionData(
        "assetId",
        "Please run 4-aquaFluxCoreRegister.ts first"
    );

    console.log("\n📋 Wrap details:");
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);
    console.log("   Asset ID:", assetId);

    const AquaFluxCore = await ethers.getContractAt("AquaFluxCore", aquaFluxCoreAddress);

    // Wrap 100 RWA tokens into AQ tokens
    const wrapAmount = "100";
    console.log(`\n🔧 Wrapping ${wrapAmount} RWA tokens...`);

    const tx = await AquaFluxCore.connect(user).wrap(
        assetId,
        ethers.parseEther(wrapAmount)
    );
    console.log("   📤 Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Wrapped in block:", receipt.blockNumber);

    // 保存 wrap 金额
    saveInteractionsData({
        wrapAmount,
    });

    console.log("\n✅ Wrap successful!");
    console.log(`   ${wrapAmount} RWA tokens → AQ tokens (after fees)`);
    console.log("   Now you can split AQ tokens into P and C tokens");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
