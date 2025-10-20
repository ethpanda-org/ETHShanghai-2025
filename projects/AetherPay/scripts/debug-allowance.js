const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔍 Debugging Payment Allowance Issue");
    console.log("=====================================\n");

    // Known addresses from the error logs
    const userAddress = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
    const tokenAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3"; // Mock USDC
    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B"; // PaymentGatewayV2
    const orderId = "Order-1736588206901";
    const orderAmount = ethers.utils.parseUnits("19", 6); // 19 USDC (6 decimals)

    console.log("📌 User Address:", userAddress);
    console.log("📌 Token Address:", tokenAddress);
    console.log("📌 Gateway Address:", gatewayAddress);
    console.log("📌 Order Amount:", ethers.utils.formatUnits(orderAmount, 6), "USDC\n");

    // Connect to the network
    const provider = new ethers.providers.JsonRpcProvider("https://sepolia.optimism.io");

    // Get the latest block
    const blockNumber = await provider.getBlockNumber();
    console.log("📊 Current Block:", blockNumber);

    // ERC20 ABI for token operations
    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)"
    ];

    // PaymentGatewayV2 ABI
    const GATEWAY_ABI = [
        "function getOrderDetailsByString(string orderIdString) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)",
        "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
        "function supportedTokens(address) view returns (bool)"
    ];

    // Create contract instances
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, provider);

    console.log("\n🪙 Token Information:");
    console.log("========================");
    try {
        const tokenName = await tokenContract.name();
        const tokenSymbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        console.log("✅ Token Name:", tokenName);
        console.log("✅ Token Symbol:", tokenSymbol);
        console.log("✅ Decimals:", decimals);
    } catch (error) {
        console.log("❌ Failed to get token info:", error.message);
    }

    console.log("\n💰 User Balance:");
    console.log("=================");
    try {
        const balance = await tokenContract.balanceOf(userAddress);
        console.log("✅ Balance:", ethers.utils.formatUnits(balance, 6), "USDC");
        console.log("   Raw Balance:", balance.toString());

        if (balance.lt(orderAmount)) {
            console.log("⚠️ WARNING: Insufficient balance! Need", ethers.utils.formatUnits(orderAmount, 6), "USDC");
        }
    } catch (error) {
        console.log("❌ Failed to get balance:", error.message);
    }

    console.log("\n🔓 Allowance Check:");
    console.log("====================");
    try {
        // Check allowance with different address formats
        const allowance1 = await tokenContract.allowance(userAddress, gatewayAddress);
        console.log("✅ Allowance (original addresses):", allowance1.toString());
        console.log("   In USDC:", ethers.utils.formatUnits(allowance1, 6));

        // Try with checksummed addresses
        const userChecksum = ethers.utils.getAddress(userAddress);
        const gatewayChecksum = ethers.utils.getAddress(gatewayAddress);
        const allowance2 = await tokenContract.allowance(userChecksum, gatewayChecksum);
        console.log("✅ Allowance (checksummed):", allowance2.toString());
        console.log("   In USDC:", ethers.utils.formatUnits(allowance2, 6));

        // Try with lowercase addresses
        const userLower = userAddress.toLowerCase();
        const gatewayLower = gatewayAddress.toLowerCase();
        const allowance3 = await tokenContract.allowance(userLower, gatewayLower);
        console.log("✅ Allowance (lowercase):", allowance3.toString());
        console.log("   In USDC:", ethers.utils.formatUnits(allowance3, 6));

        // Check if allowance is sufficient
        if (allowance1.gte(orderAmount)) {
            console.log("✅ Allowance is SUFFICIENT for order amount");
        } else {
            console.log("❌ Allowance is INSUFFICIENT for order amount");
            console.log("   Need:", ethers.utils.formatUnits(orderAmount, 6), "USDC");
            console.log("   Have:", ethers.utils.formatUnits(allowance1, 6), "USDC");
        }

        // Check if it's MAX_UINT256
        const MAX_UINT256 = ethers.constants.MaxUint256;
        if (allowance1.eq(MAX_UINT256)) {
            console.log("✅ Allowance is set to MAX_UINT256 (unlimited)");
        }
    } catch (error) {
        console.log("❌ Failed to check allowance:", error.message);
    }

    console.log("\n📋 Order Information:");
    console.log("======================");
    try {
        const orderDetails = await gatewayContract.getOrderDetailsByString(orderId);
        console.log("✅ Order ID (bytes32):", orderDetails[0]);
        console.log("✅ Merchant:", orderDetails[1]);
        console.log("✅ Designated Payer:", orderDetails[2]);
        console.log("✅ Order Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "USDC");
        console.log("✅ Payment Token:", orderDetails[4]);
        console.log("✅ Settlement Token:", orderDetails[5]);
        console.log("✅ Paid Amount:", ethers.utils.formatUnits(orderDetails[6], 6), "USDC");
        console.log("✅ Received Amount:", ethers.utils.formatUnits(orderDetails[7], 6));
        console.log("✅ Status:", ["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][orderDetails[8]]);
        console.log("✅ Created At:", new Date(orderDetails[9] * 1000).toLocaleString());
        console.log("✅ Expiry Time:", orderDetails[10] > 0 ? new Date(orderDetails[10] * 1000).toLocaleString() : "No expiry");

        // Check if payment token matches
        if (orderDetails[4].toLowerCase() !== tokenAddress.toLowerCase()) {
            console.log("⚠️ WARNING: Order payment token doesn't match expected token!");
            console.log("   Expected:", tokenAddress);
            console.log("   Got:", orderDetails[4]);
        }

        // Check designated payer
        if (orderDetails[2] !== "0x0000000000000000000000000000000000000000") {
            console.log("\n⚠️ This order has a designated payer!");
            console.log("   Designated:", orderDetails[2]);
            console.log("   User:", userAddress);
            if (orderDetails[2].toLowerCase() !== userAddress.toLowerCase()) {
                console.log("❌ User is NOT the designated payer!");
            } else {
                console.log("✅ User IS the designated payer");
            }
        }
    } catch (error) {
        console.log("❌ Failed to get order details:", error.message);
    }

    console.log("\n🔧 Token Support Check:");
    console.log("========================");
    try {
        const isSupported = await gatewayContract.supportedTokens(tokenAddress);
        console.log("✅ Token is supported by gateway:", isSupported);
        if (!isSupported) {
            console.log("❌ WARNING: Token is NOT supported by the payment gateway!");
        }
    } catch (error) {
        console.log("❌ Failed to check token support:", error.message);
    }

    console.log("\n🔬 Advanced Debugging:");
    console.log("=======================");

    // Try to simulate the transferFrom call
    try {
        console.log("\n📝 Simulating transferFrom call...");

        // Create a signer from private key if available
        if (process.env.PRIVATE_KEY) {
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            console.log("🔑 Using signer address:", signer.address);

            if (signer.address.toLowerCase() === userAddress.toLowerCase()) {
                // Try to call transferFrom directly
                const tokenWithSigner = tokenContract.connect(signer);

                // First, let's check the current allowance one more time
                const currentAllowance = await tokenContract.allowance(signer.address, gatewayAddress);
                console.log("Current allowance from signer:", currentAllowance.toString());

                // Try to estimate gas for transferFrom
                try {
                    console.log("\n🔮 Estimating gas for transferFrom...");
                    const estimatedGas = await tokenWithSigner.estimateGas.transferFrom(
                        signer.address,
                        gatewayAddress,
                        orderAmount
                    );
                    console.log("✅ Gas estimation successful:", estimatedGas.toString());
                } catch (gasError) {
                    console.log("❌ Gas estimation failed:", gasError.reason || gasError.message);

                    // Try to decode the error
                    if (gasError.error && gasError.error.data) {
                        console.log("Error data:", gasError.error.data);
                    }
                }

                // Try static call to see what happens
                try {
                    console.log("\n📞 Making static call to transferFrom...");
                    const result = await tokenWithSigner.callStatic.transferFrom(
                        signer.address,
                        gatewayAddress,
                        orderAmount
                    );
                    console.log("✅ Static call successful, would return:", result);
                } catch (staticError) {
                    console.log("❌ Static call failed:", staticError.reason || staticError.message);
                }

            } else {
                console.log("⚠️ Signer address doesn't match user address");
            }
        } else {
            console.log("⚠️ No PRIVATE_KEY in environment, skipping simulation");
        }
    } catch (error) {
        console.log("❌ Simulation failed:", error.message);
    }

    console.log("\n🔍 Contract Code Verification:");
    console.log("================================");
    try {
        // Check if contracts are verified on Etherscan
        const tokenCode = await provider.getCode(tokenAddress);
        const gatewayCode = await provider.getCode(gatewayAddress);

        console.log("✅ Token contract has code:", tokenCode.length > 2 ? "Yes" : "No");
        console.log("✅ Gateway contract has code:", gatewayCode.length > 2 ? "Yes" : "No");

        if (tokenCode.length <= 2) {
            console.log("❌ WARNING: Token address has no contract code!");
        }
        if (gatewayCode.length <= 2) {
            console.log("❌ WARNING: Gateway address has no contract code!");
        }
    } catch (error) {
        console.log("❌ Failed to check contract code:", error.message);
    }

    console.log("\n📊 Summary:");
    console.log("============");
    console.log("1. User has sufficient balance:", (await tokenContract.balanceOf(userAddress)).gte(orderAmount) ? "✅" : "❌");
    console.log("2. User has sufficient allowance:", (await tokenContract.allowance(userAddress, gatewayAddress)).gte(orderAmount) ? "✅" : "❌");
    console.log("3. Token is supported by gateway:", await gatewayContract.supportedTokens(tokenAddress) ? "✅" : "❌");
    console.log("4. Order exists and is pending:", "Check status above");

    console.log("\n🎯 Potential Issues to Check:");
    console.log("==============================");
    console.log("1. Check if the token contract has a pausable mechanism that might be paused");
    console.log("2. Check if there's a token-specific transferFrom implementation issue");
    console.log("3. Check if the gateway contract address in the frontend matches the deployed contract");
    console.log("4. Check if there are any access control restrictions on the token contract");
    console.log("5. Check transaction logs to see if approval transaction was actually successful");
}

main()
  .then(() => console.log("\n✅ 调试完成"))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });