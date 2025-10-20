"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { formatEther, parseUnits } from "viem";
import { Address, AddressInput, Balance, IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { ArrowPathIcon, BanknotesIcon, CreditCardIcon } from "@heroicons/react/24/outline";

const Dashboard: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [liquidateAddress, setLiquidateAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"borrow" | "repay">("borrow");
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);

  // Get contract info
  const { data: poolContract } = useDeployedContractInfo("SponsoredLendingPool");
  const { data: usdcContract } = useDeployedContractInfo("MockUSDC");

  // Read Merit Score from Oracle
  const { data: meritData, isLoading: isLoadingScore, refetch: refetchScore } = useScaffoldReadContract({
    contractName: "MeritScoreOracle",
    functionName: "merits",
    args: [connectedAddress],
  });

  // Read Loan Data from Lending Pool
  const { data: loanData, isLoading: isLoadingLoan, refetch: refetchLoan } = useScaffoldReadContract({
    contractName: "SponsoredLendingPool",
    functionName: "loans",
    args: [connectedAddress],
  });

  // Read USDC allowance
  const { data: usdcAllowance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "allowance",
    args: [connectedAddress, poolContract?.address],
  });

  // Write functions using Scaffold-ETH hooks
  const { writeContractAsync: approveMockUSDC } = useScaffoldWriteContract("MockUSDC");
  const { writeContractAsync: borrowFromPool } = useScaffoldWriteContract("SponsoredLendingPool");
  const { writeContractAsync: repayToPool } = useScaffoldWriteContract("SponsoredLendingPool");
  const { writeContractAsync: liquidateLoan } = useScaffoldWriteContract("SponsoredLendingPool");

  const meritScore = meritData ? Number(meritData[0]) : 0;
  const lastUpdated = meritData ? Number(meritData[1]) : 0;

  const principal = loanData ? Number(loanData[0]) / 1e6 : 0; // USDC has 6 decimals
  const dueDate = loanData ? Number(loanData[1]) : 0;
  const loanStatus = loanData ? Number(loanData[2]) : 0;

  // Calculate credit line based on score
  const creditLine = meritScore * 30; // $30 per merit point
  const availableCredit = creditLine - principal;

  const handleRefreshScore = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`http://localhost:3002/update/${connectedAddress}`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.success) {
        notification.success("Score updated successfully!");
        // Also fetch the breakdown
        const breakdownResponse = await fetch(`http://localhost:3002/score/${connectedAddress}`);
        if (breakdownResponse.ok) {
          const breakdownData = await breakdownResponse.json();
          setScoreBreakdown(breakdownData.breakdown);
        }
      } else {
        notification.error(data.error || "Failed to update score");
      }
      
      // Refetch on-chain data
      await refetchScore();
    } catch (error) {
      console.error("Failed to refresh score:", error);
      notification.error("Failed to refresh score");
    } finally {
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount || Number(borrowAmount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    try {
      const amountInUSDC = parseUnits(borrowAmount, 6); // USDC has 6 decimals
      
      await borrowFromPool({
        functionName: "borrow",
        args: [amountInUSDC],
      });

      notification.success("Loan borrowed successfully!");
      setBorrowAmount("");
      await refetchLoan();
    } catch (error: any) {
      console.error("Borrow failed:", error);
      notification.error(error.message || "Failed to borrow");
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || Number(repayAmount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    try {
      const amountInUSDC = parseUnits(repayAmount, 6);
      
      // Check if approval is needed
      if (!usdcAllowance || usdcAllowance < amountInUSDC) {
        notification.info("Approving USDC...");
        await approveMockUSDC({
          functionName: "approve",
          args: [poolContract?.address, amountInUSDC],
        });
      }

      await repayToPool({
        functionName: "repay",
        args: [],
      });

      notification.success("Loan repaid successfully!");
      setRepayAmount("");
      await refetchLoan();
    } catch (error: any) {
      console.error("Repay failed:", error);
      notification.error(error.message || "Failed to repay");
    }
  };

  const handleLiquidate = async () => {
    if (!liquidateAddress) {
      notification.error("Please enter an address");
      return;
    }

    try {
      await liquidateLoan({
        functionName: "liquidate",
        args: [liquidateAddress as `0x${string}`],
      });

      notification.success("Loan liquidated! Default recorded on EAS.");
      setLiquidateAddress("");
    } catch (error: any) {
      console.error("Liquidate failed:", error);
      notification.error(error.message || "Failed to liquidate");
    }
  };

  if (!connectedAddress) {
    return (
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 text-center">
          <h1 className="text-4xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-lg text-base-content/70">
            Please connect your wallet to view your Merit Protocol dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="w-full max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Your Merit Dashboard</h1>
          <p className="text-base-content/70">Manage your reputation-based credit line</p>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Reputation Profile */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">Your Reputation Profile</h2>

                {/* Identity Card */}
                <div className="bg-base-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-12">
                        <span className="text-xl">
                          {connectedAddress?.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Address address={connectedAddress} />
                    </div>
                  </div>

                  {/* Merit Score Display */}
                  <div className="text-center py-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                    <p className="text-sm text-base-content/60 mb-2">Your Merit Score</p>
                    <p className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {meritScore}
                    </p>
                  </div>

                  {lastUpdated > 0 && (
                    <p className="text-xs text-center mt-2 text-base-content/50">
                      Last updated: {new Date(lastUpdated * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Score Breakdown */}
                <div className="mb-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <span>Score Composition</span>
                    <div className="badge badge-sm">Transparent</div>
                  </h3>

                  {scoreBreakdown ? (
                    <div className="space-y-2">
                      {Object.entries(scoreBreakdown).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-base-300 rounded">
                          <span className="text-sm capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="badge badge-primary">+{value} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-base-content/60">
                      <p className="text-sm">Click "Refresh Score" to see breakdown</p>
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  className={`btn btn-primary w-full gap-2 ${isRefreshing ? "loading" : ""}`}
                  onClick={handleRefreshScore}
                  disabled={isRefreshing}
                >
                  {!isRefreshing && <ArrowPathIcon className="h-5 w-5" />}
                  {isRefreshing ? "Refreshing..." : "Refresh Score"}
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column: Liquidity Lifeline */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">Your Liquidity Lifeline</h2>

                {/* Credit Line Overview */}
                <div className="bg-gradient-to-br from-success/20 to-info/20 rounded-lg p-6 mb-6">
                  <div className="mb-4">
                    <p className="text-sm text-base-content/60 mb-1">Available Credit</p>
                    <p className="text-4xl font-bold">
                      ${availableCredit.toLocaleString()} <span className="text-2xl">/ ${creditLine.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-base-content/50 mt-1">USDC</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-base-content/60">Amount Borrowed</p>
                      <p className="font-bold">${principal.toLocaleString()} USDC</p>
                    </div>
                    <div>
                      <p className="text-base-content/60">Interest Rate</p>
                      <p className="font-bold">5.5% APR</p>
                    </div>
                  </div>

                  {dueDate > 0 && (
                    <div className="mt-4 pt-4 border-t border-base-content/10">
                      <p className="text-base-content/60 text-sm">Next Repayment Due</p>
                      <p className="font-bold">{new Date(dueDate * 1000).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Action Panel - Using Scaffold-ETH Tabs */}
                <div className="tabs tabs-boxed mb-4">
                  <a 
                    className={`tab ${activeTab === "borrow" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("borrow")}
                  >
                    <BanknotesIcon className="h-4 w-4 mr-1" />
                    Borrow
                  </a>
                  <a 
                    className={`tab ${activeTab === "repay" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("repay")}
                  >
                    <CreditCardIcon className="h-4 w-4 mr-1" />
                    Repay
                  </a>
                </div>

                {/* Borrow Form */}
                {activeTab === "borrow" && (
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Amount (USDC)</span>
                        <span className="label-text-alt">Max: ${availableCredit.toLocaleString()}</span>
                      </label>
                      <IntegerInput
                        value={borrowAmount}
                        onChange={setBorrowAmount}
                        placeholder="Enter amount"
                        disableMultiplyBy1e18
                      />
                    </div>

                    <button 
                      className="btn btn-primary w-full gap-2" 
                      onClick={handleBorrow}
                      disabled={availableCredit <= 0 || !borrowAmount || Number(borrowAmount) > availableCredit}
                    >
                      <BanknotesIcon className="h-5 w-5" />
                      Access Liquidity
                    </button>

                    {meritScore < 200 && (
                      <div className="alert alert-warning">
                        <span className="text-sm">
                          ⚠️ Minimum score of 200 required to borrow. Current: {meritScore}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Repay Form */}
                {activeTab === "repay" && (
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Amount (USDC)</span>
                        <span className="label-text-alt">Owed: ${principal.toLocaleString()}</span>
                      </label>
                      <IntegerInput
                        value={repayAmount}
                        onChange={setRepayAmount}
                        placeholder="Enter amount"
                        disableMultiplyBy1e18
                      />
                    </div>

                    {usdcContract && (
                      <div className="text-sm text-base-content/70">
                        Your USDC Balance: <Balance address={connectedAddress} className="inline" />
                      </div>
                    )}

                    <button 
                      className="btn btn-primary w-full gap-2" 
                      onClick={handleRepay}
                      disabled={principal <= 0 || !repayAmount}
                    >
                      <CreditCardIcon className="h-5 w-5" />
                      Repay Loan
                    </button>

                    {principal <= 0 && (
                      <div className="alert alert-info">
                        <span className="text-sm">
                          ℹ️ You have no outstanding loans
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: History & Activity */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">History & Activity</h2>

                {/* Transaction History */}
                <div className="mb-6">
                  <h3 className="font-bold mb-3">Transaction History</h3>
                  <div className="space-y-2">
                    {principal > 0 ? (
                      <div className="p-3 bg-base-300 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="badge badge-primary badge-sm">Borrow</span>
                          <span className="text-sm font-bold">${principal.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-base-content/60">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-base-content/50">
                        <p>No transactions yet</p>
                        <p className="text-sm mt-2">Your loan history will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Liquidation Module - Using AddressInput */}
                <div>
                  <h3 className="font-bold mb-3">Liquidation Module</h3>
                  <div className="bg-base-300 rounded-lg p-4">
                    <p className="text-sm text-base-content/70 mb-3">
                      Liquidate defaulted loans and record on EAS
                    </p>
                    <div className="form-control space-y-2">
                      <AddressInput
                        value={liquidateAddress}
                        onChange={setLiquidateAddress}
                        placeholder="Enter borrower address"
                      />
                      <button 
                        className="btn btn-sm btn-error w-full"
                        onClick={handleLiquidate}
                        disabled={!liquidateAddress}
                      >
                        Liquidate & Record Default
                      </button>
                    </div>
                    <div className="text-xs text-base-content/50 mt-2">
                      This will create a permanent record on Ethereum Attestation Service
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
