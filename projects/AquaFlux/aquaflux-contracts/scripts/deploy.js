const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy token implementations
    console.log("Deploying token implementations...");
    
    const AqToken = await ethers.getContractFactory("AqToken");
    const aqTokenImpl = await AqToken.deploy();
    await aqTokenImpl.waitForDeployment();
    console.log("AqToken implementation deployed to:", await aqTokenImpl.getAddress());

    const PToken = await ethers.getContractFactory("PToken");
    const pTokenImpl = await PToken.deploy();
    await pTokenImpl.waitForDeployment();
    console.log("PToken implementation deployed to:", await pTokenImpl.getAddress());

    const CToken = await ethers.getContractFactory("CToken");
    const cTokenImpl = await CToken.deploy();
    await cTokenImpl.waitForDeployment();
    console.log("CToken implementation deployed to:", await cTokenImpl.getAddress());

    const SToken = await ethers.getContractFactory("SToken");
    const sTokenImpl = await SToken.deploy();
    await sTokenImpl.waitForDeployment();
    console.log("SToken implementation deployed to:", await sTokenImpl.getAddress());

    // Deploy CloneFactory
    console.log("Deploying CloneFactory...");
    const CloneFactory = await ethers.getContractFactory("CloneFactory");
    const factory = await CloneFactory.deploy();
    await factory.waitForDeployment();
    console.log("CloneFactory deployed to:", await factory.getAddress());

    // Set implementations in factory
    console.log("Setting implementations in factory...");
    await factory.setImplementation("AQ", await aqTokenImpl.getAddress());
    await factory.setImplementation("P", await pTokenImpl.getAddress());
    await factory.setImplementation("C", await cTokenImpl.getAddress());
    await factory.setImplementation("S", await sTokenImpl.getAddress());

    // Deploy AquaFluxRegistry
    console.log("Deploying AquaFluxRegistry...");
    const AquaFluxRegistry = await ethers.getContractFactory("AquaFluxRegistry");
    const registry = await upgrades.deployProxy(AquaFluxRegistry, [
        await factory.getAddress(),
        deployer.address
    ]);
    await registry.waitForDeployment();
    console.log("AquaFluxRegistry deployed to:", await registry.getAddress());

    // Grant DEPLOYER_ROLE to registry
    console.log("Granting DEPLOYER_ROLE to registry...");
    await factory.grantRole(await factory.DEPLOYER_ROLE(), await registry.getAddress());

    console.log("Deployment completed successfully!");
    console.log("Registry address:", await registry.getAddress());
    console.log("Factory address:", await factory.getAddress());
    console.log("AqToken implementation:", await aqTokenImpl.getAddress());
    console.log("PToken implementation:", await pTokenImpl.getAddress());
    console.log("CToken implementation:", await cTokenImpl.getAddress());
    console.log("SToken implementation:", await sTokenImpl.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 