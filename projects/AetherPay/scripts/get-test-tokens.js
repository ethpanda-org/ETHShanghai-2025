const { ethers } = require("hardhat");

async function main() {
    console.log("===========================================");
    console.log("💰 检查并获取测试代币");
    console.log("===========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("您的钱包地址:", signer.address);

    const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
    const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

    const erc20ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function mint(address to, uint256 amount)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];

    const usdc = await ethers.getContractAt(erc20ABI, MOCK_USDC);
    const usdt = await ethers.getContractAt(erc20ABI, MOCK_USDT);

    console.log("1️⃣ 代币信息");
    console.log("===========================================");

    const usdcName = await usdc.name();
    const usdcSymbol = await usdc.symbol();
    const usdtName = await usdt.name();
    const usdtSymbol = await usdt.symbol();

    console.log("USDC:");
    console.log("  名称:", usdcName);
    console.log("  符号:", usdcSymbol);
    console.log("  地址:", MOCK_USDC);

    console.log("\nUSDT:");
    console.log("  名称:", usdtName);
    console.log("  符号:", usdtSymbol);
    console.log("  地址:", MOCK_USDT);

    console.log("\n2️⃣ 检查您的余额");
    console.log("===========================================");

    const usdcBalance = await usdc.balanceOf(signer.address);
    const usdtBalance = await usdt.balanceOf(signer.address);

    console.log("mUSDC余额:", ethers.utils.formatUnits(usdcBalance, 6));
    console.log("mUSDT余额:", ethers.utils.formatUnits(usdtBalance, 6));

    if (usdcBalance.eq(0) && usdtBalance.eq(0)) {
        console.log("\n3️⃣ 尝试获取测试代币");
        console.log("===========================================");

        try {
            const mintAmount = ethers.utils.parseUnits("1000", 6);

            console.log("尝试铸造1000 mUSDC...");
            const tx1 = await usdc.mint(signer.address, mintAmount);
            await tx1.wait();
            console.log("✅ 成功获取1000 mUSDC!");

            console.log("尝试铸造1000 mUSDT...");
            const tx2 = await usdt.mint(signer.address, mintAmount);
            await tx2.wait();
            console.log("✅ 成功获取1000 mUSDT!");

            // 重新检查余额
            const newUsdcBalance = await usdc.balanceOf(signer.address);
            const newUsdtBalance = await usdt.balanceOf(signer.address);

            console.log("\n最新余额:");
            console.log("mUSDC:", ethers.utils.formatUnits(newUsdcBalance, 6));
            console.log("mUSDT:", ethers.utils.formatUnits(newUsdtBalance, 6));

        } catch (error) {
            console.log("❌ 无法铸造代币:", error.message);
            console.log("\n您需要部署新的可自由铸造的代币:");
            console.log("运行: npm run deploy:new-mock-tokens");
        }
    } else {
        console.log("\n✅ 您已经有测试代币了!");
    }

    console.log("\n4️⃣ 在MetaMask中添加代币");
    console.log("===========================================");
    console.log("请在MetaMask中手动添加以下代币:\n");

    console.log("Mock USDC (mUSDC):");
    console.log("  地址: " + MOCK_USDC);
    console.log("  符号: mUSDC");
    console.log("  小数: 6");

    console.log("\nMock USDT (mUSDT):");
    console.log("  地址: " + MOCK_USDT);
    console.log("  符号: mUSDT");
    console.log("  小数: 6");

    console.log("\n提示: 如果MetaMask无法自动识别，请手动输入符号和小数位");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });