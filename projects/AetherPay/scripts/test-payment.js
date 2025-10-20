const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("💳 Testing Payment Process");
    console.log("==========================\n");

    const [signer] = await ethers.getSigners();
    console.log("🔑 Using account:", signer.address);

    // Contract addresses
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const tokenAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3"; // Mock USDC

    // Use an existing valid order or create new one
    const EXISTING_ORDER = "APIK240BZ"; // Latest order from merchant, 29 USDC

    // ABIs
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];

    const GATEWAY_ABI = [
        "function getOrderDetailsByString(string orderIdString) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function createOrder(string orderIdString, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI, bool allowPartialPayment, address designatedPayer) returns (bytes32)"
    ];

    // Create contract instances
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);

    console.log("📋 Checking existing order:", EXISTING_ORDER);
    let orderToPayId;
    let orderToPayAmount;

    try {
        const orderDetails = await gatewayContract.getOrderDetailsByString(EXISTING_ORDER);
        orderToPayId = orderDetails[0];
        orderToPayAmount = orderDetails[3];
        const status = ["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][orderDetails[8]];

        console.log("✅ Order found!");
        console.log("   Order ID (bytes32):", orderToPayId);
        console.log("   Merchant:", orderDetails[1]);
        console.log("   Designated Payer:", orderDetails[2]);
        console.log("   Amount:", ethers.utils.formatUnits(orderToPayAmount, 6), "USDC");
        console.log("   Payment Token:", orderDetails[4]);
        console.log("   Settlement Token:", orderDetails[5]);
        console.log("   Status:", status);

        if (status !== "Pending") {
            console.log("\n⚠️ Order is not in Pending status, cannot pay!");
            console.log("Creating a new order instead...");
            orderToPayId = null;
        }

        // Check if there's a designated payer
        if (orderDetails[2] !== "0x0000000000000000000000000000000000000000" &&
            orderDetails[2].toLowerCase() !== signer.address.toLowerCase()) {
            console.log("\n⚠️ This order has a designated payer and it's not you!");
            console.log("   Designated:", orderDetails[2]);
            console.log("   You:", signer.address);
            console.log("Creating a new order instead...");
            orderToPayId = null;
        }
    } catch (error) {
        console.log("❌ Could not fetch order:", error.reason || error.message);
        orderToPayId = null;
    }

    // If no valid order, create a new one
    if (!orderToPayId) {
        console.log("\n📝 Creating new test order...");

        const newOrderId = `TEST-${Date.now()}`;
        const orderAmount = ethers.utils.parseUnits("5", 6); // 5 USDC
        const metadataURI = "ipfs://QmTest";

        try {
            const tx = await gatewayContract.createOrder(
                newOrderId,
                orderAmount,
                tokenAddress,           // Payment token (USDC)
                tokenAddress,           // Settlement token (same as payment for simplicity)
                metadataURI,
                false,                  // No partial payment
                ethers.constants.AddressZero  // No designated payer
            );

            console.log("   Transaction sent:", tx.hash);
            console.log("   Waiting for confirmation...");
            const receipt = await tx.wait();
            console.log("   ✅ Order created in block:", receipt.blockNumber);

            // Get the order ID from the event
            const event = receipt.events.find(e => e.event === "OrderCreated");
            orderToPayId = event.args.orderId;
            orderToPayAmount = orderAmount;

            console.log("   Order ID (string):", newOrderId);
            console.log("   Order ID (bytes32):", orderToPayId);
            console.log("   Amount:", ethers.utils.formatUnits(orderAmount, 6), "USDC");
        } catch (error) {
            console.log("❌ Failed to create order:", error.reason || error.message);
            return;
        }
    }

    // Check token balance
    console.log("\n💰 Checking token balance...");
    const balance = await tokenContract.balanceOf(signer.address);
    const decimals = await tokenContract.decimals();
    const symbol = await tokenContract.symbol();
    console.log("   Balance:", ethers.utils.formatUnits(balance, decimals), symbol);

    if (balance.lt(orderToPayAmount)) {
        console.log("   ❌ Insufficient balance!");
        console.log("   Need:", ethers.utils.formatUnits(orderToPayAmount, decimals), symbol);
        return;
    }

    // Check and set allowance
    console.log("\n🔓 Checking allowance...");
    let allowance = await tokenContract.allowance(signer.address, gatewayAddress);
    console.log("   Current allowance:", ethers.utils.formatUnits(allowance, decimals), symbol);

    if (allowance.lt(orderToPayAmount)) {
        console.log("   ⚠️ Insufficient allowance, approving...");
        const approveTx = await tokenContract.approve(gatewayAddress, ethers.constants.MaxUint256);
        console.log("   Approval tx:", approveTx.hash);
        await approveTx.wait();
        console.log("   ✅ Approved!");

        // Verify new allowance
        allowance = await tokenContract.allowance(signer.address, gatewayAddress);
        console.log("   New allowance:", allowance.eq(ethers.constants.MaxUint256) ? "UNLIMITED" : ethers.utils.formatUnits(allowance, decimals));
    }

    // Now attempt to pay
    console.log("\n💳 Processing payment...");
    console.log("   Order ID:", orderToPayId);
    console.log("   Amount:", ethers.utils.formatUnits(orderToPayAmount, decimals), symbol);

    try {
        const paymentTx = await gatewayContract.processPayment(orderToPayId, orderToPayAmount);
        console.log("   Transaction sent:", paymentTx.hash);
        console.log("   Waiting for confirmation...");

        const paymentReceipt = await paymentTx.wait();
        console.log("   ✅ Payment successful!");
        console.log("   Block:", paymentReceipt.blockNumber);
        console.log("   Gas used:", paymentReceipt.gasUsed.toString());

        // Check for events
        const paymentEvent = paymentReceipt.events.find(e => e.event === "PaymentReceived");
        if (paymentEvent) {
            console.log("\n📊 Payment Details:");
            console.log("   Payer:", paymentEvent.args.payer);
            console.log("   Amount:", ethers.utils.formatUnits(paymentEvent.args.amount, decimals), symbol);
        }

        const completedEvent = paymentReceipt.events.find(e => e.event === "OrderCompleted");
        if (completedEvent) {
            console.log("\n✅ Order Completed!");
            console.log("   Merchant received:", ethers.utils.formatUnits(completedEvent.args.receivedAmount, decimals));
            console.log("   Platform fee:", ethers.utils.formatUnits(completedEvent.args.platformFee, decimals));
        }

    } catch (error) {
        console.log("❌ Payment failed!");
        console.log("   Error:", error.reason || error.message);

        // Try to decode the error
        if (error.data) {
            console.log("   Error data:", error.data);
        }
        if (error.error && error.error.data) {
            console.log("   Revert data:", error.error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });