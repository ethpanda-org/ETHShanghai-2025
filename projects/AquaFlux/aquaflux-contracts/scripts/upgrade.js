const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading contracts with the account:", deployer.address);

    // Get the proxy address from command line or use default
    const proxyAddress = process.env.PROXY_ADDRESS || "0x..."; // Replace with actual proxy address
    
    if (proxyAddress === "0x...") {
        console.error("Please set PROXY_ADDRESS environment variable");
        process.exit(1);
    }

    console.log("Upgrading AquaFluxRegistry at:", proxyAddress);

    // Deploy new implementation
    const AquaFluxRegistry = await ethers.getContractFactory("AquaFluxRegistry");
    
    // Upgrade the proxy
    const upgraded = await upgrades.upgradeProxy(proxyAddress, AquaFluxRegistry);
    await upgraded.waitForDeployment();
    
    console.log("AquaFluxRegistry upgraded successfully!");
    console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 