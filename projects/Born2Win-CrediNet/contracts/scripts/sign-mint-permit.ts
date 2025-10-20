import { ethers } from "hardhat";

async function main() {
  const [issuer] = await ethers.getSigners();
  const proxy = process.env.SBT_PROXY as string;
  const name = process.env.SBT_NAME || "CrediNet SBT Up";
  const to = process.env.MINT_TO as string;
  const badgeType = Number(process.env.MINT_TYPE || 1);
  const tokenURI = process.env.MINT_TOKEN_URI || "";
  const requestHash = process.env.MINT_REQUEST_HASH as `0x${string}`;
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const contract = await ethers.getContractAt("CrediNetSBTUpgradeable", proxy);
  const { chainId } = await ethers.provider.getNetwork();

  const domain = { name, version: "CrediNet SBT Up v1", chainId: Number(chainId), verifyingContract: proxy };
  const types = {
    Mint: [
      { name: "to", type: "address" },
      { name: "badgeType", type: "uint8" },
      { name: "tokenURI", type: "string" },
      { name: "requestHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const nonce = await contract.nonces(issuer.address);
  const value = { to, badgeType, tokenURI, requestHash, nonce, deadline };
  const signature = await issuer.signTypedData(domain, types as any, value);
  console.log("\n--- EIP-712 Mint Permit ---");
  console.log("issuer:", issuer.address);
  console.log("verifyingContract:", proxy);
  console.log("to:", to);
  console.log("badgeType:", badgeType);
  console.log("tokenURI:", tokenURI);
  console.log("requestHash:", requestHash);
  console.log("nonce:", nonce.toString());
  console.log("deadline:", deadline);
  console.log("chainId:", Number(chainId));
  console.log("signature:", signature);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


