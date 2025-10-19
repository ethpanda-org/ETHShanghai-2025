// 快速部署 PaymentGatewayV2 并连接到新的 PublicGoodsFundV2
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 快速部署 PaymentGatewayV2...\n");

  const [deployer] = await ethers.getSigners();

  // 使用新部署的 PublicGoodsFundV2（包含修复）
  const PUBLIC_GOODS_FUND_V2 = "0x61E95B1551168D3f9F2C9EE6427705fCDC26b950";
  const FX_ROUTER = "0x81C8F2AdD03187A17F8998541e27E2dD7566c504";
  const MOCK_USDC = "0xb7225051e57db0296C1F56fbD536Acd06c889724";
  const MOCK_USDT = "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2";

  console.log("使用 PublicGoodsFundV2:", PUBLIC_GOODS_FUND_V2);

  // 部署 PaymentGatewayV2
  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    deployer.address,
    deployer.address,
    PUBLIC_GOODS_FUND_V2,
    ethers.constants.AddressZero
  );
  await paymentGateway.deployed();

  const PAYMENT_GATEWAY_V2 = paymentGateway.address;
  console.log("✅ PaymentGatewayV2 部署到:", PAYMENT_GATEWAY_V2);

  // 授权
  const publicGoodsFund = await ethers.getContractAt("PublicGoodsFundV2", PUBLIC_GOODS_FUND_V2);
  await publicGoodsFund.addAuthorizedGateway(PAYMENT_GATEWAY_V2);
  console.log("✓ 授权完成");

  // 配置
  await paymentGateway.addSupportedToken(MOCK_USDC);
  await paymentGateway.addSupportedToken(MOCK_USDT);
  await paymentGateway.setTokenSymbol(MOCK_USDC, "USDC");
  await paymentGateway.setTokenSymbol(MOCK_USDT, "USDT");
  console.log("✓ 配置完成");

  // 更新前端配置
  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  let frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  frontendConfig = frontendConfig
    .replace(/PAYMENT_GATEWAY_V2:\s*['"][^'"]+['"]/, `PAYMENT_GATEWAY_V2: '${PAYMENT_GATEWAY_V2}'`)
    .replace(/PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/, `PUBLIC_GOODS_FUND: '${PUBLIC_GOODS_FUND_V2}'`);

  fs.writeFileSync(frontendConfigPath, frontendConfig);

  console.log("\n✅ 部署完成！");
  console.log("=====================================");
  console.log("PaymentGatewayV2:", PAYMENT_GATEWAY_V2);
  console.log("PublicGoodsFundV2:", PUBLIC_GOODS_FUND_V2);
  console.log("=====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });