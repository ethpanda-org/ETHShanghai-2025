import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env" });

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error("No signer available. Provide DEPLOYER_PRIVATE_KEY.");
  }

  const admin = process.env.ALPHA_VAULT_ADMIN ?? signer.address;
  const operator = process.env.ALPHA_VAULT_OPERATOR ?? signer.address;

  console.info("Deploying AlphaVault with account:", signer.address);
  console.info("Vault admin:", admin);
  console.info("Operator:", operator);

  const factory = await ethers.getContractFactory("AlphaVault", signer);
  const contract = await factory.deploy(admin, operator);
  await contract.deployed();

  console.info("AlphaVault deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
