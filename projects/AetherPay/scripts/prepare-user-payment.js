#!/usr/bin/env node

/**
 * 为用户准备支付环境
 * 1. 铸造测试代币
 * 2. 授权 PaymentGatewayV2 合约
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================");
  console.log("💳 准备用户支付环境");
  console.log("=================================\n");

  // 获取账户列表
  const accounts = await ethers.getSigners();

  console.log("📋 可用账户:");
  for (let i = 0; i < Math.min(accounts.length, 3); i++) {
    console.log(`   [${i}] ${accounts[i].address}`);
  }

  // 选择要准备的账户（你可以修改这个索引）
  // 0 = 商家账户 (0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c)
  // 1 = 用户账户（如果有的话）
  const userIndex = 1; // 修改这里选择不同的账户

  if (accounts.length <= userIndex) {
    console.log("\n❌ 错误: 账户索引 ${userIndex} 不存在");
    console.log("   请确保 hardhat.config.js 中配置了多个账户");
    process.exit(1);
  }

  const user = accounts[userIndex];
  console.log(`\n✅ 选择账户 [${userIndex}]: ${user.address}`);
  console.log("   这将是支付订单的用户账户\n");

  // 合约地址
  const PAYMENT_GATEWAY = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // ABI
  const mockTokenABI = [
    "function mint(address to, uint256 amount)",
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, mockTokenABI, accounts[0]); // 使用 deployer 账户铸币
  const usdt = new ethers.Contract(MOCK_USDT, mockTokenABI, accounts[0]);

  console.log("=================================");
  console.log("📊 步骤 1: 检查当前状态");
  console.log("=================================\n");

  // 检查余额
  const usdcBalance = await usdc.balanceOf(user.address);
  const usdtBalance = await usdt.balanceOf(user.address);

  console.log("💰 当前余额:");
  console.log(`   USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
  console.log(`   USDT: ${ethers.utils.formatUnits(usdtBalance, 6)}`);

  // 检查授权
  const usdcAllowance = await usdc.allowance(user.address, PAYMENT_GATEWAY);
  const usdtAllowance = await usdt.allowance(user.address, PAYMENT_GATEWAY);

  console.log("\n🔓 当前授权:");
  console.log(`   USDC: ${usdcAllowance.eq(ethers.constants.MaxUint256) ? "UNLIMITED" : ethers.utils.formatUnits(usdcAllowance, 6)}`);
  console.log(`   USDT: ${usdtAllowance.eq(ethers.constants.MaxUint256) ? "UNLIMITED" : ethers.utils.formatUnits(usdtAllowance, 6)}`);

  console.log("\n=================================");
  console.log("📊 步骤 2: 铸造测试代币");
  console.log("=================================\n");

  const mintAmount = ethers.utils.parseUnits("10000", 6); // 10000 代币

  // 铸造 USDC
  if (usdcBalance.lt(mintAmount)) {
    console.log("🪙 铸造 10000 USDC...");
    const tx1 = await usdc.mint(user.address, mintAmount);
    await tx1.wait();
    console.log("   ✅ USDC 铸造成功!");
  } else {
    console.log("   ✅ USDC 余额充足，跳过铸造");
  }

  // 铸造 USDT
  if (usdtBalance.lt(mintAmount)) {
    console.log("🪙 铸造 10000 USDT...");
    const tx2 = await usdt.mint(user.address, mintAmount);
    await tx2.wait();
    console.log("   ✅ USDT 铸造成功!");
  } else {
    console.log("   ✅ USDT 余额充足，跳过铸造");
  }

  // 重新检查余额
  const newUsdcBalance = await usdc.balanceOf(user.address);
  const newUsdtBalance = await usdt.balanceOf(user.address);

  console.log("\n💰 新余额:");
  console.log(`   USDC: ${ethers.utils.formatUnits(newUsdcBalance, 6)}`);
  console.log(`   USDT: ${ethers.utils.formatUnits(newUsdtBalance, 6)}`);

  console.log("\n=================================");
  console.log("📊 步骤 3: 授权合约");
  console.log("=================================\n");

  // 切换到用户账户进行授权
  const usdcAsUser = usdc.connect(user);
  const usdtAsUser = usdt.connect(user);

  // 授权 USDC
  if (usdcAllowance.eq(0)) {
    console.log("🔓 授权 USDC...");
    const tx3 = await usdcAsUser.approve(PAYMENT_GATEWAY, ethers.constants.MaxUint256);
    await tx3.wait();
    console.log("   ✅ USDC 授权成功!");
  } else {
    console.log("   ✅ USDC 已授权");
  }

  // 授权 USDT
  if (usdtAllowance.eq(0)) {
    console.log("🔓 授权 USDT...");
    const tx4 = await usdtAsUser.approve(PAYMENT_GATEWAY, ethers.constants.MaxUint256);
    await tx4.wait();
    console.log("   ✅ USDT 授权成功!");
  } else {
    console.log("   ✅ USDT 已授权");
  }

  // 最终验证
  const finalUsdcAllowance = await usdc.allowance(user.address, PAYMENT_GATEWAY);
  const finalUsdtAllowance = await usdt.allowance(user.address, PAYMENT_GATEWAY);

  console.log("\n=================================");
  console.log("✅ 用户支付环境准备完成！");
  console.log("=================================\n");

  console.log("📋 总结:");
  console.log(`   用户地址: ${user.address}`);
  console.log(`   USDC 余额: ${ethers.utils.formatUnits(newUsdcBalance, 6)}`);
  console.log(`   USDT 余额: ${ethers.utils.formatUnits(newUsdtBalance, 6)}`);
  console.log(`   USDC 授权: ${finalUsdcAllowance.eq(ethers.constants.MaxUint256) ? "✅ UNLIMITED" : finalUsdcAllowance.toString()}`);
  console.log(`   USDT 授权: ${finalUsdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ UNLIMITED" : finalUsdtAllowance.toString()}`);

  console.log("\n💡 下一步:");
  console.log(`1. 在 MetaMask 中切换到账户: ${user.address}`);
  console.log("2. 访问前端支付页面");
  console.log("3. 连接钱包并完成支付");
  console.log("\n⚠️ 重要: 确保 MetaMask 中使用的是上面显示的用户地址！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });