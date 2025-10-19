import { ethers } from 'hardhat';

/**
 * 测试公开订单流程
 * 公开订单：任何人都可以支付（designatedPayer = address(0)）
 */
async function main() {
  console.log('🧪 Testing Public Order Flow...\n');

  const [merchant, payer1, payer2] = await ethers.getSigners();
  console.log('👤 Merchant:', merchant.address);
  console.log('👤 Payer 1:', payer1.address);
  console.log('👤 Payer 2:', payer2.address);

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

  // Test 1: Create Public Order (designatedPayer = address(0))
  console.log('\n\n=== Test 1: Create Public Order ===');
  const orderId = 'PUBLIC_ORDER_' + Date.now();
  const orderAmount = ethers.parseUnits('1', 6); // 1 USDC
  const metadataURI = 'ipfs://test-public-order';

  console.log('Creating public order:', orderId);
  console.log('Designated payer: address(0) - Anyone can pay!');
  
  // 🆕 创建公开订单：designatedPayer = address(0)
  const tx1 = await paymentGateway.connect(merchant).createOrder(
    orderId,
    orderAmount,
    await mockUSDC.getAddress(),
    await mockUSDT.getAddress(),
    metadataURI,
    false,  // allowPartialPayment - 不允许部分支付
    ethers.ZeroAddress  // designatedPayer = address(0) - 公开订单
  );
  await tx1.wait();
  console.log('✅ Public order created!');

  // Get order details
  const orderDetails = await paymentGateway.getOrderDetailsByString(orderId);
  console.log('\n📦 Order Details:');
  console.log('Order ID (bytes32):', orderDetails[0]);
  console.log('Merchant:', orderDetails[1]);
  console.log('Payer:', orderDetails[2], '(address(0) = public order)');
  console.log('Order Amount:', ethers.formatUnits(orderDetails[3], 6), 'USDC');
  console.log('Payment Token:', orderDetails[4]);
  console.log('Settlement Token:', orderDetails[5]);
  console.log('Status:', orderDetails[8]);

  // Test 2: Payer 2 pays the order (not Payer 1!)
  console.log('\n\n=== Test 2: Payer 2 Pays the Order ===');
  const payer2Balance = await mockUSDC.balanceOf(payer2.address);
  console.log('Payer 2 USDC Balance:', ethers.formatUnits(payer2Balance, 6));

  console.log('Approving USDC...');
  const tx2 = await mockUSDC.connect(payer2).approve(
    await paymentGateway.getAddress(),
    orderAmount
  );
  await tx2.wait();
  console.log('✅ Token approved!');

  const allowance = await mockUSDC.allowance(
    payer2.address,
    await paymentGateway.getAddress()
  );
  console.log('Allowance:', ethers.formatUnits(allowance, 6), 'USDC');

  // Test 3: Process Payment
  console.log('\n\n=== Test 3: Process Payment ===');
  
  // Convert string orderId to bytes32
  const orderIdBytes32 = orderDetails[0]; // Use the bytes32 from order details
  console.log('Order ID (string):', orderId);
  console.log('Order ID (bytes32):', orderIdBytes32);

  console.log('Processing payment with Payer 2...');
  try {
    const tx3 = await paymentGateway.connect(payer2).processPayment(
      orderIdBytes32,
      orderAmount
    );
    const receipt = await tx3.wait();
    console.log('✅ Payment processed!');
    console.log('Transaction hash:', receipt?.hash);

    // Get updated order details
    const updatedOrderDetails = await paymentGateway.getOrderDetailsByString(orderId);
    console.log('\n📦 Updated Order Details:');
    console.log('Payer:', updatedOrderDetails[2], '(now set to Payer 2)');
    console.log('Paid Amount:', ethers.formatUnits(updatedOrderDetails[6], 6), 'USDC');
    console.log('Status:', updatedOrderDetails[8]);

  } catch (error: any) {
    console.error('❌ Payment failed:', error.message);
    
    // Debug: Check order status
    const currentOrder = await paymentGateway.getOrderDetailsByString(orderId);
    console.log('\n🔍 Debug Info:');
    console.log('Current Status:', currentOrder[8]);
    console.log('Payer:', currentOrder[2]);
    console.log('Expected Payer:', payer2.address);
  }

  console.log('\n✅ Test completed!');
  console.log('\n💡 Key Takeaway:');
  console.log('   - Public orders (designatedPayer = address(0)) can be paid by ANYONE');
  console.log('   - The first person to pay becomes the payer');
  console.log('   - Private orders (designatedPayer != address(0)) can ONLY be paid by the designated payer');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

