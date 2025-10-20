const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("💳 Creating and Paying Test Order (Same Token)");
    console.log("===============================================\n");

    const [signer] = await ethers.getSigners();
    console.log("🔑 Using account:", signer.address);

    // Contract addresses
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const tokenAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3"; // Mock USDC

    // ABIs
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];

    const GATEWAY_ABI = [
        "function registerMerchant(string businessName) returns ()",
        "function getMerchantInfo(address merchant) view returns (string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)",
        "function createOrder(string orderIdString, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI, bool allowPartialPayment, address designatedPayer) returns (bytes32)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrderDetailsByString(string orderIdString) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)"
    ];

    // Create contract instances
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);

    // Check if merchant is registered
    console.log("🏪 Checking merchant registration...");
    try {
        const merchantInfo = await gatewayContract.getMerchantInfo(signer.address);
        if (merchantInfo.isActive) {
            console.log("   ✅ Already registered as:", merchantInfo.businessName);
        } else {
            console.log("   Registering as merchant...");
            const regTx = await gatewayContract.registerMerchant("Test Merchant");
            await regTx.wait();
            console.log("   ✅ Registered!");
        }
    } catch (error) {
        console.log("   Registering as merchant...");
        try {
            const regTx = await gatewayContract.registerMerchant("Test Merchant");
            await regTx.wait();
            console.log("   ✅ Registered!");
        } catch (regError) {
            console.log("   ℹ️ Merchant registration not required or already registered");
        }
    }

    // Create a new order with SAME token for payment and settlement
    console.log("\n📝 Creating new test order (same-currency)...");

    const newOrderId = `SAME-${Date.now()}`;
    const orderAmount = ethers.utils.parseUnits("10", 6); // 10 USDC
    const metadataURI = "ipfs://QmTest";

    let orderToPayId;
    try {
        const tx = await gatewayContract.createOrder(
            newOrderId,
            orderAmount,
            tokenAddress,           // Payment token (USDC)
            tokenAddress,           // Settlement token (SAME AS PAYMENT - NO SWAP NEEDED)
            metadataURI,
            false,                  // No partial payment
            ethers.constants.AddressZero  // No designated payer
        );

        console.log("   Transaction sent:", tx.hash);
        console.log("   Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("   ✅ Order created in block:", receipt.blockNumber);

        // Get the order ID from the event - handle different event structures
        let orderCreatedEvent;
        if (receipt.events && receipt.events.length > 0) {
            orderCreatedEvent = receipt.events.find(e => e.event === "OrderCreated");
        }

        if (orderCreatedEvent && orderCreatedEvent.args) {
            orderToPayId = orderCreatedEvent.args.orderId;
            console.log("   Order ID (bytes32) from event:", orderToPayId);
        } else {
            // If event parsing fails, get order ID by querying the contract
            console.log("   Getting order ID from contract...");
            const orderDetails = await gatewayContract.getOrderDetailsByString(newOrderId);
            orderToPayId = orderDetails[0];
            console.log("   Order ID (bytes32) from query:", orderToPayId);
        }

        console.log("   Order ID (string):", newOrderId);
        console.log("   Amount:", ethers.utils.formatUnits(orderAmount, 6), "USDC");
        console.log("   Payment Token:", tokenAddress);
        console.log("   Settlement Token:", tokenAddress, "(SAME - no swap needed)");
    } catch (error) {
        console.log("❌ Failed to create order:", error.reason || error.message);
        return;
    }

    // Check token balance
    console.log("\n💰 Checking token balance...");
    const balance = await tokenContract.balanceOf(signer.address);
    const decimals = await tokenContract.decimals();
    const symbol = await tokenContract.symbol();
    console.log("   Balance:", ethers.utils.formatUnits(balance, decimals), symbol);

    // Check and set allowance
    console.log("\n🔓 Checking allowance...");
    let allowance = await tokenContract.allowance(signer.address, gatewayAddress);
    console.log("   Current allowance:", allowance.eq(ethers.constants.MaxUint256) ? "UNLIMITED" : ethers.utils.formatUnits(allowance, decimals));

    if (allowance.lt(orderAmount)) {
        console.log("   ⚠️ Insufficient allowance, approving...");
        const approveTx = await tokenContract.approve(gatewayAddress, ethers.constants.MaxUint256);
        console.log("   Approval tx:", approveTx.hash);
        await approveTx.wait();
        console.log("   ✅ Approved!");
    }

    // Now attempt to pay
    console.log("\n💳 Processing payment...");
    console.log("   Order ID:", orderToPayId);
    console.log("   Amount:", ethers.utils.formatUnits(orderAmount, decimals), symbol);

    try {
        const paymentTx = await gatewayContract.processPayment(orderToPayId, orderAmount);
        console.log("   Transaction sent:", paymentTx.hash);
        console.log("   Waiting for confirmation...");

        const paymentReceipt = await paymentTx.wait();
        console.log("   ✅ Payment successful!");
        console.log("   Block:", paymentReceipt.blockNumber);
        console.log("   Gas used:", paymentReceipt.gasUsed.toString());
        console.log("   Transaction hash:", paymentReceipt.transactionHash);

        // Check for events
        const paymentEvent = paymentReceipt.events.find(e => e.event === "PaymentReceived");
        if (paymentEvent) {
            console.log("\n📊 Payment Event:");
            console.log("   Order ID:", paymentEvent.args.orderId);
            console.log("   Payer:", paymentEvent.args.payer);
            console.log("   Amount:", ethers.utils.formatUnits(paymentEvent.args.amount, decimals), symbol);
        }

        const completedEvent = paymentReceipt.events.find(e => e.event === "OrderCompleted");
        if (completedEvent) {
            console.log("\n✅ Order Completed Event:");
            console.log("   Merchant received:", ethers.utils.formatUnits(completedEvent.args.receivedAmount, decimals), symbol);
            console.log("   Platform fee:", ethers.utils.formatUnits(completedEvent.args.platformFee, decimals), symbol);
        }

        // Verify final order status
        console.log("\n📋 Final Order Status:");
        const finalOrder = await gatewayContract.getOrderDetailsByString(newOrderId);
        const status = ["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][finalOrder[8]];
        console.log("   Status:", status);
        console.log("   Paid Amount:", ethers.utils.formatUnits(finalOrder[6], decimals), symbol);
        console.log("   Received Amount:", ethers.utils.formatUnits(finalOrder[7], decimals), symbol);

    } catch (error) {
        console.log("❌ Payment failed!");
        console.log("   Error:", error.reason || error.message);

        if (error.data) {
            console.log("   Error data:", error.data);
        }
        if (error.error && error.error.data) {
            console.log("   Revert data:", error.error.data);
            // Try to decode the error
            try {
                const errorInterface = new ethers.utils.Interface([
                    "error InsufficientAllowance(address owner, address spender, uint256 current, uint256 needed)"
                ]);
                const decoded = errorInterface.parseError(error.error.data);
                console.log("   Decoded error:", decoded);
            } catch (e) {
                // Not this error type
            }
        }
    }

    console.log("\n✨ Test complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });