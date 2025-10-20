const { ethers } = require("hardhat");

/**
 * 🔧 Comprehensive Fix for ERC20 Allowance Issue
 *
 * This script diagnoses and fixes the "ERC20: insufficient allowance" error
 * that's preventing payments in the AetherPay system.
 *
 * Based on best practices from 2024:
 * - Uses approve-to-zero-then-set pattern for safety
 * - Implements proper two-step approve/transfer process
 * - Includes comprehensive debugging and validation
 */

async function main() {
    console.log("🔧 ERC20 Allowance Fix Script");
    console.log("========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("👤 Your Address:", signer.address);

    // Contract addresses
    const PAYMENT_GATEWAY = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const USDC_ADDRESS = "0xD613e5cC1122cFfBFaE88ee99424e4c088e98f01";
    const USDT_ADDRESS = "0xDb86c92F5a426Aa4dB208d6a1d1172060e962cF7";

    // Test order from previous debugging
    const TEST_ORDER_ID = "0x078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db";
    const PAYMENT_AMOUNT = ethers.utils.parseUnits("20", 6); // 20 USDC

    // ABIs
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)"
    ];

    const GATEWAY_ABI = [
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string memory metadataURI, bool allowPartialPayment)"
    ];

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const gateway = new ethers.Contract(PAYMENT_GATEWAY, GATEWAY_ABI, signer);

    console.log("=== Step 1: Diagnosis ===");
    console.log("----------------------------------------");

    // 1. Check token balance
    const balance = await usdc.balanceOf(signer.address);
    console.log("📊 USDC Balance:", ethers.utils.formatUnits(balance, 6), "USDC");

    if (balance.lt(PAYMENT_AMOUNT)) {
        console.log("❌ INSUFFICIENT BALANCE!");
        console.log("   You need at least", ethers.utils.formatUnits(PAYMENT_AMOUNT, 6), "USDC");
        console.log("   Please run the mint-tokens script first.");
        return;
    }
    console.log("✅ Balance sufficient for payment\n");

    // 2. Check current allowance
    const currentAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY);
    console.log("🔍 Current Allowance Check:");
    console.log("   Raw value:", currentAllowance.toString());
    console.log("   Formatted:", ethers.utils.formatUnits(currentAllowance, 6), "USDC");
    console.log("   Is MAX_UINT256?", currentAllowance.eq(ethers.constants.MaxUint256));
    console.log("   Sufficient for payment?", currentAllowance.gte(PAYMENT_AMOUNT));

    // 3. Analyze the problem
    console.log("\n📋 Problem Analysis:");
    if (currentAllowance.eq(0)) {
        console.log("❌ NO ALLOWANCE SET - This is the root cause!");
        console.log("   Solution: Need to approve the Payment Gateway to spend your USDC");
    } else if (currentAllowance.lt(PAYMENT_AMOUNT)) {
        console.log("⚠️  INSUFFICIENT ALLOWANCE");
        console.log("   Current:", ethers.utils.formatUnits(currentAllowance, 6));
        console.log("   Required:", ethers.utils.formatUnits(PAYMENT_AMOUNT, 6));
        console.log("   Solution: Need to increase allowance");
    } else {
        console.log("✅ Allowance looks sufficient");
        console.log("   If payment still fails, the issue might be:");
        console.log("   - Contract bug in transferFrom implementation");
        console.log("   - Order validation issues");
        console.log("   - Gas estimation problems");
    }

    // 4. Check order details
    console.log("\n=== Step 2: Order Validation ===");
    console.log("----------------------------------------");

    try {
        const fullOrder = await gateway.orders(TEST_ORDER_ID);
        const orderDetails = await gateway.getOrder(TEST_ORDER_ID);

        console.log("📦 Order Found!");
        console.log("   Merchant:", orderDetails.merchant);
        console.log("   Payer:", orderDetails.payer === ethers.constants.AddressZero ? "OPEN (Anyone)" : orderDetails.payer);
        console.log("   Payment Token:", fullOrder.paymentToken);
        console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderDetails.status]);

        // Validate token match
        if (fullOrder.paymentToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
            console.log("❌ TOKEN MISMATCH!");
            console.log("   Order expects:", fullOrder.paymentToken);
            console.log("   We're using:", USDC_ADDRESS);
            return;
        }

        // Validate payer
        if (orderDetails.payer !== ethers.constants.AddressZero &&
            orderDetails.payer.toLowerCase() !== signer.address.toLowerCase()) {
            console.log("❌ PAYER MISMATCH!");
            console.log("   Order restricted to:", orderDetails.payer);
            console.log("   Your address:", signer.address);
            return;
        }

    } catch (error) {
        console.log("❌ Failed to fetch order:", error.message);
        return;
    }

    console.log("\n=== Step 3: Fix Implementation ===");
    console.log("----------------------------------------");
    console.log("🔧 Implementing best practices from 2024:");
    console.log("   1. Approve-to-zero-then-set pattern");
    console.log("   2. Minimal approval (exact amount needed)");
    console.log("   3. Two-step process with verification\n");

    // Fix Strategy Decision
    let approvalNeeded = false;
    let approvalAmount = PAYMENT_AMOUNT;

    if (currentAllowance.lt(PAYMENT_AMOUNT)) {
        approvalNeeded = true;

        // Best practice: For production, use exact amount
        // For testing, we'll use a slightly higher amount to avoid repeated approvals
        const testBuffer = ethers.utils.parseUnits("100", 6); // 100 USDC buffer for testing
        approvalAmount = PAYMENT_AMOUNT.add(testBuffer);

        console.log("📝 Approval Strategy:");
        console.log("   Current allowance:", ethers.utils.formatUnits(currentAllowance, 6), "USDC");
        console.log("   Payment amount:", ethers.utils.formatUnits(PAYMENT_AMOUNT, 6), "USDC");
        console.log("   Will approve:", ethers.utils.formatUnits(approvalAmount, 6), "USDC (includes buffer)");
    }

    if (approvalNeeded) {
        try {
            // Step 1: Reset to zero if current allowance is not zero (best practice)
            if (!currentAllowance.eq(0)) {
                console.log("\n🔄 Step 3.1: Resetting allowance to zero (best practice)...");
                const resetTx = await usdc.approve(PAYMENT_GATEWAY, 0);
                console.log("   Reset TX:", resetTx.hash);
                const resetReceipt = await resetTx.wait();
                console.log("   ✅ Reset confirmed in block", resetReceipt.blockNumber);
            }

            // Step 2: Set new allowance
            console.log("\n🔓 Step 3.2: Setting new allowance...");
            console.log("   Approving:", ethers.utils.formatUnits(approvalAmount, 6), "USDC");

            const approveTx = await usdc.approve(PAYMENT_GATEWAY, approvalAmount);
            console.log("   Approve TX:", approveTx.hash);

            console.log("   ⏳ Waiting for confirmation...");
            const approveReceipt = await approveTx.wait();
            console.log("   ✅ Approval confirmed in block", approveReceipt.blockNumber);

            // Verify the approval event
            const approvalEvent = approveReceipt.events?.find(e => e.event === 'Approval');
            if (approvalEvent) {
                console.log("   📢 Approval Event Detected:");
                console.log("      Owner:", approvalEvent.args[0]);
                console.log("      Spender:", approvalEvent.args[1]);
                console.log("      Amount:", ethers.utils.formatUnits(approvalEvent.args[2], 6), "USDC");
            }

            // Step 3: Verify new allowance
            console.log("\n🔍 Step 3.3: Verifying new allowance...");
            const newAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY);
            console.log("   New allowance:", ethers.utils.formatUnits(newAllowance, 6), "USDC");

            if (newAllowance.gte(PAYMENT_AMOUNT)) {
                console.log("   ✅ Allowance successfully set!");
            } else {
                console.log("   ❌ Allowance verification failed!");
                return;
            }

        } catch (error) {
            console.log("\n❌ Approval failed:", error.message);
            if (error.message.includes("user rejected")) {
                console.log("   User rejected the approval transaction");
            }
            return;
        }
    } else {
        console.log("✅ Allowance already sufficient, skipping approval step");
    }

    console.log("\n=== Step 4: Test Payment ===");
    console.log("----------------------------------------");

    try {
        // First simulate the payment
        console.log("🧪 Simulating payment...");
        const simulationResult = await gateway.callStatic.processPayment(
            TEST_ORDER_ID,
            PAYMENT_AMOUNT,
            { from: signer.address, gasLimit: 500000 }
        );
        console.log("✅ Simulation successful! Would return:", simulationResult);

        // Now execute actual payment
        console.log("\n💳 Executing actual payment...");
        const paymentTx = await gateway.processPayment(
            TEST_ORDER_ID,
            PAYMENT_AMOUNT,
            { gasLimit: 500000 }
        );

        console.log("   Payment TX:", paymentTx.hash);
        console.log("   ⏳ Waiting for confirmation...");

        const paymentReceipt = await paymentTx.wait();
        console.log("   ✅ Payment successful!");
        console.log("   Block:", paymentReceipt.blockNumber);
        console.log("   Gas used:", paymentReceipt.gasUsed.toString());

        // Check for payment event
        const paymentEvent = paymentReceipt.events?.find(e => e.event === 'PaymentReceived');
        if (paymentEvent) {
            console.log("\n   📢 Payment Event:");
            console.log("      Order ID:", paymentEvent.args.orderId);
            console.log("      Payer:", paymentEvent.args.payer);
            console.log("      Amount:", ethers.utils.formatUnits(paymentEvent.args.amount, 6), "USDC");
        }

    } catch (error) {
        console.log("\n❌ Payment failed!");
        console.log("   Error:", error.message);

        // Detailed error analysis
        if (error.message.includes("insufficient allowance")) {
            console.log("\n🔍 ALLOWANCE ISSUE PERSISTS!");
            console.log("   Despite setting allowance, the contract still reports insufficient allowance.");
            console.log("\n   Possible causes:");
            console.log("   1. The Payment Gateway is using a different token address");
            console.log("   2. There's a bug in the contract's transferFrom implementation");
            console.log("   3. The allowance is being consumed by another transaction");
            console.log("   4. Network sync issues - try waiting a few seconds and retrying");

            // Re-check current state
            const finalAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY);
            const finalBalance = await usdc.balanceOf(signer.address);
            console.log("\n   Final State:");
            console.log("   - Allowance:", ethers.utils.formatUnits(finalAllowance, 6), "USDC");
            console.log("   - Balance:", ethers.utils.formatUnits(finalBalance, 6), "USDC");
        }
    }

    console.log("\n=== Summary & Recommendations ===");
    console.log("----------------------------------------");
    console.log("📌 Key Points:");
    console.log("1. ERC20 requires two-step process: approve then transferFrom");
    console.log("2. Always verify allowance before attempting payment");
    console.log("3. Use exact amounts for production, buffer for testing");
    console.log("4. Monitor Approval events to confirm transactions");
    console.log("\n🔧 If issues persist:");
    console.log("1. Check contract addresses match exactly");
    console.log("2. Verify token decimals (USDC uses 6, not 18)");
    console.log("3. Ensure order is still valid and not expired");
    console.log("4. Check gas limits and network congestion");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });