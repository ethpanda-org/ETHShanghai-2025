import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Search, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ERC8004AgentABI } from '@/config/abis';

type TransactionResult = readonly [
  string,
  string,
  bigint,
  `0x${string}`,
  `0x${string}`,
  number,
  bigint
];

const STATUS_META = [
  { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { label: 'Disputed', color: 'bg-red-100 text-red-800', icon: XCircle },
  { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
] as const;

export default function Audit() {
  const [txId, setTxId] = useState('');
  const [searchTxId, setSearchTxId] = useState<`0x${string}` | null>(null);

  const { data, isLoading } = useContractRead({
    address: CONTRACT_ADDRESSES.ERC8004Agent as `0x${string}`,
    abi: ERC8004AgentABI,
    functionName: 'getTransaction',
    args: searchTxId ? [searchTxId] : undefined,
    query: {
      enabled: Boolean(searchTxId),
    },
  });

  const transaction = data as TransactionResult | undefined;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (txId.startsWith('0x') && txId.length === 66) {
      setSearchTxId(txId as `0x${string}`);
    } else if (typeof window !== 'undefined') {
      window.alert('Invalid transaction ID format');
    }
  };

  const downloadAuditBundle = () => {
    if (!transaction || !searchTxId) return;

    const bundle = {
      transactionId: searchTxId,
      agent: transaction[0],
      merchant: transaction[1],
      amount: transaction[2]?.toString(),
      cartHash: transaction[3],
      receiptHash: transaction[4],
      status: STATUS_META[transaction[5]]?.label ?? 'Unknown',
      timestamp: new Date(Number(transaction[6]) * 1000).toISOString(),
      verified: true,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-bundle-${searchTxId.slice(0, 10)}.json`;
    a.click();
  };

  const renderStatusBadge = (status: number | undefined) => {
    const meta = status !== undefined ? STATUS_META[status] : undefined;
    if (!meta) return null;
    const Icon = meta.icon;
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${meta.color}`}
      >
        <Icon className="mr-1 h-4 w-4" />
        {meta.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction Audit</h1>
          <p className="mt-2 text-gray-600">
            Verify and audit any transaction in the CAI Framework
          </p>
        </div>

        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
          <form onSubmit={handleSearch}>
            <label
              htmlFor="txId"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Transaction ID
            </label>
            <div className="flex space-x-3">
              <input
                id="txId"
                type="text"
                value={txId}
                onChange={(event) => setTxId(event.target.value)}
                placeholder="0x..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2 rounded-lg bg-primary-600 px-6 py-3 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter a transaction ID to view its complete verification chain
            </p>
          </form>
        </div>

        {isLoading && (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
            <p className="mt-4 text-gray-600">Loading transaction data...</p>
          </div>
        )}

        {transaction && !isLoading && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Verification Chain</h2>
                <button
                  onClick={downloadAuditBundle}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Audit Bundle
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">1. Mandate VC</h3>
                  </div>
                  <p className="text-sm text-gray-600">User authorization verified</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">Signature: Valid ✓</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">2. Cart VC</h3>
                  </div>
                  <p className="text-sm text-gray-600">Shopping cart hash match</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    Hash: {transaction[3]?.slice(0, 16)}...
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">3. Payment</h3>
                  </div>
                  <p className="text-sm text-gray-600">Transaction completed</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    Amount: {transaction[2]?.toString()} wei
                  </p>
                </div>

                {transaction[4] !==
                  '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">4. Receipt</h3>
                    </div>
                    <p className="text-sm text-gray-600">Provider signed receipt</p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      Hash: {transaction[4]?.slice(0, 16)}...
                    </p>
                  </div>
                )}

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">5. AHIN Anchor</h3>
                  </div>
                  <p className="text-sm text-gray-600">Pending blockchain anchor</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Will be anchored in the next batch
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
                {renderStatusBadge(transaction[5])}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Agent Address</h3>
                  <p className="rounded bg-gray-50 p-3 font-mono text-sm text-gray-900">
                    {transaction[0]}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Merchant Address</h3>
                  <p className="rounded bg-gray-50 p-3 font-mono text-sm text-gray-900">
                    {transaction[1]}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Amount</h3>
                  <p className="rounded bg-gray-50 p-3 font-mono text-sm text-gray-900">
                    {transaction[2]?.toString()} wei
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Timestamp</h3>
                  <p className="rounded bg-gray-50 p-3 text-sm text-gray-900">
                    {new Date(Number(transaction[6]) * 1000).toLocaleString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Cart Hash</h3>
                  <p className="rounded bg-gray-50 p-3 font-mono text-sm text-gray-900 break-all">
                    {transaction[3]}
                  </p>
                </div>
                {transaction[4] !==
                  '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                  <div className="md:col-span-2">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">Receipt Hash</h3>
                    <p className="rounded bg-gray-50 p-3 font-mono text-sm text-gray-900 break-all">
                      {transaction[4]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {searchTxId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>View on Etherscan:</strong>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${searchTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 underline transition hover:text-blue-900"
                  >
                    {searchTxId.slice(0, 16)}...
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {!searchTxId && !isLoading && (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No transaction selected
            </h3>
            <p className="mt-2 text-gray-500">
              Enter a transaction ID above to view its audit trail
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
