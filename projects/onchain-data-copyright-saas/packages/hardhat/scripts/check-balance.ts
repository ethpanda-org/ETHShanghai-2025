import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.log("❌ PRIVATE_KEY 未设置");
    return;
  }

  const wallet = new ethers.Wallet(privateKey);
  const address = wallet.address;
  
  console.log("钱包地址:", address);
  
  const provider = ethers.provider;
  const balance = await provider.getBalance(address);
  
  console.log("余额:", ethers.utils.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


