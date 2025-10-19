const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🧪 Direct Payment Test");
    console.log("=======================\n");

    // 配置
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const usdcAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

    // 获取签名者（使用.env中的私钥）
    const [signer] = await ethers.getSigners();
    console.log("📱 Testing with account:", signer.address);

    // 获取合约实例
    const gateway = await ethers.getContractAt([
        "function createOrder(string,uint256,address,address,string,bool,address) returns (bytes32)",
        "function processPayment(bytes32,uint256) returns (bool)",
        "function stringToBytes32OrderId(string) view returns (bytes32)",
        "function getOrderDetailsByString(string) view returns (bytes32,address,address,uint256,address,address,uint256,uint256,uint8,uint256,uint256,string)",
        "function registerMerchant(string)"
    ], gatewayAddress);

    const usdc = await ethers.getContractAt([
        "function approve(address,uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
        "function mint(address,uint256)"
    ], usdcAddress);

    try {
        // 1. 检查商家状态
        console.log("1️⃣ Checking merchant status...");
        try {
            // 尝试注册商家（如果已注册会失败，但没关系）
            const tx = await gateway.registerMerchant("Test Merchant");
            await tx.wait();
            console.log("   ✅ Registered as merchant");
        } catch (error) {
            console.log("   ℹ️ Already registered or registration failed");
        }

        // 2. 铸造代币（如果需要）
        console.log("\n2️⃣ Checking token balance...");
        const balance = await usdc.balanceOf(signer.address);
        console.log("   Current balance:", ethers.utils.formatUnits(balance, 6), "USDC");

        if (balance.lt(ethers.utils.parseUnits("100", 6))) {
            console.log("   🪙 Minting 1000 USDC...");
            try {
                const mintTx = await usdc.mint(signer.address, ethers.utils.parseUnits("1000", 6));
                await mintTx.wait();
                console.log("   ✅ Minted 1000 USDC");
            } catch (error) {
                console.log("   ⚠️ Minting failed (might not have permission)");
            }
        }

        // 3. 创建订单
        console.log("\n3️⃣ Creating test order...");
        const orderIdString = "TEST_" + Date.now();
        const orderAmount = ethers.utils.parseUnits("10", 6); // 10 USDC

        const createTx = await gateway.createOrder(
            orderIdString,
            orderAmount,
            usdcAddress,  // payment token
            usdcAddress,  // settlement token (same to avoid swap)
            "",           // no metadata
            false,        // no partial payment
            ethers.constants.AddressZero  // open order (anyone can pay)
        );

        const receipt = await createTx.wait();
        console.log("   ✅ Order created:", orderIdString);
        console.log("   Transaction:", receipt.transactionHash);

        // 4. 获取订单ID
        const orderIdBytes32 = await gateway.stringToBytes32OrderId(orderIdString);
        console.log("   Order ID (bytes32):", orderIdBytes32);

        // 5. 授权网关
        console.log("\n4️⃣ Approving gateway...");
        const currentAllowance = await usdc.allowance(signer.address, gatewayAddress);

        if (currentAllowance.lt(orderAmount)) {
            const approveTx = await usdc.approve(gatewayAddress, ethers.constants.MaxUint256);
            await approveTx.wait();
            console.log("   ✅ Gateway approved for unlimited USDC");
        } else {
            console.log("   ✅ Gateway already has sufficient allowance");
        }

        // 6. 等待一会儿确保链上状态更新
        console.log("\n⏳ Waiting for chain state to update...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 7. 支付订单
        console.log("\n5️⃣ Processing payment...");
        console.log("   Order ID:", orderIdString);
        console.log("   Amount:", ethers.utils.formatUnits(orderAmount, 6), "USDC");

        const payTx = await gateway.processPayment(orderIdBytes32, orderAmount);
        const payReceipt = await payTx.wait();

        console.log("   ✅ Payment successful!");
        console.log("   Transaction:", payReceipt.transactionHash);
        console.log("   Gas used:", payReceipt.gasUsed.toString());

        // 8. 验证订单状态
        console.log("\n6️⃣ Verifying order status...");
        const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
        const status = orderDetails[8]; // status field
        const statusText = ["Pending", "Paid", "Processing", "Completed", "Cancelled", "Expired"][status];
        console.log("   Order status:", statusText);
        console.log("   Paid amount:", ethers.utils.formatUnits(orderDetails[6], 6), "USDC");

    } catch (error) {
        console.error("\n❌ Error:", error.message);

        // 详细错误分析
        if (error.message.includes("insufficient allowance")) {
            console.log("\n💡 Solution: The account needs to approve the gateway contract first");
        } else if (error.message.includes("Not an active merchant")) {
            console.log("\n💡 Solution: The account needs to register as a merchant first");
        } else if (error.message.includes("Order not found")) {
            console.log("\n💡 Solution: The order doesn't exist on this gateway contract");
        } else if (error.message.includes("insufficient balance")) {
            console.log("\n💡 Solution: The account needs more USDC tokens");
        }

        console.log("\n📋 Debug info:");
        console.log("   Account:", signer.address);
        console.log("   Gateway:", gatewayAddress);
        console.log("   USDC:", usdcAddress);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });