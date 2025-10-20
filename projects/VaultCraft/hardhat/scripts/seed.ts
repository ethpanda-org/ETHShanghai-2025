import { ethers } from "hardhat";

async function main() {
  const [sender] = await ethers.getSigners();
  const VAULT = process.env.VAULT_ADDRESS as string;
  const ASSET = process.env.ASSET_ADDRESS as string;
  const MINT_TO = process.env.MINT_TO || sender.address;
  const MINT_AMOUNT = process.env.MINT_AMOUNT || "1000"; // human units
  const DEPOSIT_TO = process.env.DEPOSIT_TO || sender.address;
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "100";
  const WL = (process.env.WHITELIST || "").split(",").map(s => s.trim()).filter(Boolean);

  if (!VAULT || !ASSET) {
    throw new Error("Please set VAULT_ADDRESS and ASSET_ADDRESS in env");
  }

  console.log(`Seed start on ${ethers.network.name}`);
  console.log({ VAULT, ASSET, MINT_TO, MINT_AMOUNT, DEPOSIT_TO, DEPOSIT_AMOUNT, WL });

  // Mint
  const erc20 = await ethers.getContractAt("MockERC20", ASSET);
  const mintTx = await erc20.mint(MINT_TO, ethers.parseEther(MINT_AMOUNT));
  await mintTx.wait();
  console.log(`Minted ${MINT_AMOUNT} to ${MINT_TO}`);

  // Whitelist
  const vault = await ethers.getContractAt("Vault", VAULT);
  for (const u of WL) {
    const tx = await vault.setWhitelist(u, true);
    await tx.wait();
    console.log(`Whitelisted: ${u}`);
  }

  // Deposit
  const approveTx = await erc20.connect(sender).approve(await vault.getAddress(), ethers.parseEther(DEPOSIT_AMOUNT));
  await approveTx.wait();
  const depTx = await vault.deposit(ethers.parseEther(DEPOSIT_AMOUNT), DEPOSIT_TO);
  await depTx.wait();
  console.log(`Deposited ${DEPOSIT_AMOUNT} to ${DEPOSIT_TO}`);

  console.log("Seed done");
}

main().catch((e) => { console.error(e); process.exit(1); });

