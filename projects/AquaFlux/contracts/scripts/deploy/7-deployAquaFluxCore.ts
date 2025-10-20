import 'dotenv/config';
import { upgrades, ethers } from "hardhat";
import { requireAddress, saveAddress } from "./utils";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying AquaFluxCore with the account:", deployer.address);

    // 从 addresses.json 读取依赖的合约地址
    const tokenFactoryAddress = requireAddress("TokenFactory");
    const timelockAddress = requireAddress("AquaFluxTimelock");

    console.log("\n📋 Using deployed contracts:");
    console.log("   TokenFactory:", tokenFactoryAddress);
    console.log("   AquaFluxTimelock:", timelockAddress);

    // 部署 UUPS Proxy
    const AquaFluxCore = await ethers.getContractFactory("AquaFluxCore");
    const proxy = await upgrades.deployProxy(
        AquaFluxCore,
        [tokenFactoryAddress, deployer.address, timelockAddress],
        { initializer: "initialize", kind: "uups" }
    );

    await proxy.waitForDeployment();

    // 获取 Proxy & Implementation 地址
    const proxyAddress = await proxy.getAddress();
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const txHash = proxy.deploymentTransaction()?.hash;

    console.log("\n✅ AquaFluxCore Proxy deployed at:", proxyAddress);
    console.log("✅ Implementation at:", implAddress);

    // 保存 Proxy 地址（主要使用的地址）
    saveAddress("AquaFluxCore", proxyAddress, txHash);
    // 也保存 Implementation 地址以便追踪
    saveAddress("AquaFluxCore_Implementation", implAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
