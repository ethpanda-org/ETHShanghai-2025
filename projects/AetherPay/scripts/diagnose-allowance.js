#!/usr/bin/env node

/**
 * 账户授权诊断工具
 * 诊断并修复指定账户的授权问题
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================");
  console.log("🔍 账户授权诊断工具");
  console.log("=================================\n");

  // 获取所有可用账户
  const accounts = await ethers.getSigners();
  console.log("📋 可用账户列表:");
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    console.log(`   [${i}] ${accounts[i].address}`);
  }

  // 使用第一个账户（你可以修改这里使用不同的账户）
  const signer = accounts[0];
  console.log("\n🔑 当前使用账户:", signer.address);

  // 获取账户余额
  const balance = await signer.getBalance();
  console.log("   ETH 余额:", ethers.utils.formatEther(balance), "ETH");

  // 合约地址
  const PAYMENT_GATEWAY = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // ERC20 ABI
  const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];

  console.log("\n📍 PaymentGatewayV2 地址:");
  console.log(`   ${PAYMENT_GATEWAY}`);

  // 检查所有重要账户的授权状态
  const importantAccounts = [
    signer.address,
    "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c", // 之前脚本使用的账户
    "0xA0d05f16ABAB24e11De6a7B4A0f816a88B67FfaE"  // debug-allowance.js 中的账户
  ];

  for (const tokenInfo of [
    { address: MOCK_USDC, name: "USDC" },
    { address: MOCK_USDT, name: "USDT" }
  ]) {
    console.log(`\n💰 ${tokenInfo.name} 代币授权状态:`);
    console.log("=====================================");

    const token = new ethers.Contract(tokenInfo.address, ERC20_ABI, signer);

    for (const account of importantAccounts) {
      try {
        const balance = await token.balanceOf(account);
        const allowance = await token.allowance(account, PAYMENT_GATEWAY);

        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        const allowanceFormatted = allowance.eq(ethers.constants.MaxUint256)
          ? "UNLIMITED"
          : ethers.utils.formatUnits(allowance, 6);

        console.log(`\n   账户: ${account}`);
        console.log(`   余额: ${balanceFormatted} ${tokenInfo.name}`);
        console.log(`   授权: ${allowanceFormatted}`);

        if (allowance.eq(0)) {
          console.log(`   ⚠️ 该账户未授权！`);
        } else if (allowance.eq(ethers.constants.MaxUint256)) {
          console.log(`   ✅ 该账户已完全授权`);
        } else {
          console.log(`   ⚠️ 该账户部分授权`);
        }
      } catch (error) {
        console.log(`   ❌ 无法查询账户 ${account}: ${error.message}`);
      }
    }
  }

  // 询问是否要为当前账户授权
  console.log("\n=====================================");
  console.log("💡 诊断结果:");
  console.log(`   当前连接账户: ${signer.address}`);
  console.log(`   请确保你在前端使用的是同一个账户！`);
  console.log("\n   如果前端使用的账户不同，请:");
  console.log("   1. 在 MetaMask 中切换到正确的账户");
  console.log("   2. 或者为前端使用的账户执行授权");
  console.log("\n   提示: 前端页面会显示当前连接的钱包地址");
  console.log("         请对比该地址与上面显示的授权状态");
  console.log("=====================================\n");

  // 检查当前账户是否需要授权
  const usdcContract = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);
  const usdtContract = new ethers.Contract(MOCK_USDT, ERC20_ABI, signer);

  const usdcAllowance = await usdcContract.allowance(signer.address, PAYMENT_GATEWAY);
  const usdtAllowance = await usdtContract.allowance(signer.address, PAYMENT_GATEWAY);

  if (usdcAllowance.eq(0) || usdtAllowance.eq(0)) {
    console.log(`⚠️ 当前账户 ${signer.address} 需要授权！`);
    console.log(`\n是否要立即为该账户授权？(输入 yes 继续)`);

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('> ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log("\n🔓 开始授权...");

        // 授权 USDC
        if (usdcAllowance.eq(0)) {
          console.log("   授权 USDC...");
          const tx1 = await usdcContract.approve(PAYMENT_GATEWAY, ethers.constants.MaxUint256);
          await tx1.wait();
          console.log("   ✅ USDC 授权成功!");
        }

        // 授权 USDT
        if (usdtAllowance.eq(0)) {
          console.log("   授权 USDT...");
          const tx2 = await usdtContract.approve(PAYMENT_GATEWAY, ethers.constants.MaxUint256);
          await tx2.wait();
          console.log("   ✅ USDT 授权成功!");
        }

        console.log("\n🎉 授权完成！");
        console.log("   现在可以在前端使用该账户进行支付了");
      }
      rl.close();
    });
  } else {
    console.log(`✅ 当前账户 ${signer.address} 已完全授权`);
    console.log("\n如果前端仍然报错，请检查:");
    console.log("1. 前端连接的是否是这个账户: ${signer.address}");
    console.log("2. 订单金额是否超过了账户余额");
    console.log("3. 网络是否为 OP Sepolia");
  }
}

main()
  .then(() => console.log("\n✅ 诊断完成"))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });