const { ethers, upgrades } = require("hardhat");

async function main() {
  const name = process.env.SBT_NAME || "CrediNet SBT Up";
  const symbol = process.env.SBT_SYMBOL || "CNSBTU";
  const baseURI = process.env.SBT_BASE_URI || "";
  const forwarder = process.env.TRUSTED_FORWARDER || ethers.ZeroAddress;
  const Factory = await ethers.getContractFactory("CrediNetSBTUpgradeable");
  const proxy = await upgrades.deployProxy(Factory, [name, symbol, baseURI, forwarder], { kind: "uups" });
  await proxy.waitForDeployment();
  console.log("SBT UUPS deployed:", await proxy.getAddress());
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


