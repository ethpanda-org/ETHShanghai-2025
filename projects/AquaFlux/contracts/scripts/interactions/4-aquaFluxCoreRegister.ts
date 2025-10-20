import { ethers } from "hardhat";
import dayjs from "dayjs";
import { loadDeployedAddress, requireInteractionData, saveInteractionsData } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Registering RWA asset with account:", deployer.address);

    // 从 deploy/addresses.json 读取 AquaFluxCore 地址
    const aquaFluxCoreAddress = loadDeployedAddress("AquaFluxCore");

    // 从 interactions.json 读取 MockToken 地址
    const mockTokenData = requireInteractionData(
        "mockToken",
        "Please run 1-deployRWAMockERC20.ts first"
    );

    console.log("\n📋 Contract addresses:");
    console.log("   MockToken:", mockTokenData.address);
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);

    const AquaFluxCore = await ethers.getContractAt("AquaFluxCore", aquaFluxCoreAddress);

    // Register asset parameters
    const maturity = dayjs().add(30, "days").unix(); // 30 days from now
    const operationDeadline = dayjs().add(29, "days").unix(); // 1 day before maturity

    console.log("\n🔧 Asset parameters:");
    console.log("   Maturity:", dayjs.unix(maturity).format("YYYY-MM-DD HH:mm:ss"));
    console.log("   Operation Deadline:", dayjs.unix(operationDeadline).format("YYYY-MM-DD HH:mm:ss"));
    console.log("   Coupon Rate: 1200 bps (12%)");
    console.log("   C Token Ratio: 8000 bps (80%)");
    console.log("   S Token Ratio: 2000 bps (20%)");
    console.log("   Fee to S Ratio: 5000 bps (50%)");
    console.log("   Symbol: CMP");

    const tx = await AquaFluxCore.register(
        mockTokenData.address,
        maturity,
        operationDeadline,
        1200, // 12% coupon rate
        8000, // 80% to C token
        2000, // 20% to S token
        5000, // 50% fee allocation to S token
        "CMP",
        "https://metadata.example.com/CMP"
    );

    console.log("\n   📤 Tx hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ Registered in block:", receipt.blockNumber);

    // 从事件中获取 assetId
    const event = receipt.logs.find((log: any) => {
        try {
            return AquaFluxCore.interface.parseLog(log)?.name === "AssetRegistered";
        } catch (e) {
            return false;
        }
    });

    if (!event) {
        throw new Error("AssetRegistered event not found");
    }

    const parsedEvent = AquaFluxCore.interface.parseLog(event);
    const assetId = parsedEvent?.args.assetId;

    console.log("\n✅ Asset registered successfully!");
    console.log("   Asset ID:", assetId);

    // 保存 assetId 到 interactions.json
    saveInteractionsData({
        assetId,
        registeredAt: new Date().toISOString(),
    });

    console.log("\n📝 Asset ID saved to interactions.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
