const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying FXPool System...");
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Configuration
    const AETHER_ORACLE_ADDRESS = "0xD274e66aB4eFa2F520fd3Ab6384d243B59bA4179"; // From your deployment
    const PROTOCOL_TREASURY = deployer.address; // Change this to your treasury address
    const DONATION_ADDRESS = "0x7cF2eBb5Ca55A8bd671A020F8BDbAF07f60F26C1"; // Gitcoin Grants example
    
    // Stablecoin addresses on OP Sepolia (you'll need to update these)
    const TOKENS = {
        USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", // Example address
        USDT: "0x853154e2A5604E5C74a2546E2871Ad44932eB92C", // Example address
        DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",  // Example address
    };
    
    try {
        // 1. Deploy FXPoolFactory
        console.log("\n📝 Deploying FXPoolFactory...");
        const FXPoolFactory = await hre.ethers.getContractFactory("FXPoolFactory");
        const factory = await FXPoolFactory.deploy(
            AETHER_ORACLE_ADDRESS,
            PROTOCOL_TREASURY,
            DONATION_ADDRESS
        );
        await factory.deployed();
        console.log("✅ FXPoolFactory deployed to:", factory.address);
        
        // 2. Create USDC/USDT Pool
        console.log("\n📝 Creating USDC/USDT Pool...");
        const tx1 = await factory.createPool(
            TOKENS.USDC,
            TOKENS.USDT,
            30 // 0.3% base fee
        );
        const receipt1 = await tx1.wait();
        
        const poolCreatedEvent1 = receipt1.events?.find(e => e.event === 'PoolCreated');
        const usdcUsdtPool = poolCreatedEvent1?.args?.pool;
        const usdcUsdtLPToken = poolCreatedEvent1?.args?.lpToken;
        
        console.log("✅ USDC/USDT Pool deployed to:", usdcUsdtPool);
        console.log("✅ USDC/USDT LP Token:", usdcUsdtLPToken);
        
        // 3. Create USDC/DAI Pool
        console.log("\n📝 Creating USDC/DAI Pool...");
        const tx2 = await factory.createPool(
            TOKENS.USDC,
            TOKENS.DAI,
            20 // 0.2% base fee
        );
        const receipt2 = await tx2.wait();
        
        const poolCreatedEvent2 = receipt2.events?.find(e => e.event === 'PoolCreated');
        const usdcDaiPool = poolCreatedEvent2?.args?.pool;
        const usdcDaiLPToken = poolCreatedEvent2?.args?.lpToken;
        
        console.log("✅ USDC/DAI Pool deployed to:", usdcDaiPool);
        console.log("✅ USDC/DAI LP Token:", usdcDaiLPToken);
        
        // 4. Deploy FXRouter
        console.log("\n📝 Deploying FXRouter...");
        const FXRouter = await hre.ethers.getContractFactory("FXRouter");
        const router = await FXRouter.deploy();
        await router.deployed();
        console.log("✅ FXRouter deployed to:", router.address);
        
        // 5. Register pools in router
        console.log("\n📝 Registering pools in router...");
        await router.registerPool("USDC/USDT", usdcUsdtPool);
        await router.registerPool("USDC/DAI", usdcDaiPool);
        console.log("✅ Pools registered in router");
        
        // 6. Update AetherOracle with FXPool address
        console.log("\n📝 Updating AetherOracle with FXPool...");
        const AetherOracle = await hre.ethers.getContractAt(
            "AetherOracle",
            AETHER_ORACLE_ADDRESS
        );
        
        // Set the primary pool (USDC/USDT) as the FXPool in oracle
        await AetherOracle.setFXPool(usdcUsdtPool);
        console.log("✅ FXPool set in AetherOracle");
        
        // 7. Save deployment info
        const deployment = {
            network: hre.network.name,
            timestamp: new Date().toISOString(),
            contracts: {
                factory: factory.address,
                router: router.address,
                pools: {
                    "USDC/USDT": {
                        pool: usdcUsdtPool,
                        lpToken: usdcUsdtLPToken
                    },
                    "USDC/DAI": {
                        pool: usdcDaiPool,
                        lpToken: usdcDaiLPToken
                    }
                },
                oracle: AETHER_ORACLE_ADDRESS,
                treasury: PROTOCOL_TREASURY,
                donation: DONATION_ADDRESS
            }
        };
        
        const fs = require('fs');
        fs.writeFileSync(
            './deployments/fxpool-deployment.json',
            JSON.stringify(deployment, null, 2)
        );
        
        console.log("\n✅ FXPool System deployed successfully!");
        console.log("\n📋 Summary:");
        console.log("- Factory:", factory.address);
        console.log("- Router:", router.address);
        console.log("- USDC/USDT Pool:", usdcUsdtPool);
        console.log("- USDC/DAI Pool:", usdcDaiPool);
        
        console.log("\n🎯 Next steps:");
        console.log("1. Add initial liquidity to pools");
        console.log("2. Configure oracle nodes to update rates");
        console.log("3. Test swap functionality");
        console.log("4. Enable donation processing");
        
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