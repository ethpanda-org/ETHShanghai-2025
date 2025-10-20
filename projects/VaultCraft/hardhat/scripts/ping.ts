import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  const [chainIdHex, blockNumber, gasPriceHex] = await Promise.all([
    provider.send("eth_chainId", []),
    provider.getBlockNumber(),
    provider.send("eth_gasPrice", []),
  ]);
  const chainId = Number(chainIdHex);
  const gasPrice = BigInt(gasPriceHex).toString();
  console.log(JSON.stringify({ network: (await provider.getNetwork()).name, chainId, blockNumber, gasPrice }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
