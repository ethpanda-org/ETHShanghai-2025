const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔍 Checking Orders on PaymentGatewayV2");
    console.log("=======================================\n");

    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const provider = new ethers.providers.JsonRpcProvider("https://sepolia.optimism.io");

    // PaymentGatewayV2 ABI
    const GATEWAY_ABI = [
        "event OrderCreated(bytes32 indexed orderId, string orderIdString, address indexed merchant, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI)",
        "event PaymentReceived(bytes32 indexed orderId, address indexed payer, uint256 amount, address token)",
        "function getOrderDetailsByString(string orderIdString) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)",
        "function getMerchantOrders(address merchant, uint256 offset, uint256 limit) view returns (tuple(bytes32 orderId, string orderIdString, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 paidAt, string metadataURI)[])"
    ];

    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, provider);

    // Get recent OrderCreated events
    console.log("📜 Fetching recent OrderCreated events...");
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 50000; // Look back ~14 hours on OP Sepolia

    try {
        const filter = gatewayContract.filters.OrderCreated();
        const events = await gatewayContract.queryFilter(filter, fromBlock, currentBlock);

        console.log(`Found ${events.length} orders created recently:\n`);

        for (const event of events.slice(-10)) { // Show last 10 orders
            const { orderId, orderIdString, merchant, orderAmount, paymentToken, settlementToken } = event.args;

            console.log(`📦 Order: ${orderIdString}`);
            console.log(`   ID (bytes32): ${orderId}`);
            console.log(`   Merchant: ${merchant}`);
            console.log(`   Amount: ${ethers.utils.formatUnits(orderAmount, 6)} (assuming 6 decimals)`);
            console.log(`   Payment Token: ${paymentToken}`);
            console.log(`   Settlement Token: ${settlementToken}`);
            console.log(`   Block: ${event.blockNumber}`);
            console.log(`   Tx: ${event.transactionHash}`);

            // Try to get current order status
            try {
                const orderDetails = await gatewayContract.getOrderDetailsByString(orderIdString);
                const status = ["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][orderDetails[8]];
                console.log(`   Status: ${status}`);
            } catch (e) {
                console.log(`   Status: Unable to fetch (${e.reason || 'Error'})`);
            }
            console.log();
        }
    } catch (error) {
        console.log("Error fetching events:", error.message);
    }

    // Check a few specific merchants
    console.log("\n🏪 Checking known merchant orders...");
    const knownMerchants = [
        "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c", // From deployment
        "0x99f8C4e03181022125CAB1A9929Ab44027AD276a", // User address (might also be merchant)
    ];

    for (const merchant of knownMerchants) {
        console.log(`\nMerchant: ${merchant}`);
        try {
            const orders = await gatewayContract.getMerchantOrders(merchant, 0, 10);
            console.log(`Found ${orders.length} orders`);

            for (const order of orders) {
                console.log(`  - ${order.orderIdString}`);
                console.log(`    Amount: ${ethers.utils.formatUnits(order.orderAmount, 6)}`);
                console.log(`    Status: ${["Pending", "Paid", "Completed", "Cancelled", "Refunded", "Expired"][order.status]}`);
                console.log(`    Created: ${new Date(order.createdAt * 1000).toLocaleString()}`);
            }
        } catch (error) {
            console.log(`  Error: ${error.reason || error.message}`);
        }
    }

    // Test creating a new order
    console.log("\n📝 To create a new test order, run:");
    console.log("npx hardhat run scripts/create-test-order.js --network op-sepolia");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });