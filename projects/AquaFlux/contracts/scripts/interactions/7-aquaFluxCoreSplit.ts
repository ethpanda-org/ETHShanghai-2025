import { ethers } from "hardhat";
import { loadDeployedAddress, requireInteractionData, saveInteractionsData } from "./utils";

async function main() {
    const [user] = await ethers.getSigners();

    console.log("Splitting AQ tokens into P and C tokens");
    console.log("User account:", user.address);

    // 从 deploy/addresses.json 读取 AquaFluxCore 地址
    const aquaFluxCoreAddress = loadDeployedAddress("AquaFluxCore");

    // 从 interactions.json 读取 assetId
    const assetId = requireInteractionData(
        "assetId",
        "Please run 4-aquaFluxCoreRegister.ts first"
    );

    console.log("\n📋 Split details:");
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);
    console.log("   Asset ID:", assetId);

    const AquaFluxCore = await ethers.getContractAt("AquaFluxCore", aquaFluxCoreAddress);

    // Split 50 AQ tokens into P and C tokens
    const splitAmount = "50";
    console.log(`\n🔧 Splitting ${splitAmount} AQ tokens...`);

    const tx = await AquaFluxCore.connect(user).split(
        assetId,
        ethers.parseEther(splitAmount)
    );
    console.log("   📤 Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Split in block:", receipt.blockNumber);

    // 保存 split 金额
    saveInteractionsData({
        splitAmount,
    });

    console.log("\n✅ Split successful!");
    console.log(`   ${splitAmount} AQ tokens → P tokens + C tokens (after fees)`);
    console.log("   P tokens: Principal tokens");
    console.log("   C tokens: Coupon tokens");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
