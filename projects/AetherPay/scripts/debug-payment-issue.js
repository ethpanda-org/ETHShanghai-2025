const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Payment Issue");

    // 从交易数据解析订单ID
    const txData = "0x571376de078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db0000000000000000000000000000000000000000000000000000000001312d00";

    // 解析函数选择器和参数
    const functionSelector = txData.slice(0, 10); // 0x571376de
    const orderId = "0x" + txData.slice(10, 74); // 订单ID (bytes32)
    const paymentAmount = "0x" + txData.slice(74, 138); // 支付金额 (uint256)

    console.log("Function Selector:", functionSelector);
    console.log("Order ID:", orderId);
    console.log("Payment Amount:", ethers.BigNumber.from(paymentAmount).toString());

    // 连接到合约
    const paymentGatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    // PaymentGatewayV2 ABI
    const abi = [
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orderIdStrings(bytes32) view returns (string)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)"
    ];

    const [signer] = await ethers.getSigners();
    console.log("\n📱 Current Signer Address:", signer.address);

    const gateway = new ethers.Contract(paymentGatewayAddress, abi, signer);

    try {
        // 获取订单详情
        console.log("\n📋 Fetching Order Details...");
        const order = await gateway.getOrder(orderId);

        console.log("\n🏪 Merchant:", order.merchant);
        console.log("👤 Designated Payer:", order.payer);
        console.log("💰 Order Amount:", ethers.utils.formatUnits(order.orderAmount, 6), "USDC");
        console.log("💸 Paid Amount:", ethers.utils.formatUnits(order.paidAmount, 6), "USDC");
        console.log("📊 Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][order.status]);
        console.log("⏰ Created At:", new Date(order.createdAt.toNumber() * 1000).toISOString());
        console.log("⌛ Expiry Time:", new Date(order.expiryTime.toNumber() * 1000).toISOString());

        // 获取订单ID字符串
        try {
            const orderIdString = await gateway.orderIdStrings(orderId);
            console.log("🆔 Order ID String:", orderIdString);
        } catch (e) {
            console.log("🆔 Order ID String: Unable to fetch");
        }

        // 检查问题
        console.log("\n🔴 Issue Analysis:");

        // 检查是否是地址0（公开订单）
        if (order.payer === ethers.constants.AddressZero) {
            console.log("✅ This is an OPEN order (anyone can pay)");
        } else {
            console.log("⚠️  This is a DESIGNATED order");
            console.log("   Only this address can pay:", order.payer);

            // 比较当前签名者和指定支付者
            if (order.payer.toLowerCase() !== signer.address.toLowerCase()) {
                console.log("\n❌ PROBLEM FOUND!");
                console.log("   Your address:", signer.address);
                console.log("   Required payer:", order.payer);
                console.log("   These addresses DO NOT match!");
                console.log("\n💡 Solution Options:");
                console.log("   1. Use the correct wallet that matches the designated payer");
                console.log("   2. Create a new order without designatedPayer (set to address(0))");
                console.log("   3. Create a new order with your current address as designatedPayer");
            } else {
                console.log("✅ Your address matches the designated payer");
            }
        }

        // 检查订单状态
        if (order.status !== 0) {
            console.log("\n⚠️  Order is not in PENDING status");
            console.log("   Current status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][order.status]);
        }

        // 检查过期时间
        const now = Math.floor(Date.now() / 1000);
        if (now > order.expiryTime.toNumber()) {
            console.log("\n⚠️  Order has expired");
            console.log("   Expired at:", new Date(order.expiryTime.toNumber() * 1000).toISOString());
        }

    } catch (error) {
        console.error("\n❌ Error fetching order:", error.message);
        if (error.message.includes("Order not found")) {
            console.log("The order ID does not exist in the contract");
        }
    }

    // 显示如何修复
    console.log("\n📝 How to Fix:");
    console.log("1. If creating orders programmatically, ensure designatedPayer is set correctly:");
    console.log("   - Use address(0) for open orders");
    console.log("   - Use the buyer's address for designated orders");
    console.log("\n2. Example for creating an open order:");
    console.log(`   await gateway.createOrder(
      orderIdString,
      orderAmount,
      paymentToken,
      settlementToken,
      metadataURI,
      false, // allowPartialPayment
      "0x0000000000000000000000000000000000000000" // Open order (anyone can pay)
   )`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });