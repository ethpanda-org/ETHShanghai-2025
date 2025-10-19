#!/usr/bin/env node

/**
 * 为指定用户地址铸造测试代币并授权
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================");
  console.log("💳 为用户准备测试代币");
  console.log("=================================\n");

  // 用户地址（从私钥导出的地址）
  const USER_ADDRESS = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
  console.log("🎯 目标用户地址:", USER_ADDRESS);

  // 使用部署者账户（有权限铸币）
  const [deployer] = await ethers.getSigners();
  console.log("🔑 使用部署者账户:", deployer.address);

  // 合约地址
  const PAYMENT_GATEWAY = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // ABI
  const mockTokenABI = [
    "function mint(address to, uint256 amount)",
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  // 获取代币合约
  const usdc = new ethers.Contract(MOCK_USDC, mockTokenABI, deployer);
  const usdt = new ethers.Contract(MOCK_USDT, mockTokenABI, deployer);

  console.log("\n=================================");
  console.log("📊 步骤 1: 检查当前状态");
  console.log("=================================\n");

  // 检查余额
  const usdcBalance = await usdc.balanceOf(USER_ADDRESS);
  const usdtBalance = await usdt.balanceOf(USER_ADDRESS);

  console.log("💰 当前余额:");
  console.log(`   USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
  console.log(`   USDT: ${ethers.utils.formatUnits(usdtBalance, 6)}`);

  // 检查授权
  const usdcAllowance = await usdc.allowance(USER_ADDRESS, PAYMENT_GATEWAY);
  const usdtAllowance = await usdt.allowance(USER_ADDRESS, PAYMENT_GATEWAY);

  console.log("\n🔓 当前授权状态:");
  console.log(`   USDC 对 PaymentGateway 的授权: ${usdcAllowance.eq(ethers.constants.MaxUint256) ? "✅ UNLIMITED" : ethers.utils.formatUnits(usdcAllowance, 6)}`);
  console.log(`   USDT 对 PaymentGateway 的授权: ${usdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ UNLIMITED" : ethers.utils.formatUnits(usdtAllowance, 6)}`);

  console.log("\n=================================");
  console.log("📊 步骤 2: 铸造测试代币");
  console.log("=================================\n");

  const mintAmount = ethers.utils.parseUnits("10000", 6); // 10000 代币

  // 铸造 USDC
  console.log("🪙 铸造 10000 USDC 给用户...");
  try {
    const tx1 = await usdc.mint(USER_ADDRESS, mintAmount);
    console.log(`   交易哈希: ${tx1.hash}`);
    await tx1.wait();
    console.log("   ✅ USDC 铸造成功!");
  } catch (error) {
    console.error("   ❌ USDC 铸造失败:", error.message);
  }

  // 铸造 USDT
  console.log("\n🪙 铸造 10000 USDT 给用户...");
  try {
    const tx2 = await usdt.mint(USER_ADDRESS, mintAmount);
    console.log(`   交易哈希: ${tx2.hash}`);
    await tx2.wait();
    console.log("   ✅ USDT 铸造成功!");
  } catch (error) {
    console.error("   ❌ USDT 铸造失败:", error.message);
  }

  // 重新检查余额
  const newUsdcBalance = await usdc.balanceOf(USER_ADDRESS);
  const newUsdtBalance = await usdt.balanceOf(USER_ADDRESS);

  console.log("\n💰 铸造后的余额:");
  console.log(`   USDC: ${ethers.utils.formatUnits(newUsdcBalance, 6)}`);
  console.log(`   USDT: ${ethers.utils.formatUnits(newUsdtBalance, 6)}`);

  console.log("\n=================================");
  console.log("📊 步骤 3: 提醒用户授权");
  console.log("=================================\n");

  if (usdcAllowance.eq(0) || usdtAllowance.eq(0)) {
    console.log("⚠️ 注意: 用户还需要授权 PaymentGateway 合约使用代币");
    console.log("\n📝 用户需要执行以下操作:");
    console.log("1. 在前端页面连接钱包（地址: " + USER_ADDRESS + "）");
    console.log("2. 点击 'Approve' 按钮授权代币");
    console.log("3. 然后点击 'Pay Now' 完成支付");
  } else {
    console.log("✅ 用户已经授权，可以直接支付！");
  }

  console.log("\n=================================");
  console.log("✅ 测试代币铸造完成！");
  console.log("=================================\n");

  console.log("📋 总结:");
  console.log(`   用户地址: ${USER_ADDRESS}`);
  console.log(`   USDC 余额: ${ethers.utils.formatUnits(newUsdcBalance, 6)}`);
  console.log(`   USDT 余额: ${ethers.utils.formatUnits(newUsdtBalance, 6)}`);
  console.log(`   授权状态: ${(usdcAllowance.eq(0) || usdtAllowance.eq(0)) ? "❌ 需要授权" : "✅ 已授权"}`);

  console.log("\n💡 下一步:");
  console.log("1. 确保 MetaMask 中导入了这个账户");
  console.log("2. 在前端页面连接这个钱包地址");
  console.log("3. 如果需要，点击 Approve 按钮授权");
  console.log("4. 点击 Pay Now 完成支付");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });