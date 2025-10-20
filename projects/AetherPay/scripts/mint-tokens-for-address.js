const { ethers } = require("hardhat");

async function main() {
    console.log("===========================================");
    console.log("💰 为指定账户铸造测试代币");
    console.log("===========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("操作账户:", deployer.address);

    // 🎯 目标账户地址
    const TARGET_ADDRESS = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
    console.log("目标账户:", TARGET_ADDRESS);

    const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
    const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

    // MockToken ABI
    const mockTokenABI = [
        "function mint(address to, uint256 amount)",
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function owner() view returns (address)"
    ];

    // 获取代币合约
    const usdc = await ethers.getContractAt(mockTokenABI, MOCK_USDC);
    const usdt = await ethers.getContractAt(mockTokenABI, MOCK_USDT);

    // 铸造数量：10000个代币
    const mintAmount = ethers.utils.parseUnits("10000", 6); // USDC/USDT 通常是6位小数

    console.log("\n1️⃣ 检查代币信息...");

    try {
        const usdcSymbol = await usdc.symbol();
        const usdtSymbol = await usdt.symbol();
        console.log("   USDC Symbol:", usdcSymbol);
        console.log("   USDT Symbol:", usdtSymbol);
    } catch (error) {
        console.log("   ⚠️ 无法读取代币信息，合约可能不存在");
    }

    console.log("\n2️⃣ 检查目标账户铸造前余额...");
    const usdcBalanceBefore = await usdc.balanceOf(TARGET_ADDRESS);
    const usdtBalanceBefore = await usdt.balanceOf(TARGET_ADDRESS);
    console.log("   USDC余额:", ethers.utils.formatUnits(usdcBalanceBefore, 6));
    console.log("   USDT余额:", ethers.utils.formatUnits(usdtBalanceBefore, 6));

    console.log("\n3️⃣ 检查权限...");

    // 检查是否是owner
    try {
        const usdcOwner = await usdc.owner();
        const usdtOwner = await usdt.owner();
        console.log("   USDC Owner:", usdcOwner);
        console.log("   USDT Owner:", usdtOwner);

        if (usdcOwner !== deployer.address) {
            console.log("   ⚠️ 你不是USDC的owner，可能无法铸造");
        }
        if (usdtOwner !== deployer.address) {
            console.log("   ⚠️ 你不是USDT的owner，可能无法铸造");
        }
    } catch (error) {
        console.log("   ⚠️ 合约可能没有owner函数");
    }

    console.log("\n4️⃣ 为目标账户铸造代币...");

    // 尝试铸造USDC
    try {
        console.log(`\n   为 ${TARGET_ADDRESS} 铸造10,000 USDC...`);
        const tx1 = await usdc.mint(TARGET_ADDRESS, mintAmount);
        console.log("   交易已发送，等待确认...");
        await tx1.wait();
        console.log("   ✅ USDC铸造成功!");
        console.log("   交易哈希:", tx1.hash);
    } catch (error) {
        console.log("   ❌ USDC铸造失败:", error.message);

        // 如果是MockToken合约，尝试其他方法
        try {
            const MockToken = await ethers.getContractFactory("MockERC20");
            const usdcContract = MockToken.attach(MOCK_USDC);
            const tx = await usdcContract.mint(TARGET_ADDRESS, mintAmount);
            await tx.wait();
            console.log("   ✅ USDC铸造成功(备用方法)!");
            console.log("   交易哈希:", tx.hash);
        } catch (e) {
            console.log("   ❌ 所有铸造方法都失败");
        }
    }

    // 尝试铸造USDT
    try {
        console.log(`\n   为 ${TARGET_ADDRESS} 铸造10,000 USDT...`);
        const tx2 = await usdt.mint(TARGET_ADDRESS, mintAmount);
        console.log("   交易已发送，等待确认...");
        await tx2.wait();
        console.log("   ✅ USDT铸造成功!");
        console.log("   交易哈希:", tx2.hash);
    } catch (error) {
        console.log("   ❌ USDT铸造失败:", error.message);

        // 如果是MockToken合约，尝试其他方法
        try {
            const MockToken = await ethers.getContractFactory("MockERC20");
            const usdtContract = MockToken.attach(MOCK_USDT);
            const tx = await usdtContract.mint(TARGET_ADDRESS, mintAmount);
            await tx.wait();
            console.log("   ✅ USDT铸造成功(备用方法)!");
            console.log("   交易哈希:", tx.hash);
        } catch (e) {
            console.log("   ❌ 所有铸造方法都失败");
        }
    }

    console.log("\n5️⃣ 检查目标账户铸造后余额...");
    const usdcBalanceAfter = await usdc.balanceOf(TARGET_ADDRESS);
    const usdtBalanceAfter = await usdt.balanceOf(TARGET_ADDRESS);
    console.log("   USDC余额:", ethers.utils.formatUnits(usdcBalanceAfter, 6));
    console.log("   USDT余额:", ethers.utils.formatUnits(usdtBalanceAfter, 6));

    if (usdcBalanceAfter.gt(usdcBalanceBefore) || usdtBalanceAfter.gt(usdtBalanceBefore)) {
        console.log("\n✅ 代币铸造成功!");
        console.log(`\n📝 目标账户 ${TARGET_ADDRESS} 现在拥有:`);
        console.log(`   - ${ethers.utils.formatUnits(usdcBalanceAfter, 6)} mUSDC`);
        console.log(`   - ${ethers.utils.formatUnits(usdtBalanceAfter, 6)} mUSDT`);
    } else {
        console.log("\n❌ 代币铸造失败，可能原因:");
        console.log("   1. 你不是MockToken合约的owner");
        console.log("   2. MockToken合约没有mint函数");
        console.log("   3. 需要部署新的MockToken合约");
    }

    console.log("\n6️⃣ 提示:");
    console.log("   目标账户需要在 MetaMask 中导入这些代币才能看到余额:");
    console.log(`   - mUSDC: ${MOCK_USDC}`);
    console.log(`   - mUSDT: ${MOCK_USDT}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

