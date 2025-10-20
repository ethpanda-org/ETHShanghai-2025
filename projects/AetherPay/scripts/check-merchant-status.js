const { ethers } = require('hardhat');

// Contract addresses
const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const PAYMENT_GATEWAY_V1 = '0xe624C84633FA9C3D250222b202059d03830C52cf';

// Minimal ABI
const ABI = [
  {
    "inputs": [{"internalType": "address", "name": "merchant", "type": "address"}],
    "name": "getMerchantInfo",
    "outputs": [
      {"internalType": "string", "name": "businessName", "type": "string"},
      {"internalType": "uint256", "name": "totalOrders", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVolume", "type": "uint256"},
      {"internalType": "uint256", "name": "pendingBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "feeRate", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const merchantAddress = process.argv[2];

  if (!merchantAddress) {
    console.log('Usage: node scripts/check-merchant-status.js <merchant_address>');
    console.log('Example: node scripts/check-merchant-status.js 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    process.exit(1);
  }

  console.log('\n🔍 Checking Merchant Registration Status\n');
  console.log('Merchant Address:', merchantAddress);
  console.log('');

  try {
    const gatewayV2 = await ethers.getContractAt(ABI, PAYMENT_GATEWAY_V2);
    const gatewayV1 = await ethers.getContractAt(ABI, PAYMENT_GATEWAY_V1);

    // Check V2 (Current)
    console.log('📍 V2 Gateway (Current - 0x4995...)');
    try {
      const infoV2 = await gatewayV2.getMerchantInfo(merchantAddress);
      console.log('  Business Name:', infoV2.businessName || '(empty)');
      console.log('  Is Active:', infoV2.isActive);
      console.log('  Total Orders:', infoV2.totalOrders.toString());
      console.log('');

      if (!infoV2.isActive) {
        console.log('❌ PROBLEM FOUND: Merchant NOT registered on V2 gateway!');
        console.log('');
        console.log('🔧 SOLUTION:');
        console.log('  1. Visit http://localhost:3000/dashboard');
        console.log('  2. Connect wallet:', merchantAddress);
        console.log('  3. Click "Register Merchant Account"');
        console.log('  4. Confirm transaction and wait for confirmation');
        console.log('  5. Refresh page to verify registration');
        console.log('');
      } else {
        console.log('✅ Merchant is properly registered on V2 gateway');
        console.log('');
      }
    } catch (error) {
      console.log('  Error querying V2:', error.message);
      console.log('');
    }

    // Check V1 (Old)
    console.log('📍 V1 Gateway (Old/Deprecated - 0xe624...)');
    try {
      const infoV1 = await gatewayV1.getMerchantInfo(merchantAddress);
      console.log('  Business Name:', infoV1.businessName || '(empty)');
      console.log('  Is Active:', infoV1.isActive);
      console.log('  Total Orders:', infoV1.totalOrders.toString());
      console.log('');

      if (infoV1.isActive) {
        console.log('⚠️  NOTE: Merchant is registered on OLD V1 gateway');
        console.log('   This is expected if you registered before the fix.');
        console.log('   Make sure to also register on V2 gateway.');
        console.log('');
      }
    } catch (error) {
      console.log('  Error querying V1:', error.message);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
