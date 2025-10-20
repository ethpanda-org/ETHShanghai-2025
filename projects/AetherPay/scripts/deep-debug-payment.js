const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Deep Analysis of Payment Transaction\n");

    // 原始交易数据
    const txData = "0x571376de078fc091f37526d427ac84836e3555de028ab2fd7b6f7405a925017f4761a2db0000000000000000000000000000000000000000000000000000000001312d00";

    // 解析数据
    const functionSelector = txData.slice(0, 10);
    const orderId = "0x" + txData.slice(10, 74);
    const paymentAmount = "0x" + txData.slice(74, 138);

    console.log("📊 Transaction Data Breakdown:");
    console.log("=====================================");
    console.log("Function Selector:", functionSelector);
    console.log("Order ID (bytes32):", orderId);
    console.log("Payment Amount (hex):", paymentAmount);
    console.log("Payment Amount (dec):", ethers.BigNumber.from(paymentAmount).toString());
    console.log("Payment Amount (USDC):", ethers.utils.formatUnits(ethers.BigNumber.from(paymentAmount), 6), "USDC");

    // 计算正确的函数选择器
    const iface = new ethers.utils.Interface([
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)"
    ]);

    const correctSelector = iface.getSighash("processPayment");
    console.log("\n✅ Correct Function Selector:", correctSelector);
    console.log("🔍 Provided Function Selector:", functionSelector);
    console.log("Match:", correctSelector === functionSelector ? "✅ YES" : "❌ NO");

    // 连接到合约
    const paymentGatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const [signer] = await ethers.getSigners();

    console.log("\n👤 Current Wallet:");
    console.log("=====================================");
    console.log("Address:", signer.address);
    console.log("Network:", (await signer.provider.getNetwork()).name);

    // 扩展的ABI
    const abi = [
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function getOrder(bytes32 orderId) view returns (address merchant, address payer, uint256 orderAmount, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string memory metadataURI)",
        "function orders(bytes32) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint256 exchangeRate, uint256 platformFee, uint256 merchantFee, uint256 createdAt, uint256 paidAt, uint256 expiryTime, uint8 status, string memory metadataURI, bool allowPartialPayment)",
        "function orderIdStrings(bytes32) view returns (string)",
        "function stringToBytes32OrderId(string) view returns (bytes32)"
    ];

    const gateway = new ethers.Contract(paymentGatewayAddress, abi, signer);

    console.log("\n📋 Order Details:");
    console.log("=====================================");

    try {
        // 方法1：使用getOrder函数
        const orderInfo = await gateway.getOrder(orderId);
        console.log("Using getOrder():");
        console.log("  Merchant:", orderInfo.merchant);
        console.log("  Payer:", orderInfo.payer);
        console.log("  Order Amount:", ethers.utils.formatUnits(orderInfo.orderAmount, 6), "USDC");
        console.log("  Paid Amount:", ethers.utils.formatUnits(orderInfo.paidAmount, 6), "USDC");
        console.log("  Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderInfo.status]);

        const now = Math.floor(Date.now() / 1000);
        const expiryTime = orderInfo.expiryTime.toNumber();
        console.log("  Expiry Time:", new Date(expiryTime * 1000).toISOString());
        console.log("  Is Expired:", now > expiryTime ? "❌ YES" : "✅ NO");

        // 关键检查
        console.log("\n🔐 Access Control Check:");
        console.log("=====================================");
        const isOpenOrder = orderInfo.payer === ethers.constants.AddressZero;
        console.log("Order Type:", isOpenOrder ? "OPEN (anyone can pay)" : "DESIGNATED (restricted)");

        if (!isOpenOrder) {
            console.log("Designated Payer:", orderInfo.payer);
            console.log("Current Signer:", signer.address);
            console.log("Match (case-insensitive):",
                orderInfo.payer.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO"
            );

            // 检查地址格式
            console.log("\n📐 Address Format Check:");
            console.log("Payer (checksummed):", ethers.utils.getAddress(orderInfo.payer));
            console.log("Signer (checksummed):", ethers.utils.getAddress(signer.address));
        }

        // 尝试获取完整的订单结构
        console.log("\n📦 Full Order Structure:");
        console.log("=====================================");
        try {
            const fullOrder = await gateway.orders(orderId);
            console.log("Payment Token:", fullOrder.paymentToken);
            console.log("Settlement Token:", fullOrder.settlementToken);
            console.log("Allow Partial Payment:", fullOrder.allowPartialPayment);

            // 检查代币授权
            if (fullOrder.paymentToken !== ethers.constants.AddressZero) {
                const tokenAbi = [
                    "function allowance(address owner, address spender) view returns (uint256)",
                    "function balanceOf(address) view returns (uint256)",
                    "function symbol() view returns (string)"
                ];
                const token = new ethers.Contract(fullOrder.paymentToken, tokenAbi, signer);

                try {
                    const symbol = await token.symbol();
                    const balance = await token.balanceOf(signer.address);
                    const allowance = await token.allowance(signer.address, paymentGatewayAddress);

                    console.log("\n💰 Token Status:");
                    console.log("=====================================");
                    console.log("Token Symbol:", symbol);
                    console.log("Your Balance:", ethers.utils.formatUnits(balance, 6), symbol);
                    console.log("Current Allowance:", ethers.utils.formatUnits(allowance, 6), symbol);
                    console.log("Required Amount:", ethers.utils.formatUnits(paymentAmount, 6), symbol);
                    console.log("Allowance Sufficient:", allowance.gte(paymentAmount) ? "✅ YES" : "❌ NO");
                    console.log("Balance Sufficient:", balance.gte(paymentAmount) ? "✅ YES" : "❌ NO");
                } catch (e) {
                    console.log("Could not fetch token details:", e.message);
                }
            }
        } catch (e) {
            console.log("Could not fetch full order structure");
        }

        // 模拟交易调用
        console.log("\n🧪 Simulating Transaction Call:");
        console.log("=====================================");
        try {
            // 使用 callStatic 来模拟交易而不实际发送
            const result = await gateway.callStatic.processPayment(
                orderId,
                ethers.BigNumber.from(paymentAmount),
                { from: signer.address }
            );
            console.log("✅ Simulation successful! Result:", result);
        } catch (error) {
            console.log("❌ Simulation failed!");
            console.log("Error message:", error.message);

            // 解析具体的revert原因
            if (error.reason) {
                console.log("Revert reason:", error.reason);
            }
            if (error.data) {
                // 尝试解码错误数据
                try {
                    const errorInterface = new ethers.utils.Interface([
                        "error OnlyDesignatedPayer(address required, address provided)"
                    ]);
                    const decoded = errorInterface.parseError(error.data);
                    console.log("Decoded error:", decoded);
                } catch (e) {
                    // 不是自定义错误
                }
            }
        }

        // 检查订单ID字符串映射
        try {
            const orderIdString = await gateway.orderIdStrings(orderId);
            console.log("\n🔤 Order ID Mapping:");
            console.log("=====================================");
            console.log("Original String:", orderIdString || "(empty)");

            if (orderIdString) {
                const reverseLookup = await gateway.stringToBytes32OrderId(orderIdString);
                console.log("Reverse Lookup Match:", reverseLookup === orderId ? "✅ YES" : "❌ NO");
            }
        } catch (e) {
            console.log("Could not fetch order ID string");
        }

    } catch (error) {
        console.error("\n❌ Error fetching order:", error.message);
    }

    console.log("\n🔍 Diagnosis Summary:");
    console.log("=====================================");
    console.log("1. Check if order exists in the contract");
    console.log("2. Verify the payer address matches exactly");
    console.log("3. Ensure sufficient token balance and allowance");
    console.log("4. Confirm order is in PENDING status");
    console.log("5. Check order hasn't expired");
    console.log("6. Verify correct network (Optimism Sepolia)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });