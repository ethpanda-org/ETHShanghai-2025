const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying PaymentGateway System...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH\n");

    // Get addresses from existing deployments
    const FX_ROUTER_ADDRESS = "0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1";
    const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury for now
    const DONATION_ADDRESS = "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C";

    // Mock stablecoin addresses on OP Sepolia
    const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
    const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

    try {
        // 1. Deploy PaymentGateway
        console.log("📝 Deploying PaymentGateway...");
        const PaymentGateway = await ethers.getContractFactory("PaymentGateway");
        const gateway = await PaymentGateway.deploy(
            FX_ROUTER_ADDRESS,
            TREASURY_ADDRESS,
            DONATION_ADDRESS
        );

        await gateway.deployed();
        console.log("✅ PaymentGateway deployed to:", gateway.address);

        // 2. Add supported tokens
        console.log("\n📝 Adding supported tokens...");
        await gateway.addSupportedToken(MOCK_USDC);
        console.log("✅ Added USDC");

        await gateway.addSupportedToken(MOCK_USDT);
        console.log("✅ Added USDT");

        // 3. Set platform fee rate (0.3%)
        console.log("\n📝 Configuring fees...");
        const platformFeeRate = 30; // 0.3% in basis points
        await gateway.setPlatformFeeRate(platformFeeRate);
        console.log("✅ Platform fee rate set to 0.3%");

        // 4. Set donation percentage (5% of fees)
        const donationPercentage = 500; // 5% in basis points
        await gateway.setDonationPercentage(donationPercentage);
        console.log("✅ Donation percentage set to 5%");

        // 5. Register deployer as test merchant
        console.log("\n📝 Registering test merchant...");
        await gateway.registerMerchant("Test Merchant");
        console.log("✅ Deployer registered as test merchant");

        // 6. Get merchant info to verify
        const merchantInfo = await gateway.getMerchantInfo(deployer.address);
        console.log("\n📋 Merchant Info:");
        console.log("   Business Name:", merchantInfo[0]);
        console.log("   Total Orders:", merchantInfo[1].toString());
        console.log("   Fee Rate:", merchantInfo[4].toString(), "basis points");
        console.log("   Is Active:", merchantInfo[5]);

        // 7. Save deployment info
        const deployment = {
            network: "op-sepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                paymentGateway: gateway.address,
                fxRouter: FX_ROUTER_ADDRESS,
                treasury: TREASURY_ADDRESS,
                donation: DONATION_ADDRESS
            },
            supportedTokens: {
                USDC: MOCK_USDC,
                USDT: MOCK_USDT
            },
            configuration: {
                platformFeeRate: platformFeeRate,
                donationPercentage: donationPercentage,
                orderExpiryTime: 1800 // 30 minutes
            },
            deployer: deployer.address
        };

        // Create deployments directory if it doesn't exist
        if (!fs.existsSync('./deployments')) {
            fs.mkdirSync('./deployments');
        }

        fs.writeFileSync(
            './deployments/payment-gateway-deployment.json',
            JSON.stringify(deployment, null, 2)
        );

        console.log("\n✅ PaymentGateway System deployed successfully!");
        console.log("\n📋 Summary:");
        console.log("- PaymentGateway:", gateway.address);
        console.log("- FXRouter:", FX_ROUTER_ADDRESS);
        console.log("- Treasury:", TREASURY_ADDRESS);
        console.log("- Donation:", DONATION_ADDRESS);

        console.log("\n🎯 Next steps:");
        console.log("1. Update config/.env with PAYMENT_GATEWAY_ADDRESS=" + gateway.address);
        console.log("2. Test order creation and payment processing");
        console.log("3. Deploy frontend for merchant dashboard");
        console.log("4. Add more supported tokens if needed");

        console.log("\n🔗 View on Explorer:");
        console.log("https://sepolia-optimistic.etherscan.io/address/" + gateway.address);

    } catch (error) {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });