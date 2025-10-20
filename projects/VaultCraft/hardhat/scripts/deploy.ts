import { ethers } from "hardhat";

function envBool(key: string, def = false): boolean {
  const v = process.env[key];
  if (!v) return def;
  return ["1", "true", "TRUE", "yes"].includes(v.trim());
}

function envNum(key: string, def: number): number {
  const v = process.env[key];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const initManager = process.env.INIT_MANAGER || deployer.address;
  const initGuardian = process.env.INIT_GUARDIAN || deployer.address;
  const isPrivate = envBool("IS_PRIVATE", false);
  const perfFeeBps = envNum("PERF_FEE_BPS", 1000); // 10%
  const lockDays = envNum("LOCK_DAYS", 1);

  let assetAddr = process.env.ASSET_ADDRESS;
  if (!assetAddr) {
    console.log("Deploying MockERC20 as asset...");
    const Mock = await ethers.getContractFactory("MockERC20");
    const mock = await Mock.deploy("USD Stable", "USDS");
    await mock.waitForDeployment();
    assetAddr = await mock.getAddress();
    // Mint some to deployer for quick testing
    await (await mock.mint(deployer.address, ethers.parseEther("1000000"))).wait();
    console.log(`Mock asset deployed: ${assetAddr}`);
  }

  console.log("Deploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(
    assetAddr,
    "VaultCraft Shares",
    "VSHARE",
    deployer.address, // admin
    initManager,
    initGuardian,
    isPrivate,
    perfFeeBps,
    lockDays
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`Vault deployed: ${vaultAddr}`);

  console.log("Done. Save addresses and proceed with front-end/backend config.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

