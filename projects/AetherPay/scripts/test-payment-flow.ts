import { ethers } from 'hardhat';

async function main() {
  console.log('🧪 Testing Payment Flow...\n');

  const [merchant, payer] = await ethers.getSigners();
  console.log('👤 Merchant:', merchant.address);
  console.log('👤 Payer:', payer.address);

  // Get contract instances
  const paymentGateway = await ethers.getContractAt(
    'PaymentGatewayV2',
    '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  );

  const mockUSDC = await ethers.getContractAt(
    'MockERC20',
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  );

  const mockUSDT = await ethers.getContractAt(
    'MockERC20',
    '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  );

  console.log('\n📋 Contract Addresses:');
  console.log('PaymentGateway:', await paymentGateway.getAddress());
  console.log('MockUSDC:', await mockUSDC.getAddress());
  console.log('MockUSDT:', await mockUSDT.getAddress());

  // Test 1: Create Order
  console.log('\n\n=== Test 1: Create Order ===');
  const orderId = 'TEST_ORDER_' + Date.now();
  const orderAmount = ethers.parseUnits('1', 6); // 1 USDC
  const metadataURI = 'ipfs://test';

  console.log('Creating order:', orderId);
  console.log('Designated payer:', payer.address);

  // 🆕 使用新的 createOrder 签名，包含 allowPartialPayment 和 designatedPayer
  const tx1 = await paymentGateway.connect(merchant).createOrder(
    orderId,
    orderAmount,
    await mockUSDC.getAddress(),
    await mockUSDT.getAddress(),
    metadataURI,
    false,  // allowPartialPayment - 不允许部分支付
    payer.address  // designatedPayer - 指定买家地址（使用 payer 账户）
  );
  await tx1.wait();
  console.log('✅ Order created!');

  // Get order details
  const orderDetails = await paymentGateway.getOrderDetailsByString(orderId);
  console.log('\n📦 Order Details:');
  console.log('Order ID (bytes32):', orderDetails[0]);
  console.log('Merchant:', orderDetails[1]);
  console.log('Payer:', orderDetails[2]);
  console.log('Order Amount:', ethers.formatUnits(orderDetails[3], 6), 'USDC');
  console.log('Payment Token:', orderDetails[4]);
  console.log('Settlement Token:', orderDetails[5]);
  console.log('Status:', orderDetails[8]);

  // Test 2: Approve Token
  console.log('\n\n=== Test 2: Approve Token ===');
  const payerBalance = await mockUSDC.balanceOf(payer.address);
  console.log('Payer USDC Balance:', ethers.formatUnits(payerBalance, 6));

  console.log('Approving USDC...');
  const tx2 = await mockUSDC.connect(payer).approve(
    await paymentGateway.getAddress(),
    orderAmount
  );
  await tx2.wait();
  console.log('✅ Token approved!');

  const allowance = await mockUSDC.allowance(
    payer.address,
    await paymentGateway.getAddress()
  );
  console.log('Allowance:', ethers.formatUnits(allowance, 6), 'USDC');

  // Test 3: Process Payment
  console.log('\n\n=== Test 3: Process Payment ===');
  
  // Convert string orderId to bytes32
  const orderIdBytes32 = ethers.encodeBytes32String(orderId);
  console.log('Order ID (string):', orderId);
  console.log('Order ID (bytes32):', orderIdBytes32);

  console.log('Processing payment...');
  try {
    const tx3 = await paymentGateway.connect(payer).processPayment(
      orderIdBytes32,
      orderAmount
    );
    const receipt = await tx3.wait();
    console.log('✅ Payment processed!');
    console.log('Transaction hash:', receipt?.hash);

    // Get updated order details
    const updatedOrderDetails = await paymentGateway.getOrderDetailsByString(orderId);
    console.log('\n📦 Updated Order Details:');
    console.log('Paid Amount:', ethers.formatUnits(updatedOrderDetails[6], 6), 'USDC');
    console.log('Status:', updatedOrderDetails[8]);

  } catch (error: any) {
    console.error('❌ Payment failed:', error.message);
    
    // Debug: Check order status
    const currentOrder = await paymentGateway.getOrderDetailsByString(orderId);
    console.log('\n🔍 Debug Info:');
    console.log('Current Status:', currentOrder[8]);
    console.log('Payer:', currentOrder[2]);
    console.log('Expected Payer:', payer.address);
  }

  console.log('\n✅ Test completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

