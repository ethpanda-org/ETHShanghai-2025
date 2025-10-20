const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log("🔍 Account Status Checker & Fixer");
    console.log("==================================\n");

    // 你前端使用的账户地址（从错误日志中提取）
    const frontendAccount = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a"; // 这是你前端的账户
    const scriptAccount = "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c"; // 这是脚本的账户

    const gatewayAddress = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
    const tokenAddress = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3"; // Mock USDC

    const provider = new ethers.providers.JsonRpcProvider("https://sepolia.optimism.io");

    // ABIs
    const GATEWAY_ABI = [
        "function getMerchantInfo(address merchant) view returns (string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)",
        "function registerMerchant(string businessName)"
    ];

    const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function symbol() view returns (string)"
    ];

    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, provider);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    console.log("📊 Comparing Accounts:");
    console.log("=======================");
    console.log("Script Account:", scriptAccount);
    console.log("Frontend Account:", frontendAccount);
    console.log();

    // Check both accounts
    for (const [name, account] of [["Script", scriptAccount], ["Frontend", frontendAccount]]) {
        console.log(`\n📋 ${name} Account (${account}):`);
        console.log("=" + "=".repeat(50));

        // Check merchant status
        console.log("\n1️⃣ Merchant Status:");
        try {
            const merchantInfo = await gatewayContract.getMerchantInfo(account);
            if (merchantInfo.isActive) {
                console.log("   ✅ Registered as merchant");
                console.log("   Business name:", merchantInfo.businessName);
                console.log("   Total orders:", merchantInfo.totalOrders.toString());
            } else {
                console.log("   ❌ NOT registered as merchant");
            }
        } catch (error) {
            console.log("   ❌ NOT registered as merchant");
        }

        // Check token balance
        console.log("\n2️⃣ Token Balance:");
        const balance = await tokenContract.balanceOf(account);
        const symbol = await tokenContract.symbol();
        console.log("   Balance:", ethers.utils.formatUnits(balance, 6), symbol);

        // Check allowance
        console.log("\n3️⃣ Token Allowance:");
        const allowance = await tokenContract.allowance(account, gatewayAddress);
        if (allowance.eq(ethers.constants.MaxUint256)) {
            console.log("   ✅ UNLIMITED allowance");
        } else if (allowance.gt(0)) {
            console.log("   ⚠️ Limited allowance:", ethers.utils.formatUnits(allowance, 6), symbol);
        } else {
            console.log("   ❌ NO allowance");
        }
    }

    console.log("\n\n🔧 SOLUTION:");
    console.log("=============");

    // Check if frontend account needs fixes
    const frontendMerchantInfo = await gatewayContract.getMerchantInfo(frontendAccount).catch(() => ({ isActive: false }));
    const frontendBalance = await tokenContract.balanceOf(frontendAccount);
    const frontendAllowance = await tokenContract.allowance(frontendAccount, gatewayAddress);

    if (!frontendMerchantInfo.isActive) {
        console.log("\n❌ Frontend account is NOT a merchant!");
        console.log("   Fix: Run this command to register as merchant:");
        console.log(`   npx hardhat run scripts/register-merchant-for-address.js --network op-sepolia`);
        console.log(`   Make sure to use address: ${frontendAccount}`);
    }

    if (frontendBalance.eq(0)) {
        console.log("\n❌ Frontend account has NO tokens!");
        console.log("   Fix: Transfer tokens from script account or mint new ones");
    }

    if (frontendAllowance.eq(0)) {
        console.log("\n❌ Frontend account has NO allowance!");
        console.log("   Fix: Approve tokens in the frontend or run approval script");
    }

    console.log("\n\n💡 RECOMMENDED ACTIONS:");
    console.log("========================");
    console.log("1. Option A: Use the script account in MetaMask");
    console.log("   - Import this private key to MetaMask (from .env file)");
    console.log("   - This account already has everything set up");
    console.log();
    console.log("2. Option B: Fix the frontend account");
    console.log("   - Register as merchant");
    console.log("   - Get some test tokens");
    console.log("   - Approve the gateway contract");
    console.log();
    console.log("3. Option C: Create orders without cross-currency");
    console.log("   - Always use same token for payment and settlement");
    console.log("   - This avoids the swap issue");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });