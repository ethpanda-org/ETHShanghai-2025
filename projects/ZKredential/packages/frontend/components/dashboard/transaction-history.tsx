import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, History, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ethers } from 'ethers';
import { createZKRWARegistryContract } from '@/lib/contracts/zkrwa-registry-ethers';

interface TransactionHistoryProps {
  userAddress: string;
}

export function TransactionHistory({ userAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask is not installed');
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const registry = await createZKRWARegistryContract(provider, undefined, 11155111);
        const events = await registry.getRegistrationEvents(userAddress);

        const formattedEvents = events.map(event => ({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: (event.args?.timestamp ? Number(event.args.timestamp) : 0) * 1000,
          commitment: event.args?.commitment?.toString(),
          provider: event.args?.provider,
        }));
        setTransactions(formattedEvents.reverse()); // Latest first
      } catch (err: any) {
        console.error('Failed to fetch transaction history:', err);
        setError(err.message || 'Failed to load transaction history.');
      } finally {
        setIsLoading(false);
      }
    };

    if (userAddress) {
      fetchTransactions();
    } else {
      setIsLoading(false);
    }
  }, [userAddress]);

  const getEtherscanLink = (txHash: string) => `https://sepolia.etherscan.io/tx/${txHash}`;
  const formatRelativeTime = (timestamp: number) => formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          交易历史
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">加载交易历史...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            暂无身份注册交易记录。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>交易哈希</TableHead>
                  <TableHead>区块号</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>提供商</TableHead>
                  <TableHead>Commitment</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {tx.txHash ? `${tx.txHash.substring(0, 6)}...${tx.txHash.substring(tx.txHash.length - 4)}` : 'N/A'}
                    </TableCell>
                    <TableCell>{tx.blockNumber || 'N/A'}</TableCell>
                    <TableCell>{tx.timestamp ? formatRelativeTime(tx.timestamp) : 'N/A'}</TableCell>
                    <TableCell>{tx.provider || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.commitment ? `${tx.commitment.substring(0, 6)}...${tx.commitment.substring(tx.commitment.length - 4)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {tx.txHash && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getEtherscanLink(tx.txHash)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
