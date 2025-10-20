import { ethers } from "hardhat";
import { requireInteractionData } from "./utils";

async function main() {
    const [user] = await ethers.getSigners();

    console.log("Minting Mock RWA Tokens to account:", user.address);

    // 从 interactions.json 读取 MockToken 地址
    const mockTokenData = requireInteractionData(
        "mockToken",
        "Please run 1-deployRWAMockERC20.ts first"
    );

    console.log("\n📋 Using MockToken:");
    console.log("   Address:", mockTokenData.address);
    console.log("   Name:", mockTokenData.name);
    console.log("   Symbol:", mockTokenData.symbol);

    const MockToken = await ethers.getContractAt("MockERC20", mockTokenData.address);

    // Mint tokens to user
    const mintAmount = "1000000"; // 1 million tokens
    console.log(`\n🔧 Minting ${mintAmount} ${mockTokenData.symbol} to ${user.address}...`);

    const tx = await MockToken.mint(user.address, ethers.parseEther(mintAmount));
    console.log("   📤 Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Minted in block:", receipt.blockNumber);

    // 检查余额
    const balance = await MockToken.balanceOf(user.address);
    console.log(`\n🔍 Current balance: ${ethers.formatEther(balance)} ${mockTokenData.symbol}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
