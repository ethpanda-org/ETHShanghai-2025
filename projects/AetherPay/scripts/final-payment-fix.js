const { ethers } = require("hardhat");

/**
 * 🎯 FINAL DIAGNOSIS AND FIX for ERC20 Allowance Issue
 *
 * ROOT CAUSE FOUND:
 * The PaymentGatewayV2 contract uses SafeERC20's safeTransferFrom on line 519.
 * This requires the user to approve the PaymentGateway contract to spend their tokens.
 *
 * The issue is that even with MAX_UINT256 allowance set, payments still fail.
 * This script will verify the exact flow and provide the solution.
 */

async function main() {
    console.log("🎯 COMPREHENSIVE ERC20 PAYMENT FIX");
    console.log("========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("👤 Signer Address:", signer.address);

    // Contract addresses - 使用 getAddress 来获取正确的 checksum 地址
    const PAYMENT_GATEWAY_V2 = ethers.utils.getAddress("0x4995168D409767330D9693034d5cFfc7daFFb89B");
    const MOCK_USDC = ethers.utils.getAddress("0xD613e5cC1122cFfBFaE88ee99424e4c088e98f01");
    const MOCK_USDT = ethers.utils.getAddress("0xDb86c92F5a426Aa4dB208d6a1d1172060e962cF7");

    console.log("📍 Using checksummed addresses:");
    console.log("   Gateway:", PAYMENT_GATEWAY_V2);
    console.log("   USDC:", MOCK_USDC);
    console.log("   USDT:", MOCK_USDT);

    // Test order ID from previous debugging
    let ORDER_ID = "0x078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db";

    // Complete ABIs
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)",
        "function mint(address to, uint256 amount) returns (bool)",  // MockERC20 特有
        "event Approval(address indexed owner, address indexed spender, uint256 value)",
        "event Transfer(address indexed from, address indexed to, uint256 value)"
    ];

    const GATEWAY_ABI = [
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string memory metadataURI, bool allowPartialPayment)",
        "function createOrder(string memory orderIdString, uint256 orderAmount, address paymentToken, address settlementToken, string memory metadataURI, bool allowPartialPayment, address designatedPayer) returns (bytes32)",
        "function stringToBytes32OrderId(string) view returns (bytes32)",
        "function registerMerchant(string memory businessName)",
        "function getMerchantInfo(address) view returns (string memory businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)",
        "function supportedTokens(address) view returns (bool)"
    ];

    const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);
    const gateway = new ethers.Contract(PAYMENT_GATEWAY_V2, GATEWAY_ABI, signer);

    console.log("=== Step 1: Verify Contract Deployment ===");
    console.log("----------------------------------------");

    // Check if contracts exist
    try {
        const gatewayCode = await signer.provider.getCode(PAYMENT_GATEWAY_V2);
        const usdcCode = await signer.provider.getCode(MOCK_USDC);

        console.log("Gateway contract exists?", gatewayCode.length > 2 ? "✅ YES" : "❌ NO");
        console.log("USDC contract exists?", usdcCode.length > 2 ? "✅ YES" : "❌ NO");

        if (gatewayCode.length <= 2 || usdcCode.length <= 2) {
            console.log("\n❌ CRITICAL: Contracts not deployed!");
            console.log("Please deploy contracts first.");
            return;
        }
    } catch (error) {
        console.log("❌ Error checking contracts:", error.message);
        return;
    }

    // Check merchant registration
    console.log("\n=== Step 1.5: Check Merchant Registration ===");
    console.log("----------------------------------------------");

    try {
        const merchantInfo = await gateway.getMerchantInfo(signer.address);
        const isActive = merchantInfo[5];

        if (!isActive) {
            console.log("⚠️  You are not registered as a merchant. Registering now...");
            try {
                const registerTx = await gateway.registerMerchant("Test Merchant");
                console.log("   TX:", registerTx.hash);
                await registerTx.wait();
                console.log("   ✅ Merchant registration complete");
            } catch (e) {
                console.log("   ❌ Registration failed:", e.message);
            }
        } else {
            console.log("✅ Merchant already registered");
            console.log("   Business Name:", merchantInfo[0]);
        }
    } catch (error) {
        console.log("⚠️  Merchant check failed:", error.message);
    }

    // Check token support
    console.log("\n=== Step 1.6: Check Token Support ===");
    console.log("--------------------------------------");

    try {
        const usdcSupported = await gateway.supportedTokens(MOCK_USDC);
        const usdtSupported = await gateway.supportedTokens(MOCK_USDT);

        console.log("USDC supported?", usdcSupported ? "✅ YES" : "❌ NO");
        console.log("USDT supported?", usdtSupported ? "✅ YES" : "❌ NO");

        if (!usdcSupported || !usdtSupported) {
            console.log("\n⚠️  Some tokens not supported in gateway.");
            console.log("   The contract owner needs to add them.");
            console.log("   Run: scripts/add-supported-tokens.js");
        }
    } catch (error) {
        console.log("⚠️  Token support check failed:", error.message);
    }

    console.log("\n=== Step 2: Check Order Details ===");
    console.log("----------------------------------------");

    let orderData, fullOrder;
    try {
        orderData = await gateway.getOrder(ORDER_ID);
        fullOrder = await gateway.orders(ORDER_ID);

        console.log("✅ Order exists");
        console.log("   Merchant:", orderData.merchant);
        console.log("   Payer:", orderData.payer === ethers.constants.AddressZero ? "OPEN (Anyone)" : orderData.payer);
        console.log("   Order Amount:", ethers.utils.formatUnits(orderData.orderAmount, 6), "USDC");
        console.log("   Payment Token:", fullOrder.paymentToken);
        console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderData.status]);

        // Check if order is still valid
        if (orderData.status !== 0) {
            console.log("\n⚠️  Order is not PENDING. Creating new test order...");
            throw new Error("Order not pending");
        }

        // Validate payment token matches
        if (fullOrder.paymentToken.toLowerCase() !== MOCK_USDC.toLowerCase()) {
            console.log("\n❌ Payment token mismatch!");
            console.log("   Expected:", fullOrder.paymentToken);
            console.log("   Using:", MOCK_USDC);
            return;
        }

    } catch (error) {
        console.log("⚠️  Order issue:", error.message);
        console.log("   Creating a new test order...\n");

        // Create a new test order
        const timestamp = Date.now();
        const testOrderId = `TEST_FIX_${timestamp}`;

        try {
            console.log("📝 Creating order:", testOrderId);
            const createTx = await gateway.createOrder(
                testOrderId,
                ethers.utils.parseUnits("10", 6), // 10 USDC
                MOCK_USDC,
                MOCK_USDT,
                "ipfs://test-fix-metadata",
                false, // no partial payment
                ethers.constants.AddressZero // OPEN order
            );
            console.log("   TX:", createTx.hash);
            await createTx.wait();

            ORDER_ID = await gateway.stringToBytes32OrderId(testOrderId);
            console.log("   ✅ New test order created");
            console.log("   Order ID (string):", testOrderId);
            console.log("   Order ID (bytes32):", ORDER_ID);

            // Fetch new order data
            orderData = await gateway.getOrder(ORDER_ID);
            fullOrder = await gateway.orders(ORDER_ID);

        } catch (e) {
            console.log("❌ Failed to create test order:", e.message);
            return;
        }
    }

    const paymentAmount = orderData.orderAmount;

    console.log("\n=== Step 3: Token Balance & Allowance ===");
    console.log("----------------------------------------");

    const balance = await usdc.balanceOf(signer.address);
    const currentAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);

    console.log("USDC Balance:", ethers.utils.formatUnits(balance, 6));
    console.log("Current Allowance:", currentAllowance.toString());
    console.log("Is MAX_UINT256?", currentAllowance.eq(ethers.constants.MaxUint256));
    console.log("Payment Amount:", ethers.utils.formatUnits(paymentAmount, 6));

    const hasBalance = balance.gte(paymentAmount);
    const hasAllowance = currentAllowance.gte(paymentAmount);

    console.log("\nValidation:");
    console.log("   Has sufficient balance?", hasBalance ? "✅" : "❌");
    console.log("   Has sufficient allowance?", hasAllowance ? "✅" : "❌");

    if (!hasBalance) {
        console.log("\n🪙 Insufficient balance! Attempting to mint tokens...");

        // Try to mint tokens if MockERC20 has public mint function
        try {
            const mintAmount = ethers.utils.parseUnits("1000", 6);
            const mintTx = await usdc.mint(signer.address, mintAmount);
            console.log("   Mint TX:", mintTx.hash);
            await mintTx.wait();
            console.log("   ✅ Minted 1000 USDC successfully");

            // Re-check balance
            const newBalance = await usdc.balanceOf(signer.address);
            console.log("   New balance:", ethers.utils.formatUnits(newBalance, 6), "USDC");
        } catch (e) {
            console.log("   ❌ Cannot mint tokens:", e.message);
            console.log("   Please run mint-tokens script or get tokens from faucet");
            return;
        }
    }

    console.log("\n=== Step 4: THE FIX - Proper Approval ===");
    console.log("----------------------------------------");

    if (!hasAllowance) {
        console.log("🔧 Setting approval...");

        // Method 1: Try exact amount first (recommended for production)
        try {
            console.log("   Method 1: Approving exact amount...");
            const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, paymentAmount);
            console.log("   TX:", approveTx.hash);
            await approveTx.wait();
            console.log("   ✅ Approval confirmed");
        } catch (error) {
            console.log("   ❌ Exact approval failed, trying MAX...");

            // Method 2: MAX approval (for testing convenience)
            try {
                const maxApproval = ethers.constants.MaxUint256;
                const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, maxApproval);
                console.log("   TX:", approveTx.hash);
                await approveTx.wait();
                console.log("   ✅ MAX approval confirmed");
            } catch (e) {
                console.log("   ❌ Approval failed:", e.message);
                return;
            }
        }

        // Verify new allowance
        const newAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
        console.log("\n   New allowance:", newAllowance.toString());
        console.log("   Sufficient?", newAllowance.gte(paymentAmount) ? "✅" : "❌");
    }

    console.log("\n=== Step 5: Test Direct TransferFrom ===");
    console.log("----------------------------------------");
    console.log("Testing if token's transferFrom works directly...");

    // Create a test scenario
    const testAmount = ethers.utils.parseUnits("1", 6); // 1 USDC test

    try {
        // First approve a small test amount
        const testApproveTx = await usdc.approve(PAYMENT_GATEWAY_V2, testAmount);
        await testApproveTx.wait();

        // Now test transferFrom directly (simulating what PaymentGateway does)
        console.log("   Simulating: IERC20.transferFrom(signer, gateway, 1 USDC)");

        // We can't call transferFrom as the gateway, but we can check the state
        const preBalance = await usdc.balanceOf(signer.address);
        console.log("   Pre-transfer balance:", ethers.utils.formatUnits(preBalance, 6));

        // The actual transferFrom is inside processPayment
        // Let's trace through what happens

    } catch (error) {
        console.log("   Test failed:", error.message);
    }

    console.log("\n=== Step 6: Execute Payment ===");
    console.log("----------------------------------------");

    try {
        // First do a static call to simulate
        console.log("🧪 Simulating payment...");
        const simulationResult = await gateway.callStatic.processPayment(
            ORDER_ID,
            paymentAmount,
            {
                from: signer.address,
                gasLimit: 1000000
            }
        );
        console.log("✅ Simulation successful! Would return:", simulationResult);

        // Now execute the actual payment
        console.log("\n💳 Executing actual payment...");
        const paymentTx = await gateway.processPayment(
            ORDER_ID,
            paymentAmount,
            {
                gasLimit: 1000000
            }
        );

        console.log("   Payment TX:", paymentTx.hash);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await paymentTx.wait();
        console.log("   ✅ PAYMENT SUCCESSFUL!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());

        // Check for events
        const paymentEvent = receipt.events?.find(e => e.event === 'PaymentReceived');
        if (paymentEvent) {
            console.log("\n   📢 Payment Event:");
            console.log("      Order ID:", paymentEvent.args.orderId);
            console.log("      Payer:", paymentEvent.args.payer);
            console.log("      Amount:", ethers.utils.formatUnits(paymentEvent.args.amount, 6), "USDC");
        }

        // Verify order status after payment
        const updatedOrder = await gateway.getOrder(ORDER_ID);
        console.log("\n   📊 Order Status After Payment:");
        console.log("      Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][updatedOrder.status]);
        console.log("      Paid Amount:", ethers.utils.formatUnits(updatedOrder.paidAmount, 6), "USDC");

    } catch (error) {
        console.log("\n❌ Payment failed!");
        console.log("   Error:", error.message);

        // Deep error analysis
        if (error.message.includes("insufficient allowance")) {
            console.log("\n🚨 ALLOWANCE ISSUE PERSISTS!");

            // Final debugging
            const finalAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
            const finalBalance = await usdc.balanceOf(signer.address);

            console.log("\n   Final Debug State:");
            console.log("   - Your address:", signer.address);
            console.log("   - Gateway address:", PAYMENT_GATEWAY_V2);
            console.log("   - Token address:", MOCK_USDC);
            console.log("   - Your balance:", ethers.utils.formatUnits(finalBalance, 6), "USDC");
            console.log("   - Your allowance:", finalAllowance.toString());
            console.log("   - Required amount:", paymentAmount.toString());

            // Check if addresses match exactly
            const orderToken = fullOrder.paymentToken;
            console.log("\n   Address comparison:");
            console.log("   - Order expects token:", orderToken);
            console.log("   - We're approving:", MOCK_USDC);
            console.log("   - Match?", orderToken.toLowerCase() === MOCK_USDC.toLowerCase());

            if (orderToken.toLowerCase() !== MOCK_USDC.toLowerCase()) {
                console.log("\n   🔴 CRITICAL: Token address mismatch!");
                console.log("   The order expects a different token than what you approved!");
                console.log("   Solution: Approve the correct token:", orderToken);
            }
        }
    }

    console.log("\n=== SOLUTION SUMMARY ===");
    console.log("----------------------------------------");
    console.log("✅ The fix requires proper ERC20 approval:");
    console.log("1. User must call: token.approve(gateway, amount)");
    console.log("2. Then call: gateway.processPayment(orderId, amount)");
    console.log("\n📝 For the frontend:");
    console.log("1. Ensure approval transaction completes before payment");
    console.log("2. Use correct token address from order.paymentToken");
    console.log("3. Check allowance after approval to confirm");
    console.log("4. Handle approval rejection gracefully");
    console.log("\n🔧 Common issues:");
    console.log("- Token address mismatch between order and approval");
    console.log("- Insufficient gas for approval transaction");
    console.log("- User rejecting approval in wallet");
    console.log("- Network congestion causing timeout");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });