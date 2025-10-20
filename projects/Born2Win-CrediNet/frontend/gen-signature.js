import { ethers } from 'ethers';

(async () => {
  const issuerPrivateKey = '0xea6decd734ff918e90fdc82d8177eb6051b803c3facb1885eff2ad58113b3fae';
  const proxy = '0xec261261c83B76549181909ec09995e56Ca549E7';
  const to = '0xB95E8e0960Ad789D560AD6e65D574180Af9361b8';
  const requestHash = '0x8f17fa27955a33340ad3a5d41db4e4d0ec44c9abf2798a3961ab6fdd269bb092';
  const badgeType = 1;
  const tokenURI = '';

  const rpc = 'https://rpc.sepolia.org';
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(issuerPrivateKey, provider);

  const name = 'CrediNet SBT Up';
  const version = 'CrediNet SBT Up v1';
  const chain = await provider.getNetwork();

  const abi = ['function nonces(address) view returns (uint256)'];
  const contract = new ethers.Contract(proxy, abi, wallet);
  const nonce = await contract.nonces(wallet.address);

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const domain = {
    name,
    version,
    chainId: Number(chain.chainId),
    verifyingContract: proxy,
  };

  const types = {
    Mint: [
      { name: 'to', type: 'address' },
      { name: 'badgeType', type: 'uint8' },
      { name: 'tokenURI', type: 'string' },
      { name: 'requestHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const value = { to, badgeType, tokenURI, requestHash, nonce, deadline };

  const signature = await wallet.signTypedData(domain, types, value);

  console.log(JSON.stringify({
    issuer: wallet.address,
    verifyingContract: proxy,
    to,
    badgeType,
    tokenURI,
    requestHash,
    nonce: nonce.toString(),
    deadline,
    chainId: Number(chain.chainId),
    signature,
  }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });