const { ethers } = require("hardhat");

async function main() {
  const proxy = process.env.SBT_PROXY;
  const enabled = String(process.env.ENABLE_CHECKS || "false").toLowerCase() === "true";
  if (!proxy) throw new Error("Missing SBT_PROXY env var");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", await signer.getAddress());
  console.log("Contract:", proxy);
  console.log("Set enforceRegistryChecks:", enabled);

  const abi = ["function setEnforceRegistryChecks(bool)"];
  const sbt = new ethers.Contract(proxy, abi, signer);
  const tx = await sbt.setEnforceRegistryChecks(enabled);
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
