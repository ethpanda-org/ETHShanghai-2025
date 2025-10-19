const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔍 Complete Payment Diagnosis & Fix");
    console.log("=====================================\n");

    // 关键地址
    const frontendAccount = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B"; // 正确的网关地址
    const usdcAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
    const usdtAddress = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

    // 获取合约实例
    const usdc = await ethers.getContractAt("ERC20", usdcAddress);
    const gateway = await ethers.getContractAt([
        "function supportedTokens(address) view returns (bool)",
        "function merchants(address) view returns (address wallet, string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive, uint256 registeredAt)",
        "function stringToBytes32OrderId(string) view returns (bytes32)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string metadataURI, bool allowPartialPayment)"
    ], gatewayAddress);

    console.log("📍 Addresses:");
    console.log("   Frontend Account:", frontendAccount);
    console.log("   Gateway Contract:", gatewayAddress);
    console.log("   USDC Token:", usdcAddress);
    console.log("   USDT Token:", usdtAddress);
    console.log();

    // 1. 检查前端账户余额和授权
    console.log("1️⃣ Checking Frontend Account Status:");
    console.log("======================================");

    const balance = await usdc.balanceOf(frontendAccount);
    console.log("   USDC Balance:", ethers.utils.formatUnits(balance, 6), "USDC");

    const allowance = await usdc.allowance(frontendAccount, gatewayAddress);
    console.log("   Current Allowance:",
        allowance.gt(ethers.constants.MaxUint256.div(2))
            ? "UNLIMITED"
            : ethers.utils.formatUnits(allowance, 6) + " USDC"
    );
    console.log("   Raw Allowance:", allowance.toString());
    console.log();

    // 2. 检查网关合约状态
    console.log("2️⃣ Checking Gateway Contract:");
    console.log("================================");

    const usdcSupported = await gateway.supportedTokens(usdcAddress);
    const usdtSupported = await gateway.supportedTokens(usdtAddress);

    console.log("   USDC Supported:", usdcSupported ? "✅ Yes" : "❌ No");
    console.log("   USDT Supported:", usdtSupported ? "✅ Yes" : "❌ No");
    console.log();

    // 3. 检查订单状态
    console.log("3️⃣ Checking Order Status:");
    console.log("===========================");

    const orderIdString = "ORDER_001"; // 测试订单ID
    try {
        const orderIdBytes32 = await gateway.stringToBytes32OrderId(orderIdString);

        if (orderIdBytes32 === ethers.constants.HashZero) {
            console.log("   ❌ Order not found:", orderIdString);
        } else {
            console.log("   Order ID (string):", orderIdString);
            console.log("   Order ID (bytes32):", orderIdBytes32);

            const order = await gateway.orders(orderIdBytes32);
            console.log("   Merchant:", order.merchant);
            console.log("   Order Amount:", ethers.utils.formatUnits(order.orderAmount, 6), "tokens");
            console.log("   Payment Token:", order.paymentToken);
            console.log("   Settlement Token:", order.settlementToken);
            console.log("   Status:", ["Pending", "Paid", "Processing", "Completed", "Cancelled", "Expired"][order.status]);
            console.log("   Payer:", order.payer === ethers.constants.AddressZero ? "Open (anyone can pay)" : order.payer);
        }
    } catch (error) {
        console.log("   ⚠️ Error checking order:", error.message);
    }
    console.log();

    // 4. 诊断问题
    console.log("4️⃣ Problem Diagnosis:");
    console.log("======================");

    let problems = [];
    let solutions = [];

    // 检查余额
    if (balance.lt(ethers.utils.parseUnits("10", 6))) {
        problems.push("❌ Insufficient USDC balance");
        solutions.push("Mint more USDC tokens");
    }

    // 检查授权
    if (allowance.lt(ethers.utils.parseUnits("10", 6))) {
        problems.push("❌ Insufficient allowance for gateway");
        solutions.push("Approve the gateway contract");
    }

    // 检查代币支持
    if (!usdcSupported || !usdtSupported) {
        problems.push("❌ Some tokens not supported in gateway");
        solutions.push("Add token support to gateway");
    }

    if (problems.length === 0) {
        console.log("   ✅ No problems detected!");
        console.log("   The account should be able to make payments.");
    } else {
        console.log("   Problems found:");
        problems.forEach(p => console.log("   " + p));
        console.log();
        console.log("   Recommended solutions:");
        solutions.forEach(s => console.log("   • " + s));
    }
    console.log();

    // 5. 自动修复选项
    console.log("5️⃣ Auto-Fix Options:");
    console.log("=====================");

    // 修复授权问题
    if (allowance.lt(ethers.utils.parseUnits("10", 6))) {
        console.log("   🔧 Fixing allowance issue...");
        console.log("   Note: This requires the frontend account's private key.");
        console.log("   Run this command with the frontend account:");
        console.log(`   npx hardhat run scripts/fix-allowance-for-user.js --network op-sepolia`);
    }

    // 检查是否需要添加代币支持
    if (!usdcSupported || !usdtSupported) {
        console.log("   🔧 Fixing token support...");
        console.log("   Run: npx hardhat run scripts/add-supported-tokens.js --network op-sepolia");
    }

    console.log();
    console.log("✅ Diagnosis complete!");

    // 6. 最终建议
    console.log("\n📋 FINAL RECOMMENDATIONS:");
    console.log("==========================");
    console.log("1. Make sure the frontend is using address:", gatewayAddress);
    console.log("2. Verify the frontend account has sufficient balance and allowance");
    console.log("3. Ensure orders are created on the same gateway contract");
    console.log("4. Check that payment amount matches order amount exactly");
    console.log("5. For USDC/USDT, use parseUnits(amount, 6) not parseUnits(amount, 18)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });