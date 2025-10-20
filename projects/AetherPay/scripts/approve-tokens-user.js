
// Save this as approve-tokens-user.js and run with:
// npx hardhat run scripts/approve-tokens-user.js --network op-sepolia

const { ethers } = require("hardhat");

async function main() {
  // This will use the account from PRIVATE_KEY in .env
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // IMPORTANT: Make sure this matches 0x99f8C4e03181022125CAB1A9929Ab44027AD276a
  if (signer.address.toLowerCase() !== "0x99f8C4e03181022125CAB1A9929Ab44027AD276a".toLowerCase()) {
    console.error("❌ Wrong account! Expected: 0x99f8C4e03181022125CAB1A9929Ab44027AD276a");
    console.error("   Got:", signer.address);
    console.error("   Update your .env PRIVATE_KEY to match the frontend account");
    process.exit(1);
  }

  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, signer);

  console.log("\nApproving USDC...");
  const usdcTx = await usdc.approve(PAYMENT_GATEWAY_V2, ethers.constants.MaxUint256);
  await usdcTx.wait();
  console.log("✅ USDC approved!");

  console.log("\nApproving USDT...");
  const usdtTx = await usdt.approve(PAYMENT_GATEWAY_V2, ethers.constants.MaxUint256);
  await usdtTx.wait();
  console.log("✅ USDT approved!");

  // Verify
  const usdcAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
  const usdtAllowance = await usdt.allowance(signer.address, PAYMENT_GATEWAY_V2);

  console.log("\n✅ Allowances set:");
  console.log("   USDC:", usdcAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : "ERROR");
  console.log("   USDT:", usdtAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : "ERROR");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
