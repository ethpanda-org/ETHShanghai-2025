import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { contracts } from '../config/contracts';
import MockERC20 from '../contracts/MockERC20.json';

type TokenType = 'usdc' | 'reward';

export default function Faucet() {
  const { address, isConnected } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState('1000');
  const [rewardAmount, setRewardAmount] = useState('10000');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = async (tokenType: TokenType) => {
    if (!address) return;

    const isUsdc = tokenType === 'usdc';
    const amount = isUsdc ? usdcAmount : rewardAmount;
    const decimals = isUsdc ? 6 : 18;
    const tokenAddress = isUsdc ? contracts.mockUSDC : contracts.rewardToken;

    try {
      writeContract({
        address: tokenAddress,
        abi: MockERC20.abi,
        functionName: 'mint',
        args: [address, BigInt(amount) * BigInt(10 ** decimals)],
      });
    } catch (error) {
      console.error('Mint failed:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🚰 Token Faucet</h2>
      <p>Get free test tokens for development</p>

      {!isConnected ? (
        <div style={{ marginTop: '2rem' }}>
          <p>Connect your wallet to claim test tokens</p>
          <ConnectButton />
        </div>
      ) : (
        <div style={{ marginTop: '2rem', display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
          {/* USDC Faucet */}
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '12px' }}>
            <h3>💵 USDC (6 decimals)</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>For trading on prediction markets</p>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Amount:
              </label>
              <input
                type="number"
                value={usdcAmount}
                onChange={(e) => setUsdcAmount(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '1rem', width: '100%', marginBottom: '1rem' }}
              />

              <button
                onClick={() => handleMint('usdc')}
                disabled={isPending || isConfirming}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                  background: isPending || isConfirming ? '#ccc' : '#646cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                {isPending || isConfirming ? 'Minting...' : 'Claim USDC'}
              </button>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
              <code style={{ wordBreak: 'break-all' }}>{contracts.mockUSDC}</code>
            </div>
          </div>

          {/* Reward Token Faucet */}
          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '12px' }}>
            <h3>🎁 REWARD (18 decimals)</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>For creating bribe pools</p>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Amount:
              </label>
              <input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '1rem', width: '100%', marginBottom: '1rem' }}
              />

              <button
                onClick={() => handleMint('reward')}
                disabled={isPending || isConfirming}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                  background: isPending || isConfirming ? '#ccc' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                {isPending || isConfirming ? 'Minting...' : 'Claim REWARD'}
              </button>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
              <code style={{ wordBreak: 'break-all' }}>{contracts.rewardToken}</code>
            </div>
          </div>
        </div>
      )}

      {isSuccess && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#d4edda', borderRadius: '8px', color: '#155724' }}>
          ✅ Successfully minted tokens!
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px' }}>
        <p><strong>⚠️ Development Tokens</strong></p>
        <p style={{ fontSize: '0.9rem' }}>
          These are test tokens on localhost. Use USDC for trading and REWARD tokens to create bribe pools.
        </p>
      </div>
    </div>
  );
}
