const { ethers } = require('hardhat');

// PaymentGatewayV2 合约地址
const GATEWAY_V2_ADDRESS = '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8';
const PUBLIC_GOODS_FUND_ADDRESS = '0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B';

// 要检查的商家地址
const MERCHANT_ADDRESS = '0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c';

// 简化的ABI
const GATEWAY_ABI = [
  'function getMerchantInfo(address merchant) view returns (string businessName, uint256 totalOrders, uint256 totalVolume, uint256 pendingBalance, uint256 feeRate, bool isActive)',
  'function getMerchantOrderCount(address merchant) view returns (uint256)',
  'function getMerchantOrders(address merchant, uint256 offset, uint256 limit) view returns (tuple(bytes32 orderId, string orderIdString, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 paidAt, string metadataURI)[])',
];

const PUBLIC_GOODS_ABI = [
  'function totalLifetimeDonations() view returns (uint256)',
  'function getTotalContributors() view returns (uint256)',
  'function getContributorInfo(address user) view returns (uint256 totalContributed, uint256 lastContributionTime, string badgeLevel)',
];

async function main() {
  console.log('\n🔍 Testing Analytics Data Retrieval\n');
  console.log('Gateway V2 Address:', GATEWAY_V2_ADDRESS);
  console.log('Merchant Address:', MERCHANT_ADDRESS);
  console.log('----------------------------------------\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.OPTIMISM_SEPOLIA_RPC || 'https://optimism-sepolia.publicnode.com'
  );

  const gateway = new ethers.Contract(GATEWAY_V2_ADDRESS, GATEWAY_ABI, provider);
  const publicGoodsFund = new ethers.Contract(PUBLIC_GOODS_FUND_ADDRESS, PUBLIC_GOODS_ABI, provider);

  try {
    // 1. 获取商家信息
    console.log('1️⃣ Fetching Merchant Info...');
    const merchantInfo = await gateway.getMerchantInfo(MERCHANT_ADDRESS);
    console.log('✅ Merchant Info:');
    console.log('   Business Name:', merchantInfo.businessName);
    console.log('   Total Orders:', merchantInfo.totalOrders.toString());
    console.log('   Total Volume:', merchantInfo.totalVolume.toString());
    console.log('   Pending Balance:', merchantInfo.pendingBalance.toString());
    console.log('   Fee Rate:', merchantInfo.feeRate.toString());
    console.log('   Is Active:', merchantInfo.isActive);
    console.log();

    // 2. 获取订单数量
    console.log('2️⃣ Fetching Order Count...');
    const orderCount = await gateway.getMerchantOrderCount(MERCHANT_ADDRESS);
    console.log('✅ Order Count:', orderCount.toString());
    console.log();

    // 3. 获取订单列表
    console.log('3️⃣ Fetching Orders (offset=0, limit=50)...');
    try {
      const orders = await gateway.getMerchantOrders(MERCHANT_ADDRESS, 0, 50);
      console.log('✅ Orders Retrieved:', orders.length);

      if (orders.length > 0) {
        console.log('\nFirst Order Details:');
        const order = orders[0];
        console.log('   Order ID:', order.orderId);
        console.log('   Order ID String:', order.orderIdString);
        console.log('   Amount:', ethers.utils.formatUnits(order.orderAmount, 6), 'USDC');
        console.log('   Status:', order.status);
      }
    } catch (error) {
      console.log('❌ Error fetching orders:', error.message);
    }
    console.log();

    // 4. 获取公益基金信息
    console.log('4️⃣ Fetching Public Goods Fund Info...');
    const totalDonations = await publicGoodsFund.totalLifetimeDonations();
    const totalContributors = await publicGoodsFund.getTotalContributors();
    const contributorInfo = await publicGoodsFund.getContributorInfo(MERCHANT_ADDRESS);

    console.log('✅ Public Goods Fund:');
    console.log('   Total Platform Donations:', ethers.utils.formatUnits(totalDonations, 6), 'USDC');
    console.log('   Total Contributors:', totalContributors.toString());
    console.log('   Merchant Contribution:', ethers.utils.formatUnits(contributorInfo.totalContributed, 6), 'USDC');
    console.log('   Badge Level:', contributorInfo.badgeLevel);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });