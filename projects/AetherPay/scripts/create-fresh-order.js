const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Creating order with account:", signer.address);

  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  // Create a simple test order
  const orderId = `TEST_${Date.now()}`;
  const tx = await gateway.createOrder(
    orderId,
    ethers.utils.parseUnits("1", 6), // 1 USDC
    MOCK_USDC,
    MOCK_USDC,
    "",
    false,
    ethers.constants.AddressZero
  );

  await tx.wait();
  console.log("\n✅ New order created:", orderId);
  console.log("📝 Payment URL: http://localhost:3000/pay/" + orderId);
}

main().catch(console.error);
