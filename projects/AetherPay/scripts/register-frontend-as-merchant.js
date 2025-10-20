const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🏪 Registering Frontend Account as Merchant");
    console.log("============================================\n");

    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    // 注意：这个脚本使用的是.env中的私钥
    // 如果您想为前端账户注册，需要：
    // 1. 临时将前端账户的私钥放入.env
    // 2. 运行此脚本
    // 3. 恢复原来的私钥

    const [signer] = await ethers.getSigners();
    console.log("📱 Current signer:", signer.address);

    const frontendAccount = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

    if (signer.address.toLowerCase() !== frontendAccount.toLowerCase()) {
        console.log("⚠️  WARNING: Current signer is not the frontend account!");
        console.log("    To register the frontend account, you need to:");
        console.log("    1. Export the private key from MetaMask for:", frontendAccount);
        console.log("    2. Temporarily update PRIVATE_KEY in .env file");
        console.log("    3. Run this script again");
        console.log("    4. Restore the original PRIVATE_KEY in .env");
        console.log();
        console.log("💡 Alternatively, you can:");
        console.log("    - Use the current account (" + signer.address + ") in the frontend");
        console.log("    - Import the current account's private key into MetaMask");
        return;
    }

    const gateway = await ethers.getContractAt([
        "function registerMerchant(string)",
        "function getMerchantInfo(address) view returns (string,uint256,uint256,uint256,uint256,bool)"
    ], gatewayAddress);

    try {
        // 检查是否已注册
        const info = await gateway.getMerchantInfo(signer.address);
        if (info[5]) { // isActive
            console.log("✅ Account is already registered as merchant!");
            console.log("   Business name:", info[0]);
            console.log("   Total orders:", info[1].toString());
            return;
        }
    } catch (error) {
        // 未注册，继续
    }

    console.log("📝 Registering as merchant...");

    const tx = await gateway.registerMerchant("Frontend Test Store");
    console.log("   Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Successfully registered as merchant!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // 验证注册
    const info = await gateway.getMerchantInfo(signer.address);
    console.log("\n📊 Merchant Info:");
    console.log("   Business name:", info[0]);
    console.log("   Is active:", info[5]);

    console.log("\n✅ Frontend account can now create orders!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });