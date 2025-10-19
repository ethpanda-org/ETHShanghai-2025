const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("===========================================");
    console.log("🚀 部署新的自由铸造Mock代币");
    console.log("===========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 创建自由铸造的MockToken合约
    const FreeMintToken = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FreeMintToken is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // 任何人都可以免费铸造（仅用于测试）
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // 水龙头功能：任何人可以获取1000个代币
    function faucet() public {
        _mint(msg.sender, 1000 * 10 ** _decimals);
    }

    // 批量水龙头：一次获取多个代币
    function megaFaucet() public {
        _mint(msg.sender, 10000 * 10 ** _decimals);
    }
}
    `;

    // 写入合约文件
    const contractPath = path.join(__dirname, "../contracts/FreeMintToken.sol");
    fs.writeFileSync(contractPath, FreeMintToken);
    console.log("✅ FreeMintToken合约已创建");

    // 编译合约
    console.log("编译合约...");
    await hre.run("compile");

    // 部署合约
    const FreeMintTokenFactory = await ethers.getContractFactory("FreeMintToken");

    console.log("\n1️⃣ 部署Free USDC...");
    const freeUSDC = await FreeMintTokenFactory.deploy("Free USDC", "fUSDC", 6);
    await freeUSDC.deployed();
    console.log("   ✅ Free USDC部署到:", freeUSDC.address);

    console.log("\n2️⃣ 部署Free USDT...");
    const freeUSDT = await FreeMintTokenFactory.deploy("Free USDT", "fUSDT", 6);
    await freeUSDT.deployed();
    console.log("   ✅ Free USDT部署到:", freeUSDT.address);

    // 给部署者一些初始代币
    console.log("\n3️⃣ 获取初始代币...");
    await freeUSDC.megaFaucet();
    await freeUSDT.megaFaucet();
    console.log("   ✅ 已获取10,000个测试代币");

    // 保存地址
    const addresses = {
        freeUSDC: freeUSDC.address,
        freeUSDT: freeUSDT.address,
        deployer: deployer.address,
        network: "optimism-sepolia",
        timestamp: new Date().toISOString()
    };

    const addressesPath = path.join(__dirname, "../free-tokens-addresses.json");
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

    // 将新代币添加到PaymentGateway
    console.log("\n4️⃣ 将代币添加到PaymentGateway支持列表...");
    const PAYMENT_GATEWAY_V2 = "0x26Fea37ec7D0Fe6858C9209044F715b549bAD343";

    try {
        const gateway = await ethers.getContractAt(
            ["function addSupportedToken(address)", "function supportedTokens(address) view returns (bool)"],
            PAYMENT_GATEWAY_V2
        );

        // 添加到支持列表
        const tx1 = await gateway.addSupportedToken(freeUSDC.address);
        await tx1.wait();
        console.log("   ✅ Free USDC已添加到支持列表");

        const tx2 = await gateway.addSupportedToken(freeUSDT.address);
        await tx2.wait();
        console.log("   ✅ Free USDT已添加到支持列表");

    } catch (error) {
        console.log("   ⚠️ 添加到PaymentGateway失败（可能不是Owner）");
        console.log("   请手动添加或使用Owner账户");
    }

    console.log("\n===========================================");
    console.log("✅ 部署完成！");
    console.log("===========================================");
    console.log("\n新的自由铸造代币地址:");
    console.log("Free USDC:", freeUSDC.address);
    console.log("Free USDT:", freeUSDT.address);

    console.log("\n💡 使用方法:");
    console.log("1. 在MetaMask中添加这些代币");
    console.log("2. 调用faucet()函数获取1000个代币");
    console.log("3. 调用megaFaucet()函数获取10000个代币");
    console.log("4. 或直接调用mint()函数铸造任意数量");

    console.log("\n📝 更新frontend/lib/contracts.ts:");
    console.log(`
// 添加新的免费测试代币
export const FREE_TOKENS = {
  USDC: '${freeUSDC.address}',
  USDT: '${freeUSDT.address}',
};

// 或更新现有的MOCK代币地址
export const CONTRACTS = {
  // ... 其他合约 ...
  MOCK_USDC: '${freeUSDC.address}', // 使用新的自由铸造代币
  MOCK_USDT: '${freeUSDT.address}', // 使用新的自由铸造代币
  // ... 其他合约 ...
};
    `);

    console.log("\n✨ 任何人都可以通过以下方式获取代币:");
    console.log("   1. 访问Etherscan");
    console.log("   2. 找到合约的Write Contract页面");
    console.log("   3. 调用faucet()或megaFaucet()函数");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });