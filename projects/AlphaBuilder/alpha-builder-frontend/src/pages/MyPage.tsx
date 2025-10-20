import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEther } from "viem";
import { Wallet, Mail, Copy, Check, RefreshCw, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailAuth } from "@/hooks/useEmailAuth";
import { cn } from "@/lib/utils";

const MyPage = () => {
  const navigate = useNavigate();
  const {
    status,
    isLoading,
    user,
    walletAddress,
    walletClient,
  } = useEmailAuth();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!isLoading && status !== "authenticated") {
      navigate("/login", { replace: true });
    }
  }, [status, isLoading, navigate]);

  const loadBalance = useCallback(async () => {
    if (!walletClient) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const currentBalance = await walletClient.publicClient.getBalance({
        address: walletClient.address,
      });
      setBalance(currentBalance);
    } catch (error) {
      setBalance(null);
      setBalanceError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setBalanceLoading(false);
    }
  }, [walletClient]);

  useEffect(() => {
    if (status === "authenticated" && walletClient) {
      void loadBalance();
    }
  }, [status, walletClient, loadBalance]);

  const formattedBalance = useMemo(() => {
    if (balance === null) {
      return "--";
    }
    return `${formatEther(balance)} ETH`;
  }, [balance]);

  const handleDeposit = () => {
    console.info("Deposit flow not implemented yet.");
  };

  const handleWithdraw = () => {
    console.info("Withdraw flow not implemented yet.");
  };

  const copyToClipboard = async (text: string, type: 'wallet' | 'email') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'wallet') {
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
        <div className="border-b border-border/70 bg-gradient-to-r from-indigo-50 via-blue-50 to-transparent px-6 py-5 dark:from-indigo-900/30 dark:via-blue-900/20 dark:to-transparent">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              My Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your Alpha Builder smart-wallet and review its status.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
                Wallet Information
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-muted/30 px-4 py-3 rounded-lg">
                  <p className="font-mono text-base break-all flex-1">
                    {walletAddress ?? "Unavailable"}
                  </p>
                  {walletAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(walletAddress, 'wallet')}
                      className="h-8 w-8 p-0 hover:bg-muted/50"
                    >
                      {copiedWallet ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {user?.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Linked Email</p>
                  <div className="flex items-center gap-2 bg-muted/30 px-4 py-3 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base flex-1">
                      {user.email}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(user.email, 'email')}
                      className="h-8 w-8 p-0 hover:bg-muted/50"
                    >
                      {copiedEmail ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">₿</span>
              </div>
              <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
                Balance
              </h3>
            </div>
            <div className="space-y-3">
              <p className="text-3xl font-bold">
                {balanceLoading ? "Loading…" : formattedBalance}
              </p>
              {balanceError && (
                <p className="text-sm text-destructive" role="alert">
                  {balanceError}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={loadBalance} disabled={balanceLoading} size="lg" className="gap-2">
              <RefreshCw className={cn("h-4 w-4", balanceLoading && "animate-spin")} />
              Refresh Balance
            </Button>
            <Button variant="secondary" onClick={handleDeposit} size="lg" className="gap-2">
              <ArrowDown className="h-4 w-4" />
              Deposit
            </Button>
            <Button variant="outline" onClick={handleWithdraw} size="lg" className="gap-2">
              <ArrowUp className="h-4 w-4" />
              Withdraw
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MyPage;
