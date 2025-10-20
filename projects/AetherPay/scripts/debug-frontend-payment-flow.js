const { ethers } = require("hardhat");

/**
 * 🔍 Frontend Payment Flow Debugger
 *
 * This script replicates the exact flow used by the frontend payment page
 * to identify where the approval process might be failing.
 */

async function main() {
    console.log("🔍 Frontend Payment Flow Debugger");
    console.log("========================================\n");

    const [signer] = await ethers.getSigners();

    // Constants from frontend
    const CONTRACTS = {
        PAYMENT_GATEWAY_V2: "0x4995168D409767330D9693034d5cFfc7daFFb89B",
        MOCK_USDC: "0xD613e5cC1122cFfBFaE88ee99424e4c088e98f01",
        MOCK_USDT: "0xDb86c92F5a426Aa4dB208d6a1d1172060e962cF7"
    };

    // Test with a known order
    const orderId = "0x078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db";

    // ABIs matching frontend
    const ERC20_ABI = [
        {
            "inputs": [
                {"internalType": "address", "name": "owner", "type": "address"},
                {"internalType": "address", "name": "spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "address", "name": "spender", "type": "address"},
                {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const PAYMENT_GATEWAY_ABI = [
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string memory metadataURI, bool allowPartialPayment)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)"
    ];

    console.log("📱 Simulating Frontend Payment Flow");
    console.log("Your Address:", signer.address);
    console.log("Order ID:", orderId);
    console.log();

    // Step 1: Fetch order details (like frontend does)
    console.log("=== Step 1: Fetching Order (Frontend Simulation) ===");

    const gateway = new ethers.Contract(CONTRACTS.PAYMENT_GATEWAY_V2, PAYMENT_GATEWAY_ABI, signer);

    let orderData, fullOrder;
    try {
        orderData = await gateway.getOrder(orderId);
        fullOrder = await gateway.orders(orderId);

        console.log("✅ Order fetched successfully");
        console.log("   Merchant:", orderData.merchant);
        console.log("   Payer:", orderData.payer === ethers.constants.AddressZero ? "Anyone (Public)" : orderData.payer);
        console.log("   Order Amount:", ethers.utils.formatUnits(orderData.orderAmount, 6), "USDC");
        console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderData.status]);
        console.log("   Payment Token:", fullOrder.paymentToken);

    } catch (error) {
        console.log("❌ Failed to fetch order:", error.message);
        return;
    }

    const paymentToken = fullOrder.paymentToken;
    const orderAmount = orderData.orderAmount;

    // Step 2: Check token balance and allowance (like frontend)
    console.log("\n=== Step 2: Token Checks (Frontend Simulation) ===");

    const token = new ethers.Contract(paymentToken, ERC20_ABI, signer);

    const [balance, allowance, decimals, symbol] = await Promise.all([
        token.balanceOf(signer.address),
        token.allowance(signer.address, CONTRACTS.PAYMENT_GATEWAY_V2),
        token.decimals(),
        token.symbol()
    ]);

    console.log("Token:", symbol);
    console.log("Decimals:", decimals);
    console.log("Your Balance:", ethers.utils.formatUnits(balance, decimals), symbol);
    console.log("Current Allowance:", ethers.utils.formatUnits(allowance, decimals), symbol);
    console.log("Required Amount:", ethers.utils.formatUnits(orderAmount, decimals), symbol);

    const hasBalance = balance.gte(orderAmount);
    const needsApproval = allowance.lt(orderAmount);

    console.log("\nCheck Results:");
    console.log("   Has sufficient balance?", hasBalance ? "✅ YES" : "❌ NO");
    console.log("   Needs approval?", needsApproval ? "⚠️ YES" : "✅ NO");

    // Step 3: Frontend's approval logic
    if (needsApproval && hasBalance) {
        console.log("\n=== Step 3: Frontend Approval Logic ===");

        // Frontend uses MAX_UINT256
        const maxApproval = ethers.constants.MaxUint256; // 2^256 - 1

        console.log("🔓 Frontend would approve MAX amount:");
        console.log("   Value:", maxApproval.toString());
        console.log("   Hex:", maxApproval.toHexString());

        console.log("\n⚠️  IMPORTANT FINDING:");
        console.log("   The frontend uses MAX_UINT256 approval");
        console.log("   Your console shows this exact value was approved");
        console.log("   But payment still fails with 'insufficient allowance'");
        console.log("\n   This indicates the issue is NOT with the approval amount!");

        // Try to approve with MAX like frontend
        try {
            console.log("\n🔄 Attempting to replicate frontend approval...");
            const approveTx = await token.approve(CONTRACTS.PAYMENT_GATEWAY_V2, maxApproval);
            console.log("   Approval TX:", approveTx.hash);
            await approveTx.wait();
            console.log("   ✅ Approval confirmed");

            // Re-check allowance
            const newAllowance = await token.allowance(signer.address, CONTRACTS.PAYMENT_GATEWAY_V2);
            console.log("   New allowance:", newAllowance.toString());
            console.log("   Is MAX?", newAllowance.eq(maxApproval));

        } catch (error) {
            console.log("   ❌ Approval failed:", error.message);
        }
    }

    // Step 4: Debug the actual payment call
    console.log("\n=== Step 4: Payment Execution Debug ===");

    // Check all conditions that could cause "insufficient allowance"
    console.log("🔍 Pre-flight checks:");

    // 1. Re-fetch current state
    const currentAllowance = await token.allowance(signer.address, CONTRACTS.PAYMENT_GATEWAY_V2);
    const currentBalance = await token.balanceOf(signer.address);

    console.log("1. Current allowance:", currentAllowance.toString());
    console.log("2. Current balance:", currentBalance.toString());
    console.log("3. Order amount:", orderAmount.toString());
    console.log("4. Gateway address:", CONTRACTS.PAYMENT_GATEWAY_V2);
    console.log("5. Token address:", paymentToken);
    console.log("6. Signer address:", signer.address);

    // Check if addresses match exactly
    console.log("\n🔍 Address validation:");
    console.log("Token from order:", fullOrder.paymentToken);
    console.log("Token we're using:", paymentToken);
    console.log("Match?", fullOrder.paymentToken.toLowerCase() === paymentToken.toLowerCase());

    // Try to simulate the exact transferFrom that would happen
    console.log("\n🧪 Simulating contract's transferFrom call:");

    try {
        // This is what the PaymentGateway will try to do
        console.log("Contract will call: token.transferFrom(");
        console.log("   from:", signer.address);
        console.log("   to: <gateway or merchant>");
        console.log("   amount:", orderAmount.toString());
        console.log(")");

        // Test with callStatic first
        const simulatePayment = await gateway.callStatic.processPayment(
            orderId,
            orderAmount,
            { from: signer.address, gasLimit: 1000000 }
        );

        console.log("✅ Static call successful! Would return:", simulatePayment);

    } catch (error) {
        console.log("❌ Static call failed!");
        console.log("Error:", error.reason || error.message);

        // Parse the exact error
        if (error.message.includes("insufficient allowance")) {
            console.log("\n🚨 CRITICAL FINDING:");
            console.log("   The contract is reverting with 'insufficient allowance'");
            console.log("   Even though allowance is set to MAX_UINT256");
            console.log("\n   Possible root causes:");
            console.log("   1. The contract is checking allowance for the wrong address");
            console.log("   2. The token contract has a bug in its allowance implementation");
            console.log("   3. The payment gateway has the wrong token address stored");
            console.log("   4. There's a mismatch in how addresses are being passed");
        }
    }

    // Step 5: Direct investigation of the contracts
    console.log("\n=== Step 5: Contract Investigation ===");

    // Check if the token is really an ERC20
    try {
        const tokenCode = await signer.provider.getCode(paymentToken);
        console.log("Token contract code size:", tokenCode.length, "bytes");

        if (tokenCode === "0x" || tokenCode.length <= 2) {
            console.log("❌ CRITICAL: Token address has no code! It's not a contract!");
        } else {
            console.log("✅ Token is a valid contract");
        }
    } catch (error) {
        console.log("Failed to check token code:", error.message);
    }

    // Check gateway code
    try {
        const gatewayCode = await signer.provider.getCode(CONTRACTS.PAYMENT_GATEWAY_V2);
        console.log("Gateway contract code size:", gatewayCode.length, "bytes");

        if (gatewayCode === "0x" || gatewayCode.length <= 2) {
            console.log("❌ CRITICAL: Gateway address has no code! It's not a contract!");
        } else {
            console.log("✅ Gateway is a valid contract");
        }
    } catch (error) {
        console.log("Failed to check gateway code:", error.message);
    }

    console.log("\n=== Diagnostic Summary ===");
    console.log("----------------------------------------");

    if (currentAllowance.eq(ethers.constants.MaxUint256)) {
        console.log("🔴 ISSUE CONFIRMED:");
        console.log("   Allowance is set to maximum (2^256-1)");
        console.log("   But contract still reports 'insufficient allowance'");
        console.log("\n   This is NOT a normal ERC20 allowance issue!");
        console.log("\n   Next debugging steps:");
        console.log("   1. Check if the MockUSDC contract has custom logic");
        console.log("   2. Verify PaymentGatewayV2 is using correct transferFrom");
        console.log("   3. Test with a different token (USDT)");
        console.log("   4. Check if there are reentrancy guards blocking the transfer");
    } else {
        console.log("⚠️  Allowance is not set to maximum");
        console.log("   Current:", currentAllowance.toString());
        console.log("   This needs to be fixed first");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });