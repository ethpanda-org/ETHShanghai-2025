import { task } from "hardhat/config";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

task("vault:whitelist", "Whitelist/unwhitelist an address for a private vault")
  .addParam("vault", "Vault address")
  .addParam("user", "User address")
  .addParam("allowed", "true/false")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const { vault, user, allowed } = args;
    const v = await ethers.getContractAt("Vault", vault);
    const tx = await v.setWhitelist(user, String(allowed).toLowerCase() === "true");
    await tx.wait();
    console.log(`Whitelist set: ${user} -> ${allowed}`);
  });

task("vault:set-adapter", "Allow or disallow an adapter")
  .addParam("vault", "Vault address")
  .addParam("adapter", "Adapter address")
  .addParam("allowed", "true/false")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const v = await ethers.getContractAt("Vault", args.vault);
    const tx = await v.setAdapter(args.adapter, String(args.allowed).toLowerCase() === "true");
    await tx.wait();
    console.log(`Adapter ${args.adapter} allowed=${args.allowed}`);
  });

task("vault:set-lock", "Set minimum lock days")
  .addParam("vault", "Vault address")
  .addParam("days", "Integer days")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const v = await ethers.getContractAt("Vault", args.vault);
    const tx = await v.setLockMinDays(Number(args.days));
    await tx.wait();
    console.log(`Lock days set: ${args.days}`);
  });

task("vault:set-perf-fee", "Set performance fee (bps)")
  .addParam("vault", "Vault address")
  .addParam("bps", "Basis points (e.g. 1000=10%)")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const v = await ethers.getContractAt("Vault", args.vault);
    const tx = await v.setPerformanceFee(Number(args.bps));
    await tx.wait();
    console.log(`Performance fee set: ${args.bps} bps`);
  });

task("vault:snapshot", "Emit a NavSnapshot event on the vault")
  .addParam("vault", "Vault address")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const v = await ethers.getContractAt("Vault", args.vault);
    const tx = await v.snapshot();
    await tx.wait();
    console.log(`Snapshot emitted for ${args.vault}`);
  });

task("vault:deposit", "Approve and deposit into the vault")
  .addParam("vault", "Vault address")
  .addParam("asset", "Asset (ERC20) address")
  .addParam("amount", "Amount in human units")
  .addOptionalParam("receiver", "Receiver address (default: deployer)")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    const receiver = args.receiver || signer.address;
    const v = await ethers.getContractAt("Vault", args.vault);
    const erc20 = new ethers.Contract(args.asset, ERC20_ABI, signer);
    const decimals: number = await erc20.decimals();
    const amt = ethers.parseUnits(String(args.amount), decimals);
    await (await erc20.approve(await v.getAddress(), amt)).wait();
    const tx = await v.deposit(amt, receiver);
    await tx.wait();
    console.log(`Deposited ${args.amount} into ${args.vault} for ${receiver}`);
  });

task("token:mint", "Mint MockERC20 tokens to an address")
  .addParam("token", "MockERC20 address")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount in human units")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    const erc20 = await ethers.getContractAt("MockERC20", args.token, signer);
    const decimals = 18n; // MockERC20 uses 18
    const amt = ethers.parseUnits(String(args.amount), Number(decimals));
    const tx = await erc20.mint(args.to, amt);
    await tx.wait();
    console.log(`Minted ${args.amount} to ${args.to}`);
  });

task("vault:create-private", "Create a private Vault with initial config")
  .addOptionalParam("asset", "ERC20 asset address; if omitted deploys MockERC20")
  .addOptionalParam("name", "Vault share name", "VaultCraft Shares")
  .addOptionalParam("symbol", "Vault share symbol", "VSHARE")
  .addOptionalParam("manager", "Manager address (default: deployer)")
  .addOptionalParam("guardian", "Guardian address (default: deployer)")
  .addOptionalParam("perf", "Performance fee bps (default 1000)", "1000")
  .addOptionalParam("lock", "Lock days (default 1)", "1")
  .addOptionalParam("whitelist", "Comma-separated whitelist addresses", "")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    const manager = args.manager || deployer.address;
    const guardian = args.guardian || deployer.address;
    let assetAddr = args.asset as string | undefined;

    if (!assetAddr) {
      console.log("Deploying MockERC20 as asset...");
      const Mock = await ethers.getContractFactory("MockERC20");
      const mock = await Mock.deploy("USD Stable", "USDS");
      await mock.waitForDeployment();
      assetAddr = await mock.getAddress();
      console.log(`Mock asset: ${assetAddr}`);
      await (await mock.mint(deployer.address, ethers.parseEther("1000000"))).wait();
    }

    console.log("Deploying Private Vault...");
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      assetAddr,
      args.name,
      args.symbol,
      deployer.address,
      manager,
      guardian,
      true,
      Number(args.perf),
      Number(args.lock)
    );
    await vault.waitForDeployment();
    const vaddr = await vault.getAddress();
    console.log(`Vault: ${vaddr}`);

    if (args.whitelist) {
      const addrs = String(args.whitelist)
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      for (const u of addrs) {
        const tx = await vault.setWhitelist(u, true);
        await tx.wait();
        console.log(`Whitelisted: ${u}`);
      }
    }

    console.log("Done.");
    console.log(JSON.stringify({ network: hre.network.name, asset: assetAddr, vault: vaddr }, null, 2));
  });
