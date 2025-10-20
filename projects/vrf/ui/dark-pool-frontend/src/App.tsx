import React from 'react';
import { RealTradingView, TransactionMonitor } from './components/trading/RealTradingView';

function App() {
  // Note: Market data should come from real-time sources, not hardcoded values
  // This will be replaced with actual market data integration
  const marketData = {
    symbol: 'ETH-USD',
    price: null, // Will be fetched from real market data
    change: null,
    changePercent: null,
    liquidity: 'medium' as const,
    spread: { min: null, max: null }
  };

  const handleWalletConnect = (address: string) => {
    console.log('Wallet connected:', address);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#030712', color: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Dark Pool Trading Interface</h1>
      <p style={{ marginBottom: '20px' }}>Privacy-Preserving Trading Platform</p>

      <div style={{
        padding: '20px',
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Features</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>✅ Anonymous Identity Creation</li>
          <li style={{ marginBottom: '8px' }}>✅ Privacy-Preserving Trading</li>
          <li style={{ marginBottom: '8px' }}>✅ Hardware Wallet Integration</li>
          <li style={{ marginBottom: '8px' }}>✅ ZK-Proof Compliance</li>
          <li style={{ marginBottom: '8px' }}>✅ Obfuscated Balances</li>
          <li style={{ marginBottom: '8px' }}>✅ Real-time Transaction Monitoring</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <RealTradingView
          marketData={marketData}
          onWalletConnect={handleWalletConnect}
        />
        <TransactionMonitor />
      </div>
    </div>
  );
}

export default App;