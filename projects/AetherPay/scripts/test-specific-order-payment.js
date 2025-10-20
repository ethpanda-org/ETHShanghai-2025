const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Testing Specific Order Payment Issue\n");

    const [signer] = await ethers.getSigners();

    // 从失败交易提取的数据
    const orderId = "0x078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db";
    const paymentAmount = ethers.utils.parseUnits("20", 6); // 20 USDC
    const paymentGatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

    console.log("📱 Test Configuration:");
    console.log("=====================================");
    console.log("Your Address:", signer.address);
    console.log("Order ID:", orderId);
    console.log("Payment Amount:", ethers.utils.formatUnits(paymentAmount, 6), "USDC");
    console.log("Gateway Address:", paymentGatewayAddress);

    // 完整的ABI，包括所有可能需要的函数
    const abi = [
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string memory metadataURI, bool allowPartialPayment)",
        "event PaymentReceived(bytes32 indexed orderId, address indexed payer, uint256 amount, address token)"
    ];

    const gateway = new ethers.Contract(paymentGatewayAddress, abi, signer);

    // 步骤1：获取订单详情
    console.log("\n📋 Step 1: Fetching Order Details");
    console.log("=====================================");

    let orderDetails;
    let fullOrder;

    try {
        orderDetails = await gateway.getOrder(orderId);
        fullOrder = await gateway.orders(orderId);

        console.log("✅ Order Found!");
        console.log("Merchant:", orderDetails.merchant);
        console.log("Designated Payer:", orderDetails.payer);
        console.log("Order Amount:", ethers.utils.formatUnits(orderDetails.orderAmount, 6), "USDC");
        console.log("Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderDetails.status]);
        console.log("Payment Token:", fullOrder.paymentToken);
        console.log("Settlement Token:", fullOrder.settlementToken);

        // 检查地址匹配
        const isOpenOrder = orderDetails.payer === ethers.constants.AddressZero;
        if (!isOpenOrder) {
            // 比较地址时转换为小写以避免大小写问题
            const payerLower = orderDetails.payer.toLowerCase();
            const signerLower = signer.address.toLowerCase();

            console.log("\n🔐 Address Verification:");
            console.log("Designated Payer (lowercase):", payerLower);
            console.log("Your Address (lowercase):", signerLower);
            console.log("Exact Match:", payerLower === signerLower ? "✅ YES" : "❌ NO");

            // 额外检查：使用 getAddress 标准化地址
            try {
                const payerChecksum = ethers.utils.getAddress(orderDetails.payer);
                const signerChecksum = ethers.utils.getAddress(signer.address);
                console.log("Checksummed Payer:", payerChecksum);
                console.log("Checksummed Signer:", signerChecksum);
                console.log("Checksum Match:", payerChecksum === signerChecksum ? "✅ YES" : "❌ NO");
            } catch (e) {
                console.log("Address checksum error:", e.message);
            }
        } else {
            console.log("✅ This is an OPEN order (anyone can pay)");
        }

    } catch (error) {
        console.log("❌ Error fetching order:", error.message);
        console.log("\nPossible issues:");
        console.log("1. Order doesn't exist");
        console.log("2. Wrong network");
        console.log("3. Contract address mismatch");
        return;
    }

    // 步骤2：检查代币余额和授权
    console.log("\n💰 Step 2: Checking Token Balance & Allowance");
    console.log("=====================================");

    const tokenAddress = fullOrder.paymentToken;
    const tokenAbi = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
    ];

    const token = new ethers.Contract(tokenAddress, tokenAbi, signer);

    try {
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const balance = await token.balanceOf(signer.address);
        const allowance = await token.allowance(signer.address, paymentGatewayAddress);

        console.log("Token:", symbol);
        console.log("Decimals:", decimals);
        console.log("Your Balance:", ethers.utils.formatUnits(balance, decimals), symbol);
        console.log("Current Allowance:", ethers.utils.formatUnits(allowance, decimals), symbol);
        console.log("Required:", ethers.utils.formatUnits(paymentAmount, decimals), symbol);

        const needsApproval = allowance.lt(paymentAmount);
        const hasBalance = balance.gte(paymentAmount);

        console.log("\nStatus Check:");
        console.log("Has Sufficient Balance:", hasBalance ? "✅ YES" : "❌ NO");
        console.log("Has Sufficient Allowance:", !needsApproval ? "✅ YES" : "❌ NO");

        if (!hasBalance) {
            console.log("\n❌ Insufficient balance! Cannot proceed with payment.");
            return;
        }

        if (needsApproval) {
            console.log("\n🔓 Approving token spend...");
            const approveTx = await token.approve(paymentGatewayAddress, paymentAmount);
            console.log("Approval TX:", approveTx.hash);
            await approveTx.wait();
            console.log("✅ Approval confirmed!");
        }

    } catch (error) {
        console.log("❌ Token check error:", error.message);
    }

    // 步骤3：尝试静态调用（模拟）
    console.log("\n🧪 Step 3: Simulating Payment Call");
    console.log("=====================================");

    try {
        // 先用 callStatic 模拟
        console.log("Running static simulation...");
        const simulationResult = await gateway.callStatic.processPayment(
            orderId,
            paymentAmount,
            {
                from: signer.address,
                gasLimit: 1000000
            }
        );
        console.log("✅ Simulation successful! Would return:", simulationResult);

    } catch (error) {
        console.log("❌ Simulation failed!");
        console.log("Error:", error.reason || error.message);

        // 尝试解析更详细的错误
        if (error.error && error.error.data) {
            console.log("\nDetailed error data:", error.error.data);

            // 尝试解码常见的错误消息
            const errorMessages = [
                "Only designated payer can pay this order",
                "Order not pending",
                "Order expired",
                "Invalid payment amount",
                "Insufficient allowance"
            ];

            for (const msg of errorMessages) {
                const hash = ethers.utils.id(msg);
                if (error.error.data.includes(hash.slice(2, 10))) {
                    console.log("Decoded error message:", msg);
                    break;
                }
            }
        }

        // 如果是 designated payer 错误，进一步调试
        if (error.message.includes("designated payer")) {
            console.log("\n🔍 Debugging Designated Payer Issue:");
            console.log("=====================================");

            // 直接读取存储槽可能有助于理解问题
            try {
                // 获取订单的 payer 字段（通常在第3个槽位）
                const provider = signer.provider;
                const orderSlot = ethers.utils.solidityKeccak256(
                    ["bytes32", "uint256"],
                    [orderId, 1] // mapping(bytes32 => Order) 的槽位
                );

                // payer 在 Order struct 的第3个位置（index 2）
                const payerSlot = ethers.BigNumber.from(orderSlot).add(2);
                const payerData = await provider.getStorageAt(paymentGatewayAddress, payerSlot);
                console.log("Raw payer data from storage:", payerData);
                console.log("Decoded payer address:", "0x" + payerData.slice(26));

            } catch (e) {
                console.log("Could not read storage directly");
            }
        }

        return; // 如果模拟失败，不继续实际交易
    }

    // 步骤4：实际执行交易
    console.log("\n💳 Step 4: Executing Actual Payment");
    console.log("=====================================");

    try {
        console.log("Sending transaction...");
        const tx = await gateway.processPayment(
            orderId,
            paymentAmount,
            {
                gasLimit: 1000000
            }
        );

        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Payment successful!");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Block:", receipt.blockNumber);

        // 查找事件
        const event = receipt.events?.find(e => e.event === 'PaymentReceived');
        if (event) {
            console.log("\n📢 Payment Event:");
            console.log("Order ID:", event.args.orderId);
            console.log("Payer:", event.args.payer);
            console.log("Amount:", ethers.utils.formatUnits(event.args.amount, 6));
        }

    } catch (error) {
        console.log("❌ Transaction failed!");
        console.log("Error:", error.reason || error.message);

        if (error.receipt) {
            console.log("Transaction Receipt:", error.receipt.transactionHash);
            console.log("Status:", error.receipt.status);
        }
    }

    // 最终诊断
    console.log("\n📊 Final Diagnosis:");
    console.log("=====================================");
    console.log("If the payment is still failing with 'Only designated payer' error:");
    console.log("1. The order's payer field might be corrupted or incorrectly set");
    console.log("2. There might be a frontend encoding issue when creating the order");
    console.log("3. The contract might have been upgraded and has state inconsistencies");
    console.log("4. Try creating a fresh order with explicit address(0) for open payment");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });