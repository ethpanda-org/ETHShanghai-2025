const { ethers } = require("hardhat");

/**
 * 生成签名者钱包
 */
async function main() {
  console.log("========================================");
  console.log("生成签名者钱包");
  console.log("========================================");
  console.log("");

  // 生成随机钱包
  const wallet = ethers.Wallet.createRandom();

  console.log("📋 钱包信息:");
  console.log("   地址:", wallet.address);
  console.log("   私钥:", wallet.privateKey);
  console.log("");

  console.log("⚠️  重要提示:");
  console.log("   1. 请妥善保管私钥，不要泄露给任何人");
  console.log("   2. 将私钥添加到后端 .env 文件:");
  console.log(`      SIGNER_PRIVATE_KEY=${wallet.privateKey}`);
  console.log("   3. 在部署合约时，将此地址设置为 SIGNER_ADDRESS:");
  console.log(`      SIGNER_ADDRESS=${wallet.address}`);
  console.log("");

  console.log("========================================");
  console.log("✨ 完成！");
  console.log("========================================");

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

// 执行
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
