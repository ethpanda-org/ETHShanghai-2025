import { ethers } from "hardhat";
import { requireAddress } from "./utils";

async function main() {
    const [signer] = await ethers.getSigners();

    console.log("Setting global fee rates with account:", signer.address);

    // 从 addresses.json 读取地址
    const aquaFluxCoreAddress = requireAddress("AquaFluxCore");
    const timelockAddress = requireAddress("AquaFluxTimelock");

    console.log("\n📋 Using deployed contracts:");
    console.log("   AquaFluxCore:", aquaFluxCoreAddress);
    console.log("   AquaFluxTimelock:", timelockAddress);

    const AquaFluxCore = await ethers.getContractAt("AquaFluxCore", aquaFluxCoreAddress);
    const AquaFluxTimelock = await ethers.getContractAt("AquaFluxTimelock", timelockAddress);

    console.log("\n============================");
    console.log("Governance Context");
    console.log("============================");
    console.log("Signer:", signer.address);
    console.log("============================\n");

    // Helper function for fee rate governance
    async function setFeeRateViaGovernance(operation: string, feeRate: number) {
        console.log(`\n🚀 Setting feeRate for [${operation}] = ${feeRate} bps`);

        const calldata = AquaFluxCore.interface.encodeFunctionData("setGlobalFeeRate", [
            operation,
            feeRate,
        ]);
        console.log("   📌 Calldata:", calldata);

        const salt = ethers.randomBytes(32);
        console.log("   📌 Salt:", ethers.hexlify(salt));

        const predecessor = ethers.ZeroHash;

        // Schedule transaction via timelock
        const scheduleTx = await AquaFluxTimelock.connect(signer).scheduleWithAutomaticDelay(
            aquaFluxCoreAddress,
            0,
            calldata,
            predecessor,
            salt
        );
        console.log("   📤 Schedule tx:", scheduleTx.hash);
        const scheduleReceipt = await scheduleTx.wait();
        console.log("   ✅ Transaction scheduled at block:", scheduleReceipt.blockNumber);

        // Wait timelock delay (20 seconds on testnet)
        console.log("   ⏳ Waiting for timelock delay (20 seconds)...");
        await new Promise((resolve) => setTimeout(resolve, 21000)); // 20s + 1s buffer

        // Execute from timelock
        const execTx = await AquaFluxTimelock.connect(signer).execute(
            aquaFluxCoreAddress,
            0,
            calldata,
            predecessor,
            salt
        );
        console.log("   📤 Execute tx:", execTx.hash);
        const execReceipt = await execTx.wait();
        console.log("   ✅ Timelock executed at block:", execReceipt.blockNumber);

        // Verify
        const newRate = await AquaFluxCore.getGlobalFeeRate(operation);
        console.log(`   🎉 FeeRate [${operation}] updated to ${newRate} bps`);
    }

    // Set all fee rates through governance
    await setFeeRateViaGovernance("wrap", 25); // 0.25% wrap fee
    await setFeeRateViaGovernance("split", 15); // 0.15% split fee
    await setFeeRateViaGovernance("merge", 15); // 0.15% merge fee
    await setFeeRateViaGovernance("unwrap", 25); // 0.25% unwrap fee

    console.log("\n✅ All fee rates configured successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
