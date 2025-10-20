import { ethers } from 'ethers'

const provider = new ethers.JsonRpcProvider('https://1rpc.io/sepolia')
const contractAddress = '0xFb1D71967EeDFDa27EF2038f6b8CcB35286Dc791'
const abi = [
  'function MINTER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function owner() view returns (address)',
]

async function main() {
  const contract = new ethers.Contract(contractAddress, abi, provider)
  const role = await contract.MINTER_ROLE()
  console.log('MINTER_ROLE:', role)

  const accounts = [
    '0xbf5c376e1e43b2569c4fa1087160c34070100acc',
    '0x9C7393813Da1b83844eBeB2CAbA64e38475a92d7',
  ]

  for (const acc of accounts) {
    const has = await contract.hasRole(role, acc)
    console.log(`hasRole(${acc}):`, has)
  }

  const owner = await contract.owner()
  console.log('owner:', owner)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
