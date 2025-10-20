import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { darkPoolService } from '../../services/darkPoolContract';

export const TestConnection: React.FC = () => {
  const { wallet, connectWallet, signMessage } = useWallet();
  const [contractStatus, setContractStatus] = useState<string>('Not connected');
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      testContractConnection();
    }
  }, [wallet]);

  const testContractConnection = async () => {
    try {
      setError(null);
      setContractStatus('Connecting to contract...');
      await darkPoolService.initialize();
      setContractStatus('Contract connected successfully!');

      const count = await darkPoolService.getOrderCount();
      setOrderCount(count);
    } catch (err: any) {
      setError(err.message);
      setContractStatus('Failed to connect to contract');
    }
  };

  const handleSignMessage = async () => {
    if (!wallet) return;

    try {
      const signature = await signMessage('Test message for Dark Pool');
      console.log('Signature:', signature);
      alert('Message signed successfully! Check console for signature.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connection Test</h1>

      {/* Wallet Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Wallet Status</h2>
        {wallet ? (
          <div>
            <p>Address: {wallet.address}</p>
            <p>Chain ID: {wallet.chainId}</p>
            <p>Network: {wallet.chainId === 31337 ? 'Localhost' : 'Other'}</p>
          </div>
        ) : (
          <button
            onClick={() => connectWallet()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Contract Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Contract Status</h2>
        <p>Status: {contractStatus}</p>
        {orderCount !== null && <p>Order Count: {orderCount}</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      {/* Test Actions */}
      {wallet && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Actions</h2>
          <button
            onClick={handleSignMessage}
            className="mr-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Sign Message
          </button>
          <button
            onClick={testContractConnection}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Contract Connection
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Ensure Hardhat node is running on port 8545</li>
          <li>Add Localhost 8545 network to MetaMask</li>
          <li>Import test account from Hardhat output</li>
          <li>Click "Connect Wallet" to test connection</li>
          <li>Test signing messages and contract interaction</li>
        </ol>
      </div>
    </div>
  );
};