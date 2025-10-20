const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🏪 Register Frontend Account as Merchant");
    console.log("========================================\n");

    // 前端账户地址
    const frontendAccount = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    console.log("📌 Target Account:", frontendAccount);
    console.log("📌 Gateway Contract:", gatewayAddress);

    // 获取签名者（需要使用前端账户的私钥）
    const [signer] = await ethers.getSigners();
    console.log("🔑 Signer Address:", signer.address);

    // 检查是否是正确的账户
    if (signer.address.toLowerCase() !== frontendAccount.toLowerCase()) {
        console.log("\n⚠️ WARNING: Signer address doesn't match target account!");
        console.log("   You need to use the private key of account:", frontendAccount);
        console.log("   Current signer:", signer.address);
        console.log("\n   Please update your .env file with the correct PRIVATE_KEY");
        console.log("   Or use Option A: Import the working account to MetaMask");
        return;
    }

    const GATEWAY_ABI = [
        "function registerMerchant(string businessName)",
        "function getMerchantInfo(address merchant) view returns (string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)"
    ];

    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);

    // 检查当前状态
    console.log("\n📋 Checking current merchant status...");
    try {
        const merchantInfo = await gatewayContract.getMerchantInfo(frontendAccount);
        if (merchantInfo.isActive) {
            console.log("✅ Already registered as merchant!");
            console.log("   Business name:", merchantInfo.businessName);
            console.log("   Total orders:", merchantInfo.totalOrders.toString());
            return;
        }
    } catch (error) {
        console.log("❌ Not registered as merchant");
    }

    // 注册为商家
    console.log("\n📝 Registering as merchant...");
    try {
        const tx = await gatewayContract.registerMerchant("Frontend Business");
        console.log("   Transaction sent:", tx.hash);
        console.log("   Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());

        // 验证注册成功
        const newMerchantInfo = await gatewayContract.getMerchantInfo(frontendAccount);
        if (newMerchantInfo.isActive) {
            console.log("\n🎉 SUCCESS! Account is now registered as merchant!");
            console.log("   Business name:", newMerchantInfo.businessName);
        }
    } catch (error) {
        console.log("❌ Registration failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });