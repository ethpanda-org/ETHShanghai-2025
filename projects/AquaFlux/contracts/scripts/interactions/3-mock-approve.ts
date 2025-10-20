import { ethers } from "hardhat";
import { loadDeployedAddress, requireInteractionData } from "./utils";

async function main() {
    const [user] = await ethers.getSigners();

    console.log("Approving AquaFluxCore to use Mock RWA Tokens");
    console.log("User account:", user.address);

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

    const MockToken = await ethers.getContractAt("MockERC20", mockTokenData.address);

    // Approve AquaFluxCore to spend tokens
    const approveAmount = "10000"; // Approve 10,000 tokens
    console.log(`\n🔧 Approving ${approveAmount} ${mockTokenData.symbol} to AquaFluxCore...`);

    const tx = await MockToken.connect(user).approve(
        aquaFluxCoreAddress,
        ethers.parseEther(approveAmount)
    );
    console.log("   📤 Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Approved in block:", receipt.blockNumber);

    // 检查授权额度
    const allowance = await MockToken.allowance(user.address, aquaFluxCoreAddress);
    console.log(`\n🔍 Current allowance: ${ethers.formatEther(allowance)} ${mockTokenData.symbol}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
