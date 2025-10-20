import { ethers } from "hardhat";
import { saveInteractionsData } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying Mock RWA Token with account:", deployer.address);

    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Mock RWA Token", "MRWA");

    await mockToken.waitForDeployment();

    const address = await mockToken.getAddress();
    const txHash = mockToken.deploymentTransaction()?.hash;

    console.log("✅ MockToken deployed at:", address);
    console.log("   Name: Mock RWA Token");
    console.log("   Symbol: MRWA");
    if (txHash) {
        console.log("   Tx hash:", txHash);
    }

    // 保存 MockToken 信息到 interactions.json
    saveInteractionsData({
        mockToken: {
            address,
            name: "Mock RWA Token",
            symbol: "MRWA",
            deployedAt: new Date().toISOString(),
        },
    });

    console.log("\n📝 MockToken address saved to interactions.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
