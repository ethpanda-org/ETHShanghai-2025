const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔍 Checking Specific Order for Payment");
    console.log("========================================\n");

    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    // 测试一些可能的订单ID
    const orderIds = [
        "ORDER_001",  // 前端示例中的订单
        "APZNPBAGJ",  // 从检查结果中看到的实际订单
        "APWM1GBQ0",  // 另一个实际订单
    ];

    const gateway = await ethers.getContractAt([
        "function stringToBytes32OrderId(string) view returns (bytes32)",
        "function getOrderDetailsByString(string) view returns (bytes32,address,address,uint256,address,address,uint256,uint256,uint8,uint256,uint256,string)"
    ], gatewayAddress);

    for (const orderId of orderIds) {
        console.log(`\n📋 Checking order: ${orderId}`);
        console.log("=" .repeat(40));

        try {
            // 获取订单的bytes32 ID
            const orderIdBytes32 = await gateway.stringToBytes32OrderId(orderId);

            if (orderIdBytes32 === ethers.constants.HashZero) {
                console.log("   ❌ Order not found in contract");
                continue;
            }

            console.log("   ✅ Order exists!");
            console.log("   Bytes32 ID:", orderIdBytes32);

            // 获取订单详情
            const details = await gateway.getOrderDetailsByString(orderId);

            console.log("\n   📊 Order Details:");
            console.log("   Merchant:", details[1]);
            console.log("   Payer:", details[2] === ethers.constants.AddressZero ? "Anyone can pay" : details[2]);
            console.log("   Amount:", ethers.utils.formatUnits(details[3], 6), "tokens");
            console.log("   Payment Token:", details[4]);
            console.log("   Settlement Token:", details[5]);
            console.log("   Status:", ["Pending", "Paid", "Processing", "Completed", "Cancelled", "Expired"][details[8]]);

            const expiryTime = details[10];
            const now = Math.floor(Date.now() / 1000);
            if (expiryTime > 0 && now > expiryTime) {
                console.log("   ⚠️  ORDER EXPIRED!");
            }

            // 检查前端账户是否可以支付
            const frontendAccount = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
            const payer = details[2];

            if (payer !== ethers.constants.AddressZero && payer.toLowerCase() !== frontendAccount.toLowerCase()) {
                console.log(`   ⚠️  This order is designated for ${payer}`);
                console.log(`      Frontend account ${frontendAccount} cannot pay!`);
            } else {
                console.log(`   ✅ Frontend account ${frontendAccount} CAN pay this order`);
            }

        } catch (error) {
            console.log("   ❌ Error:", error.message);
        }
    }

    console.log("\n\n💡 SOLUTION:");
    console.log("=============");
    console.log("1. To pay an existing order, use one of these order IDs:");
    console.log("   - APZNPBAGJ (4.0 USDC)");
    console.log("   - APWM1GBQ0 (10.0 USDC)");
    console.log("   - AP0A962GZ (20.0 USDC)");
    console.log("\n2. Access the payment page:");
    console.log("   http://localhost:3000/pay/APZNPBAGJ");
    console.log("\n3. Or create a new order first (as merchant), then pay it (as user)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });