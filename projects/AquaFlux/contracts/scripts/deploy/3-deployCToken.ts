import { ethers } from "hardhat";
import { saveAddress } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying CToken with the account:", deployer.address);

    const CToken = await ethers.getContractFactory("CToken");
    const deployment = await CToken.deploy();

    // ✅ ethers v6 等待部署完成
    await deployment.waitForDeployment();

    const address = await deployment.getAddress();
    const txHash = deployment.deploymentTransaction()?.hash;

    console.log("✅ CToken deployed at:", address);

    // 保存地址到 addresses.json
    saveAddress("CToken", address, txHash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
