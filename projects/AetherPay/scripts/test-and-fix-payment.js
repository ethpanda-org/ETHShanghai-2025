const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Order Details and Creating Test Order");

    const [signer] = await ethers.getSigners();
    console.log("📱 Current Signer Address:", signer.address);

    // 从失败的交易数据中提取订单ID
    const failedOrderId = "0x078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db";

    // 合约地址
    const paymentGatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    // PaymentGatewayV2 ABI
    const abi = [
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orderIdStrings(bytes32) view returns (string)",
        "function stringToBytes32OrderId(string) view returns (bytes32)",
        "function createOrder(string memory orderIdString, uint256 orderAmount, address paymentToken, address settlementToken, string memory metadataURI, bool allowPartialPayment, address designatedPayer) returns (bytes32)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getMerchantInfo(address) view returns (string memory businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)",
        "function registerMerchant(string memory businessName)",
        "function supportedTokens(address) view returns (bool)"
    ];

    const gateway = new ethers.Contract(paymentGatewayAddress, abi, signer);

    console.log("\n=== 1. Checking Failed Order ===");
    try {
        const order = await gateway.getOrder(failedOrderId);
        console.log("📋 Failed Order Details:");
        console.log("   Merchant:", order.merchant);
        console.log("   Designated Payer:", order.payer);
        console.log("   Order Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][order.status]);

        if (order.payer !== ethers.constants.AddressZero) {
            console.log("\n❌ ISSUE FOUND:");
            console.log("   This is a DESIGNATED order - only", order.payer, "can pay");
            console.log("   Your address is:", signer.address);

            if (order.payer.toLowerCase() !== signer.address.toLowerCase()) {
                console.log("   ⚠️  ADDRESSES DO NOT MATCH - this is why payment fails!");
            }
        }
    } catch (error) {
        console.log("   ❌ Could not fetch order (might not exist)");
    }

    console.log("\n=== 2. Checking Merchant Status ===");
    try {
        const merchantInfo = await gateway.getMerchantInfo(signer.address);
        if (merchantInfo.isActive) {
            console.log("✅ You are registered as an active merchant");
            console.log("   Business Name:", merchantInfo.businessName);
            console.log("   Total Orders:", merchantInfo.totalOrders.toString());
        } else {
            console.log("⚠️  You are not registered as a merchant");
            console.log("   Registering as merchant...");
            try {
                const tx = await gateway.registerMerchant("Test Merchant");
                await tx.wait();
                console.log("   ✅ Merchant registration successful!");
            } catch (e) {
                console.log("   ❌ Merchant registration failed:", e.message);
            }
        }
    } catch (error) {
        console.log("   Merchant check error:", error.message);
    }

    console.log("\n=== 3. Creating New Test Orders ===");

    // Token addresses for testing
    const USDC_ADDRESS = "0xD613e5cC1122cFfBFaE88ee99424e4c088e98f01";
    const USDT_ADDRESS = "0xDb86c92F5a426Aa4dB208d6a1d1172060e962cF7";

    // Check if tokens are supported
    const usdcSupported = await gateway.supportedTokens(USDC_ADDRESS);
    const usdtSupported = await gateway.supportedTokens(USDT_ADDRESS);

    console.log("USDC Supported:", usdcSupported);
    console.log("USDT Supported:", usdtSupported);

    if (!usdcSupported || !usdtSupported) {
        console.log("\n⚠️  Tokens not supported in gateway. Add them first with add-supported-tokens script.");
        return;
    }

    // Generate unique order IDs
    const timestamp = Date.now();
    const orderIdOpen = `TEST_OPEN_${timestamp}`;
    const orderIdDesignated = `TEST_DESIGNATED_${timestamp}`;

    try {
        // Create OPEN order (anyone can pay)
        console.log("\n📝 Creating OPEN order (anyone can pay)...");
        const tx1 = await gateway.createOrder(
            orderIdOpen,
            ethers.utils.parseUnits("10", 6), // 10 USDC
            USDC_ADDRESS,
            USDT_ADDRESS,
            "ipfs://test-metadata-open",
            false, // allowPartialPayment
            ethers.constants.AddressZero // OPEN order - anyone can pay
        );
        await tx1.wait();

        const openOrderBytes32 = await gateway.stringToBytes32OrderId(orderIdOpen);
        console.log("✅ Open Order Created!");
        console.log("   Order ID String:", orderIdOpen);
        console.log("   Order ID Bytes32:", openOrderBytes32);
        console.log("   Anyone can pay this order");

        // Create DESIGNATED order (only current signer can pay)
        console.log("\n📝 Creating DESIGNATED order (only you can pay)...");
        const tx2 = await gateway.createOrder(
            orderIdDesignated,
            ethers.utils.parseUnits("10", 6), // 10 USDC
            USDC_ADDRESS,
            USDT_ADDRESS,
            "ipfs://test-metadata-designated",
            false, // allowPartialPayment
            signer.address // DESIGNATED order - only signer can pay
        );
        await tx2.wait();

        const designatedOrderBytes32 = await gateway.stringToBytes32OrderId(orderIdDesignated);
        console.log("✅ Designated Order Created!");
        console.log("   Order ID String:", orderIdDesignated);
        console.log("   Order ID Bytes32:", designatedOrderBytes32);
        console.log("   Only you can pay this order:", signer.address);

        console.log("\n=== 4. Testing Payment ===");

        // Get token contract for approval
        const usdcAbi = [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ];
        const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);

        // Check balance
        const balance = await usdc.balanceOf(signer.address);
        console.log("Your USDC Balance:", ethers.utils.formatUnits(balance, 6));

        if (balance.gte(ethers.utils.parseUnits("10", 6))) {
            // Approve gateway
            console.log("\n🔓 Approving USDC...");
            const approveTx = await usdc.approve(paymentGatewayAddress, ethers.utils.parseUnits("20", 6));
            await approveTx.wait();
            console.log("✅ Approval successful");

            // Try to pay the designated order
            console.log("\n💳 Attempting to pay DESIGNATED order...");
            try {
                const payTx = await gateway.processPayment(
                    designatedOrderBytes32,
                    ethers.utils.parseUnits("10", 6)
                );
                await payTx.wait();
                console.log("✅ Payment successful for designated order!");
            } catch (error) {
                console.log("❌ Payment failed:", error.message);
            }

            // Try to pay the open order
            console.log("\n💳 Attempting to pay OPEN order...");
            try {
                const payTx = await gateway.processPayment(
                    openOrderBytes32,
                    ethers.utils.parseUnits("10", 6)
                );
                await payTx.wait();
                console.log("✅ Payment successful for open order!");
            } catch (error) {
                console.log("❌ Payment failed:", error.message);
            }

        } else {
            console.log("\n⚠️  Insufficient USDC balance. Need at least 10 USDC to test payments.");
            console.log("   Run the mint-tokens script first to get test tokens.");
        }

    } catch (error) {
        console.error("\n❌ Error creating orders:", error.message);
    }

    console.log("\n=== SOLUTION SUMMARY ===");
    console.log("The issue is that the order has a designated payer set.");
    console.log("\n📌 To fix this:");
    console.log("1. When creating orders for public payment, set designatedPayer to address(0)");
    console.log("2. When creating orders for specific buyers, set designatedPayer to their address");
    console.log("3. Make sure the paying wallet matches the designatedPayer if it's set");
    console.log("\nExample for creating an open order:");
    console.log('await gateway.createOrder(orderId, amount, token1, token2, "ipfs://", false, "0x0000000000000000000000000000000000000000")');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });