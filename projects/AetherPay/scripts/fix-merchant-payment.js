const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔧 Merchant Registration & Payment Fix Script");
    console.log("=============================================\n");

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("🔑 Using account:", signer.address);

    // Contract addresses
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const tokenAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3"; // Mock USDC

    // Gateway ABI
    const GATEWAY_ABI = [
        "function registerMerchant(string businessName)",
        "function getMerchantInfo(address merchant) view returns (string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)",
        "function createOrder(string orderIdString, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI, bool allowPartialPayment, address designatedPayer) returns (bytes32)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrderDetailsByString(string orderIdString) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)"
    ];

    // ERC20 ABI
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function symbol() view returns (string)"
    ];

    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    // Step 1: Register as merchant if needed
    console.log("📋 Step 1: Checking merchant registration...");
    try {
        const merchantInfo = await gatewayContract.getMerchantInfo(signer.address);
        if (merchantInfo.isActive) {
            console.log("✅ Already registered as merchant:", merchantInfo.businessName);
        } else {
            throw new Error("Not registered");
        }
    } catch (error) {
        console.log("   Registering as merchant...");
        const regTx = await gatewayContract.registerMerchant("Test Business");
        console.log("   Transaction:", regTx.hash);
        await regTx.wait();
        console.log("   ✅ Successfully registered as merchant!");
    }

    // Step 2: Check and set allowance
    console.log("\n📋 Step 2: Checking token allowance...");
    const balance = await tokenContract.balanceOf(signer.address);
    const allowance = await tokenContract.allowance(signer.address, gatewayAddress);
    const symbol = await tokenContract.symbol();

    console.log("   Balance:", ethers.utils.formatUnits(balance, 6), symbol);
    console.log("   Current allowance:", allowance.eq(ethers.constants.MaxUint256) ? "UNLIMITED" : ethers.utils.formatUnits(allowance, 6));

    if (allowance.lt(ethers.utils.parseUnits("1000", 6))) {
        console.log("   Setting unlimited allowance...");
        const approveTx = await tokenContract.approve(gatewayAddress, ethers.constants.MaxUint256);
        console.log("   Transaction:", approveTx.hash);
        await approveTx.wait();
        console.log("   ✅ Allowance set to unlimited!");
    }

    // Step 3: Create a test order with same token for payment and settlement
    console.log("\n📋 Step 3: Creating test order...");
    const orderId = `TEST-${Date.now()}`;
    const orderAmount = ethers.utils.parseUnits("5", 6); // 5 USDC

    const createTx = await gatewayContract.createOrder(
        orderId,
        orderAmount,
        tokenAddress,  // Payment token
        tokenAddress,  // Same settlement token to avoid swap issues
        "ipfs://test",
        false,
        ethers.constants.AddressZero
    );

    console.log("   Transaction:", createTx.hash);
    const createReceipt = await createTx.wait();
    console.log("   ✅ Order created!");
    console.log("   Order ID:", orderId);

    // Get order details
    const orderDetails = await gatewayContract.getOrderDetailsByString(orderId);
    const orderIdBytes32 = orderDetails[0];

    // Step 4: Pay for the order
    console.log("\n📋 Step 4: Paying for order...");
    console.log("   Order ID (bytes32):", orderIdBytes32);
    console.log("   Amount:", ethers.utils.formatUnits(orderAmount, 6), symbol);

    try {
        const payTx = await gatewayContract.processPayment(orderIdBytes32, orderAmount);
        console.log("   Transaction:", payTx.hash);
        const payReceipt = await payTx.wait();
        console.log("   ✅ Payment successful!");
        console.log("   Gas used:", payReceipt.gasUsed.toString());

        // Check final order status
        const finalOrder = await gatewayContract.getOrderDetailsByString(orderId);
        const status = ["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][finalOrder[8]];
        console.log("   Final status:", status);
    } catch (error) {
        console.log("   ❌ Payment failed:", error.reason || error.message);
    }

    console.log("\n✨ Script complete!");
    console.log("\n📝 Summary:");
    console.log("1. User is registered as merchant ✅");
    console.log("2. Token allowance is set ✅");
    console.log("3. Test order created ✅");
    console.log("4. Payment test completed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });