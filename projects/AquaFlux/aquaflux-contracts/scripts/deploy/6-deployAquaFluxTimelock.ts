import 'dotenv/config';
import { ethers } from "hardhat";
import { saveAddress } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying AquaFluxTimelock with the account:", deployer.address);

    const AquaFluxTimelock = await ethers.getContractFactory("AquaFluxTimelock");
    const MIN_DELAY = 20; // 20 seconds for demo purposes

    const deployment = await AquaFluxTimelock.deploy(
        MIN_DELAY,
        [deployer.address], // proposers
        [deployer.address, ethers.ZeroAddress], // executors (deployer + anyone can execute)
        deployer.address // admin
    );

    // ✅ ethers v6 等待部署完成
    await deployment.waitForDeployment();

    const address = await deployment.getAddress();
    const txHash = deployment.deploymentTransaction()?.hash;

    console.log("✅ AquaFluxTimelock deployed at:", address);
    console.log(`   Min delay: ${MIN_DELAY} seconds`);

    // 保存地址到 addresses.json
    saveAddress("AquaFluxTimelock", address, txHash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
