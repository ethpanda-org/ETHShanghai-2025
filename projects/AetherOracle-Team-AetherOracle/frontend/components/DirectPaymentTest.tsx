'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/lib/contracts';

// 这是一个独立的测试组件，用于直接测试支付
export default function DirectPaymentTest({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDirectPayment = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    setLoading(true);
    setStatus('Starting payment...');

    try {
      // 1. Setup provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log('User address:', userAddress);
      setStatus(`Connected: ${userAddress}`);

      // 2. Setup contracts
      const gateway = new ethers.Contract(
        CONTRACTS.PAYMENT_GATEWAY_V2,
        PAYMENT_GATEWAY_ABI,
        signer
      );

      const usdc = new ethers.Contract(
        CONTRACTS.MOCK_USDC,
        ERC20_ABI,
        signer
      );

      // 3. Check balance and allowance
      setStatus('Checking balance and allowance...');
      const balance = await usdc.balanceOf(userAddress);
      const allowance = await usdc.allowance(userAddress, CONTRACTS.PAYMENT_GATEWAY_V2);

      console.log('Balance:', ethers.utils.formatUnits(balance, 6), 'USDC');
      console.log('Allowance:', allowance.toString());

      // 4. Get order details
      setStatus('Fetching order details...');
      const orderDetails = await gateway.getOrderDetailsByString(orderId);
      const orderIdBytes32 = orderDetails[0];
      const orderAmount = orderDetails[3];
      const orderStatus = orderDetails[8];

      console.log('Order ID (bytes32):', orderIdBytes32);
      console.log('Order amount:', ethers.utils.formatUnits(orderAmount, 6), 'USDC');
      console.log('Order status:', orderStatus);

      if (orderStatus !== 0) {
        throw new Error('Order is not pending');
      }

      // 5. Check if we need to approve
      if (allowance.lt(orderAmount)) {
        setStatus('Approving tokens...');
        console.log('Need to approve tokens first');

        const approveTx = await usdc.approve(
          CONTRACTS.PAYMENT_GATEWAY_V2,
          ethers.constants.MaxUint256
        );
        console.log('Approve TX:', approveTx.hash);
        await approveTx.wait();
        console.log('Approval confirmed!');
      }

      // 6. Process payment
      setStatus('Processing payment...');
      console.log('Calling processPayment with:', {
        orderId: orderIdBytes32,
        amount: orderAmount.toString()
      });

      // Direct contract call
      const paymentTx = await gateway.processPayment(orderIdBytes32, orderAmount);
      console.log('Payment TX:', paymentTx.hash);
      setStatus(`Transaction sent: ${paymentTx.hash}`);

      // Wait for confirmation
      const receipt = await paymentTx.wait();
      console.log('Payment confirmed!', receipt);
      setStatus('✅ Payment successful!');

      // Check new order status
      const newOrderDetails = await gateway.getOrderDetailsByString(orderId);
      const newStatus = newOrderDetails[8];
      console.log('New order status:', newStatus);

    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus(`❌ Error: ${error.message || 'Unknown error'}`);

      // Try to extract more details
      if (error.data) {
        console.log('Error data:', error.data);
      }
      if (error.reason) {
        console.log('Error reason:', error.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 border-2 border-red-500 z-50 max-w-md">
      <h3 className="text-lg font-bold text-red-600 mb-4">
        🔧 Direct Payment Test (Debug Mode)
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        This bypasses wagmi and uses ethers.js directly to test the payment.
      </p>

      <div className="mb-4">
        <div className="text-xs font-mono bg-gray-100 p-2 rounded">
          Order: {orderId}
        </div>
      </div>

      {status && (
        <div className="mb-4">
          <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded">
            {status}
          </div>
        </div>
      )}

      <button
        onClick={handleDirectPayment}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Test Direct Payment with Ethers.js'
        )}
      </button>

      <p className="text-xs text-gray-500 mt-4">
        Open browser console to see detailed logs
      </p>
    </div>
  );
}