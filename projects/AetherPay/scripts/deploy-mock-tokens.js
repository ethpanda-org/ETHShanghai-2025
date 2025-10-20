const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("===========================================");
    console.log("🚀 部署新的MockToken合约");
    console.log("===========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 获取余额
    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

    // 创建MockERC20合约
    const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        // 铸造初始供应量给部署者
        _mint(msg.sender, 1000000 * 10 ** decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // 任何人都可以铸造（仅测试用途）
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Owner可以铸造
    function ownerMint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // 销毁代币
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
    `;

    // 将合约代码写入文件
    const contractPath = path.join(__dirname, "../contracts/MockERC20.sol");
    fs.writeFileSync(contractPath, MockERC20Source);
    console.log("✅ MockERC20合约已创建");

    // 编译合约
    console.log("编译合约...");
    await hre.run("compile");

    // 部署合约
    console.log("\n1️⃣ 部署Mock USDC...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const mockUSDC = await MockERC20.deploy("Mock USD Coin", "USDC", 6);
    await mockUSDC.deployed();
    console.log("   ✅ Mock USDC部署到:", mockUSDC.address);

    console.log("\n2️⃣ 部署Mock USDT...");
    const mockUSDT = await MockERC20.deploy("Mock Tether USD", "USDT", 6);
    await mockUSDT.deployed();
    console.log("   ✅ Mock USDT部署到:", mockUSDT.address);

    console.log("\n3️⃣ 部署Mock DAI...");
    const mockDAI = await MockERC20.deploy("Mock Dai Stablecoin", "DAI", 18);
    await mockDAI.deployed();
    console.log("   ✅ Mock DAI部署到:", mockDAI.address);

    // 给用户铸造一些代币
    console.log("\n4️⃣ 为部署者铸造初始代币...");
    const mintAmount = ethers.utils.parseUnits("10000", 6);
    const daiMintAmount = ethers.utils.parseUnits("10000", 18);

    await mockUSDC.mint(deployer.address, mintAmount);
    await mockUSDT.mint(deployer.address, mintAmount);
    await mockDAI.mint(deployer.address, daiMintAmount);
    console.log("   ✅ 已铸造10,000个各种代币");

    // 保存地址
    const addresses = {
        mockUSDC: mockUSDC.address,
        mockUSDT: mockUSDT.address,
        mockDAI: mockDAI.address,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    const addressesPath = path.join(__dirname, "../mock-tokens-addresses.json");
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

    console.log("\n===========================================");
    console.log("✅ 部署完成!");
    console.log("===========================================");
    console.log("\n新的Mock Token地址:");
    console.log("USDC:", mockUSDC.address);
    console.log("USDT:", mockUSDT.address);
    console.log("DAI:", mockDAI.address);

    console.log("\n⚠️ 重要: 请更新以下文件中的代币地址:");
    console.log("1. frontend/lib/contracts.ts");
    console.log("2. 运行 'npm run add-supported-tokens' 将代币添加到PaymentGateway");

    // 生成更新contracts.ts的命令
    console.log("\n📝 复制以下内容更新 frontend/lib/contracts.ts:");
    console.log(`
export const CONTRACTS = {
  // ... 其他合约地址 ...
  MOCK_USDC: '${mockUSDC.address}',
  MOCK_USDT: '${mockUSDT.address}',
  MOCK_DAI: '${mockDAI.address}',
  // ... 其他合约地址 ...
};
    `);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });