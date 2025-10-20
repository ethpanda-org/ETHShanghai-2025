import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy MockERC20 tokens for testing
  console.log("Deploying Mock USDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("Mock USDC deployed to:", mockUSDCAddress);

  console.log("\nDeploying Mock DAI...");
  const MockDAI = await hre.ethers.getContractFactory("MockERC20");
  const mockDAI = await MockDAI.deploy("Mock DAI", "DAI", 18);
  await mockDAI.waitForDeployment();
  const mockDAIAddress = await mockDAI.getAddress();
  console.log("Mock DAI deployed to:", mockDAIAddress);

  // Deploy StreamPayment contract
  console.log("\nDeploying StreamPayment contract...");
  const StreamPayment = await hre.ethers.getContractFactory("StreamPayment");
  const streamPayment = await StreamPayment.deploy();
  await streamPayment.waitForDeployment();
  const streamPaymentAddress = await streamPayment.getAddress();
  console.log("StreamPayment deployed to:", streamPaymentAddress);

  // Mint some test tokens to deployer
  console.log("\nMinting test tokens...");
  const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M USDC
  await mockUSDC.mint(deployer.address, mintAmount);
  console.log("Minted 1,000,000 USDC to deployer");

  const mintAmountDAI = hre.ethers.parseUnits("1000000", 18); // 1M DAI
  await mockDAI.mint(deployer.address, mintAmountDAI);
  console.log("Minted 1,000,000 DAI to deployer");

  // Print deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("- Mock USDC:", mockUSDCAddress);
  console.log("- Mock DAI:", mockDAIAddress);
  console.log("- StreamPayment:", streamPaymentAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      mockUSDC: mockUSDCAddress,
      mockDAI: mockDAIAddress,
      streamPayment: streamPaymentAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to:", filename);
  console.log("\n=== Deployment Complete ===\n");

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${mockUSDCAddress} "Mock USDC" "USDC" 6`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${mockDAIAddress} "Mock DAI" "DAI" 18`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${streamPaymentAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

