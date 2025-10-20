import { Address } from "~~/components/scaffold-eth";

/**
 * InstanceInfo 组件 - 显示钱包池实例信息
 */
interface InstanceInfoProps {
  instanceAddress: string;
  snapshot?: {
    blockNumber: bigint;
    timestamp: bigint;
    balances: readonly bigint[];
    exists: boolean;
  };
  walletPool?: readonly string[];
}

export const InstanceInfo = ({ instanceAddress, snapshot, walletPool }: InstanceInfoProps) => {
  if (!snapshot || !walletPool) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Loading instance data...</span>
      </div>
    );
  }

  const totalBalance = snapshot.balances.reduce((sum: bigint, bal: bigint) => sum + bal, 0n);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-title">Snapshot Block</div>
          <div className="stat-value text-primary text-2xl">{snapshot.blockNumber.toString()}</div>
          <div className="stat-desc">Balances frozen at this block</div>
        </div>
        
        <div className="stat">
          <div className="stat-title">Pool Size</div>
          <div className="stat-value text-secondary text-2xl">32</div>
          <div className="stat-desc">Addresses in anonymity set</div>
        </div>
        
        <div className="stat">
          <div className="stat-title">Total Balance</div>
          <div className="stat-value text-accent text-2xl">
            {(Number(totalBalance) / 1e18).toLocaleString()}
          </div>
          <div className="stat-desc">ETH in pool</div>
        </div>
      </div>

      {/* Wallet Pool Preview */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Wallet Pool (first 5)</h3>
          <div className="space-y-2">
            {walletPool.slice(0, 5).map((addr: string, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                <span className="text-sm font-mono text-base-content/60">[{i}]</span>
                <Address address={addr} />
                <span className="text-sm text-base-content/60">
                  {(Number(snapshot.balances[i]) / 1e18).toLocaleString()} ETH
                </span>
              </div>
            ))}
            <div className="text-center text-base-content/40 py-2">
              ... 27 more addresses ...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

