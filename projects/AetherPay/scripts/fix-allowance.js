#!/usr/bin/env node

/**
 * 全面授权修复脚本
 * 解决因地址大小写不一致导致的授权失败问题
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================");
  console.log("🔧 全面授权修复工具");
  console.log("=================================\n");

  const [signer] = await ethers.getSigners();
  console.log("🔑 当前账户:", signer.address);

  // 合约地址的不同格式
  const PAYMENT_GATEWAY_CHECKSUMMED = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  const PAYMENT_GATEWAY_LOWERCASE = "0x4995168d409767330d9693034d5cffc7daffb89b";

  // 代币地址
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

  const tokens = [
    { address: MOCK_USDC, name: "USDC" },
    { address: MOCK_USDT, name: "USDT" }
  ];

  for (const token of tokens) {
    console.log(`\n💰 检查 ${token.name}:`);
    console.log("=====================================");

    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);

    // 检查余额
    const balance = await tokenContract.balanceOf(signer.address);
    console.log(`   余额: ${ethers.utils.formatUnits(balance, 6)} ${token.name}`);

    // 检查对不同格式地址的授权
    const allowance1 = await tokenContract.allowance(signer.address, PAYMENT_GATEWAY_CHECKSUMMED);
    const allowance2 = await tokenContract.allowance(signer.address, PAYMENT_GATEWAY_LOWERCASE);

    console.log(`\n   对 Checksummed 地址的授权:`);
    console.log(`     ${PAYMENT_GATEWAY_CHECKSUMMED}`);
    console.log(`     授权额度: ${ethers.utils.formatUnits(allowance1, 6)} ${token.name}`);

    console.log(`\n   对 Lowercase 地址的授权:`);
    console.log(`     ${PAYMENT_GATEWAY_LOWERCASE}`);
    console.log(`     授权额度: ${ethers.utils.formatUnits(allowance2, 6)} ${token.name}`);

    // 使用 ethers.utils.getAddress 获取标准格式
    const standardAddress = ethers.utils.getAddress(PAYMENT_GATEWAY_LOWERCASE);
    console.log(`\n   标准化地址: ${standardAddress}`);

    const allowance3 = await tokenContract.allowance(signer.address, standardAddress);
    console.log(`   对标准化地址的授权: ${ethers.utils.formatUnits(allowance3, 6)} ${token.name}`);

    // 检查是否需要授权
    const needsAuth = allowance1.eq(0) || allowance2.eq(0) || allowance3.eq(0);

    if (needsAuth) {
      console.log(`\n   ⚠️ 检测到授权不一致或为0！`);
      console.log(`   🔄 正在修复授权...`);

      const maxUint256 = ethers.constants.MaxUint256;

      // 如果有任何非零授权，先撤销它
      if (!allowance1.eq(0) || !allowance2.eq(0) || !allowance3.eq(0)) {
        console.log(`   📝 先撤销现有授权...`);

        if (!allowance1.eq(0)) {
          const tx1 = await tokenContract.approve(PAYMENT_GATEWAY_CHECKSUMMED, 0);
          await tx1.wait();
          console.log(`   ✅ 已撤销对 checksummed 地址的授权`);
        }

        if (!allowance2.eq(0)) {
          const tx2 = await tokenContract.approve(PAYMENT_GATEWAY_LOWERCASE, 0);
          await tx2.wait();
          console.log(`   ✅ 已撤销对 lowercase 地址的授权`);
        }
      }

      // 授权标准化地址（这会同时覆盖所有格式）
      console.log(`\n   📝 授权标准化地址...`);
      const tx = await tokenContract.approve(standardAddress, maxUint256);
      console.log(`   交易哈希: ${tx.hash}`);
      console.log(`   等待确认...`);

      const receipt = await tx.wait();
      console.log(`   ✅ 授权成功! 区块号: ${receipt.blockNumber}`);

      // 验证授权
      console.log(`\n   🔍 验证新授权:`);
      const newAllowance1 = await tokenContract.allowance(signer.address, PAYMENT_GATEWAY_CHECKSUMMED);
      const newAllowance2 = await tokenContract.allowance(signer.address, PAYMENT_GATEWAY_LOWERCASE);
      const newAllowance3 = await tokenContract.allowance(signer.address, standardAddress);

      console.log(`   Checksummed: ${newAllowance1.toString()}`);
      console.log(`   Lowercase: ${newAllowance2.toString()}`);
      console.log(`   Standard: ${newAllowance3.toString()}`);

      if (newAllowance1.gt(0) && newAllowance2.gt(0) && newAllowance3.gt(0)) {
        console.log(`   ✅ ${token.name} 授权修复成功！`);
      } else {
        console.log(`   ❌ ${token.name} 授权可能仍有问题，请手动检查`);
      }
    } else {
      console.log(`\n   ✅ ${token.name} 授权状态正常`);
    }
  }

  console.log("\n=================================");
  console.log("🎉 授权检查和修复完成！");
  console.log("=================================");
  console.log("\n💡 提示: 现在可以尝试在前端进行支付了");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });