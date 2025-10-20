const { ethers } = require("hardhat");

async function main() {
    console.log("===========================================");
    console.log("💧 AetherPay测试代币水龙头");
    console.log("===========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("您的钱包地址:", signer.address);

    // 现有的Mock代币地址
    const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
    const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

    // ERC20 ABI
    const erc20ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function mint(address to, uint256 amount)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];

    console.log("1️⃣ 检查当前余额...");

    const usdc = await ethers.getContractAt(erc20ABI, MOCK_USDC);
    const usdt = await ethers.getContractAt(erc20ABI, MOCK_USDT);

    const usdcBalance = await usdc.balanceOf(signer.address);
    const usdtBalance = await usdt.balanceOf(signer.address);

    console.log("   USDC余额:", ethers.utils.formatUnits(usdcBalance, 6));
    console.log("   USDT余额:", ethers.utils.formatUnits(usdtBalance, 6));

    console.log("\n2️⃣ 尝试从水龙头获取代币...");

    // 尝试方法1: 直接mint（如果合约允许）
    try {
        const mintAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC/USDT

        console.log("   尝试获取1000 USDC...");
        const tx1 = await usdc.mint(signer.address, mintAmount);
        await tx1.wait();
        console.log("   ✅ 成功获取1000 USDC!");

        console.log("   尝试获取1000 USDT...");
        const tx2 = await usdt.mint(signer.address, mintAmount);
        await tx2.wait();
        console.log("   ✅ 成功获取1000 USDT!");

    } catch (error) {
        console.log("   ⚠️ 直接mint失败，尝试其他方法...");

        // 方法2: 从水龙头账户转账
        try {
            // 水龙头账户（需要有代币的账户）
            const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY || process.env.PRIVATE_KEY;

            if (!FAUCET_PRIVATE_KEY) {
                console.log("\n❌ 无法获取测试代币，原因:");
                console.log("   1. Mock代币合约不允许公开mint");
                console.log("   2. 没有配置水龙头私钥");
                console.log("\n解决方案:");
                console.log("   运行: npm run deploy:new-mock-tokens");
                console.log("   这会部署新的可自由mint的测试代币");
                return;
            }

            const faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, signer.provider);
            const usdcFaucet = usdc.connect(faucetWallet);
            const usdtFaucet = usdt.connect(faucetWallet);

            // 检查水龙头余额
            const faucetUsdcBalance = await usdc.balanceOf(faucetWallet.address);
            const faucetUsdtBalance = await usdt.balanceOf(faucetWallet.address);

            console.log("\n   水龙头账户余额:");
            console.log("   USDC:", ethers.utils.formatUnits(faucetUsdcBalance, 6));
            console.log("   USDT:", ethers.utils.formatUnits(faucetUsdtBalance, 6));

            const transferAmount = ethers.utils.parseUnits("1000", 6);

            if (faucetUsdcBalance.gte(transferAmount)) {
                console.log("   转账1000 USDC...");
                const tx1 = await usdcFaucet.transfer(signer.address, transferAmount);
                await tx1.wait();
                console.log("   ✅ 成功获取1000 USDC!");
            } else {
                console.log("   ❌ 水龙头USDC余额不足");
            }

            if (faucetUsdtBalance.gte(transferAmount)) {
                console.log("   转账1000 USDT...");
                const tx2 = await usdtFaucet.transfer(signer.address, transferAmount);
                await tx2.wait();
                console.log("   ✅ 成功获取1000 USDT!");
            } else {
                console.log("   ❌ 水龙头USDT余额不足");
            }

        } catch (error) {
            console.log("   ❌ 转账失败:", error.message);
        }
    }

    console.log("\n3️⃣ 检查最终余额...");
    const finalUsdcBalance = await usdc.balanceOf(signer.address);
    const finalUsdtBalance = await usdt.balanceOf(signer.address);

    console.log("   USDC余额:", ethers.utils.formatUnits(finalUsdcBalance, 6));
    console.log("   USDT余额:", ethers.utils.formatUnits(finalUsdtBalance, 6));

    if (finalUsdcBalance.gt(usdcBalance) || finalUsdtBalance.gt(usdtBalance)) {
        console.log("\n✅ 成功获取测试代币!");
        console.log("\n下一步:");
        console.log("1. 在MetaMask中导入代币地址:");
        console.log("   USDC:", MOCK_USDC);
        console.log("   USDT:", MOCK_USDT);
        console.log("2. 返回AetherPay创建订单");
    } else {
        console.log("\n⚠️ 未能获取测试代币");
        console.log("请运行: npm run deploy:new-mock-tokens");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });