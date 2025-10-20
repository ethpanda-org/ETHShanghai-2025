/**
 * 快速修复：为 PaymentGatewayV2 添加 USDC 支持
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function loadAddresses() {
  try {
    const p = path.join(__dirname, "../addresses.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return JSON.parse(fs.readFileSync("./addresses.json", "utf8"));
  }
}

async function main() {
  console.log("🔧 修复 PaymentGatewayV2 USDC 支持\n");

  const addr = await loadAddresses();
  const contracts = addr.contracts || addr;
  const tokens = addr.tokens || {};

  const paymentGatewayAddress = contracts.paymentGatewayV2 || contracts.PaymentGatewayV2;
  const usdcAddress = tokens.USDC || tokens.MockUSDC || addr.USDC;
  const usdtAddress = tokens.USDT || tokens.MockUSDT || addr.USDT;

  const [deployer] = await ethers.getSigners();
  console.log(`部署者: ${deployer.address}`);

  const gateway = await ethers.getContractAt("PaymentGatewayV2", paymentGatewayAddress);

  console.log("📋 合约地址:");
  console.log(`PaymentGatewayV2: ${paymentGatewayAddress}`);
  console.log(`USDC: ${usdcAddress}`);
  console.log(`USDT: ${usdtAddress}\n`);

  // 检查当前支持状态
  console.log("1️⃣ 检查当前代币支持状态...");
  try {
    const usdcSupported = await gateway.supportedTokens(usdcAddress);
    const usdtSupported = usdtAddress ? await gateway.supportedTokens(usdtAddress) : false;
    
    console.log(`USDC 支持状态: ${usdcSupported ? '✅ 已支持' : '❌ 未支持'}`);
    if (usdtAddress) {
      console.log(`USDT 支持状态: ${usdtSupported ? '✅ 已支持' : '❌ 未支持'}`);
    }

    // 添加 USDC 支持
    if (!usdcSupported) {
      console.log("\n2️⃣ 添加 USDC 支持...");
      const addUsdcTx = await gateway.addSupportedToken(usdcAddress);
      await addUsdcTx.wait();
      console.log(`✅ USDC 已添加为支持代币`);
      console.log(`   交易哈希: ${addUsdcTx.hash}`);
    } else {
      console.log("\n✅ USDC 已经支持，无需添加");
    }

    // 添加 USDT 支持（如果存在）
    if (usdtAddress && !usdtSupported) {
      console.log("\n3️⃣ 添加 USDT 支持...");
      const addUsdtTx = await gateway.addSupportedToken(usdtAddress);
      await addUsdtTx.wait();
      console.log(`✅ USDT 已添加为支持代币`);
      console.log(`   交易哈希: ${addUsdtTx.hash}`);
    } else if (usdtAddress) {
      console.log("\n✅ USDT 已经支持，无需添加");
    }

    // 验证最终状态
    console.log("\n4️⃣ 验证最终状态...");
    const finalUsdcSupported = await gateway.supportedTokens(usdcAddress);
    const finalUsdtSupported = usdtAddress ? await gateway.supportedTokens(usdtAddress) : false;
    
    console.log(`USDC 最终状态: ${finalUsdcSupported ? '✅ 支持' : '❌ 不支持'}`);
    if (usdtAddress) {
      console.log(`USDT 最终状态: ${finalUsdtSupported ? '✅ 支持' : '❌ 不支持'}`);
    }

    if (finalUsdcSupported) {
      console.log("\n🎉 修复完成！现在可以运行捐赠测试了");
      console.log("\n📝 下一步：");
      console.log("   npx hardhat run --no-compile scripts/test-donation-v2.js --network op-sepolia");
    } else {
      console.log("\n❌ 修复失败，请检查权限或合约状态");
    }

  } catch (error) {
    console.error("\n❌ 修复过程中出错:", error.message);
    
    // 提供诊断信息
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n💡 诊断：当前账户不是合约所有者");
      console.log("   请确认使用部署合约的账户运行此脚本");
    } else if (error.message.includes("function selector was not recognized")) {
      console.log("\n💡 诊断：合约可能没有 addSupportedToken 函数");
      console.log("   请检查 PaymentGatewayV2 合约是否为最新版本");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });