import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const CONTRACT_ADDRESS = '0xFb1D71967EeDFDa27EF2038f6b8CcB35286Dc791'
const SIGNER_ADDRESS = '0xbf5c376e1e43b2569c4fa1087160c34070100acc'

const abi = [
  'function MINTER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
]

async function main() {
  const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY } = process.env
  if (!SEPOLIA_RPC_URL || !DEPLOYER_PRIVATE_KEY) {
    throw new Error('Missing SEPOLIA_RPC_URL or DEPLOYER_PRIVATE_KEY in environment')
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet)

  const role = await contract.MINTER_ROLE()
  const alreadyHasRole = await contract.hasRole(role, SIGNER_ADDRESS)

  if (alreadyHasRole) {
    console.log('Signer already has MINTER_ROLE')
    return
  }

  console.log('Granting MINTER_ROLE to', SIGNER_ADDRESS)
  const tx = await contract.grantRole(role, SIGNER_ADDRESS)
  console.log('Tx sent:', tx.hash)
  await tx.wait()
  console.log('MINTER_ROLE granted successfully')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
