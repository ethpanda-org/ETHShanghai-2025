"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import { ArrowRightIcon, ShieldCheckIcon, ChartBarIcon, BoltIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useEnsAddress, useEnsName } from "wagmi";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [searchAddress, setSearchAddress] = useState<string>("");
  const [queriedAddress, setQueriedAddress] = useState<string>("");
  const [calculatedScore, setCalculatedScore] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Resolve ENS to address if needed
  const shouldResolveEns = searchAddress.includes(".") && searchAddress.trim().length > 0;
  let normalizedName: string | undefined;
  try {
    normalizedName = shouldResolveEns ? normalize(searchAddress) : undefined;
  } catch (error) {
    normalizedName = undefined;
  }
  
  const { data: resolvedAddress } = useEnsAddress({
    name: normalizedName,
    chainId: 1, // ENS is on mainnet
  });

  // Get ENS name for the address
  const { data: ensName } = useEnsName({
    address: queriedAddress as `0x${string}`,
    chainId: 1,
  });

  // Read score from contract using Scaffold-ETH hook
  const { data: meritData, isLoading: isLoadingScore } = useScaffoldReadContract({
    contractName: "MeritScoreOracle",
    functionName: "merits",
    args: queriedAddress ? [queriedAddress as `0x${string}`] : undefined,
  });

  const meritScore = meritData ? Number(meritData[0]) : 0;
  const lastUpdated = meritData ? Number(meritData[1]) : 0;

  const handleSearch = async () => {
    // Use resolved address if ENS, otherwise use input
    const addressToQuery = resolvedAddress || searchAddress;
    
    if (addressToQuery && isAddress(addressToQuery)) {
      setQueriedAddress(addressToQuery);
      setIsCalculating(true);
      setCalculatedScore(null);
      
      // Fetch calculated score from Oracle Service
      try {
        const response = await fetch(`http://localhost:3002/score/${addressToQuery}`);
        if (response.ok) {
          const data = await response.json();
          setCalculatedScore(data);
        }
      } catch (error) {
        console.log("Could not fetch calculated score:", error);
      } finally {
        setIsCalculating(false);
      }
    }
  };

  return (
    <>
      {/* Hero Section */}
      <div className="flex items-center flex-col grow">
        {/* Hero */}
        <div className="hero min-h-[70vh] bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
          <div className="hero-content text-center">
            <div className="max-w-4xl">
              <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Your On-Chain Resume is Now Your Capital
              </h1>
              <p className="text-xl mb-8 text-base-content/80 max-w-3xl mx-auto leading-relaxed">
                Merit Protocol unlocks your reputation's value. Access an instant liquidity lifeline based on your
                contributions, not your collateral. Stop locking your assets, start leveraging your reputation.
              </p>
              {connectedAddress ? (
                <Link href="/dashboard" className="btn btn-primary btn-lg gap-2">
                  Go to Dashboard
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <button className="btn btn-primary btn-lg gap-2">
                    Connect Wallet & Discover Your Merit
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                  <p className="text-sm text-base-content/60">Connect your wallet to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ecosystem Sponsors */}
        <div className="w-full bg-base-200 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Trusted by Leading Ecosystems</h2>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-70">
              <div className="text-4xl font-bold">⌐◨-◨ NounsDAO</div>
              <div className="text-4xl font-bold">🌐 Gitcoin</div>
              <div className="text-4xl font-bold text-purple-500">Farcaster</div>
              <div className="text-4xl font-bold">🏆 ETHGlobal</div>
            </div>
          </div>
        </div>

        {/* Score Lookup Section */}
        <div className="w-full bg-base-100 py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">Check Any Address's Merit Score</h2>
            <p className="text-center text-base-content/70 mb-8">
              Enter an Ethereum address or ENS name to view their reputation score
            </p>
            
            {/* Search Input - Using Scaffold-ETH AddressInput */}
            <div className="flex gap-2 max-w-2xl mx-auto mb-8">
              <div className="flex-1">
                <AddressInput
                  value={searchAddress}
                  onChange={setSearchAddress}
                  placeholder="Enter address or ENS name"
                />
              </div>
              <button
                className={`btn btn-primary btn-lg gap-2 ${isLoadingScore ? "loading" : ""}`}
                onClick={handleSearch}
                disabled={!searchAddress || isLoadingScore}
              >
                {!isLoadingScore && <MagnifyingGlassIcon className="h-5 w-5" />}
                {isLoadingScore ? "Loading..." : "Search"}
              </button>
            </div>

            {/* Search Result - Using Scaffold-ETH components */}
            {queriedAddress && (
              <div className="card bg-base-200 shadow-xl max-w-2xl mx-auto">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="card-title">Merit Score Result</h3>
                    <div className="badge badge-primary">On-Chain Verified</div>
                  </div>
                  
                  <div className="bg-base-300 rounded-lg p-4 mb-4">
                    <p className="text-sm text-base-content/60 mb-2">
                      {ensName ? "ENS Name" : "Address"}
                    </p>
                    {ensName && (
                      <p className="text-lg font-bold mb-2">{ensName}</p>
                    )}
                    <Address address={queriedAddress as `0x${string}`} />
                  </div>

                  {isLoadingScore || isCalculating ? (
                    <div className="text-center py-12">
                      <span className="loading loading-spinner loading-lg"></span>
                      <p className="mt-4 text-base-content/60">
                        {isCalculating ? "Calculating score..." : `Loading score from ${targetNetwork.name}...`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* On-Chain Score */}
                      <div className="text-center py-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-4">
                        <p className="text-sm text-base-content/60 mb-2">On-Chain Score</p>
                        <p className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {meritScore}
                        </p>
                        {lastUpdated > 0 && (
                          <p className="text-xs mt-2 text-base-content/50">
                            Last updated: {new Date(lastUpdated * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Calculated Score from Oracle */}
                      {calculatedScore && (
                        <div className="bg-base-300 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold">Calculated Score</h4>
                            <div className="badge badge-secondary">Live Calculation</div>
                          </div>
                          <div className="text-center py-4 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-lg mb-3">
                            <p className="text-4xl font-bold text-secondary">
                              {calculatedScore.totalScore || calculatedScore.score || 0}
                            </p>
                          </div>
                          {calculatedScore.breakdown && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold mb-2">Score Breakdown:</p>
                              {Object.entries(calculatedScore.breakdown).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center text-sm">
                                  <span className="capitalize">{key.replace(/_/g, " ")}</span>
                                  <span className="font-bold">+{value} pts</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {meritScore === 0 && !calculatedScore && (
                        <div className="alert alert-info">
                          <span className="text-sm">
                            ℹ️ This address has no on-chain score yet. The calculated score shows what it would be if updated.
                          </span>
                        </div>
                      )}

                      {calculatedScore && meritScore === 0 && (
                        <div className="alert alert-warning">
                          <span className="text-sm">
                            💡 This address has a calculated score of {calculatedScore.totalScore || calculatedScore.score || 0} but hasn't been registered on-chain yet.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* How It Works */}
        <div className="w-full bg-base-200 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-primary rounded-full p-4 mb-4">
                    <ShieldCheckIcon className="h-12 w-12 text-primary-content" />
                  </div>
                  <h3 className="card-title text-2xl mb-2">1. Connect</h3>
                  <p className="text-base-content/70">
                    Connect your wallet — this is your Web3 identity. Your on-chain history speaks for itself.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-secondary rounded-full p-4 mb-4">
                    <ChartBarIcon className="h-12 w-12 text-secondary-content" />
                  </div>
                  <h3 className="card-title text-2xl mb-2">2. Calculate</h3>
                  <p className="text-base-content/70">
                    Our oracle analyzes your high-signal behavior in governance, development, and community.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-accent rounded-full p-4 mb-4">
                    <BoltIcon className="h-12 w-12 text-accent-content" />
                  </div>
                  <h3 className="card-title text-2xl mb-2">3. Access</h3>
                  <p className="text-base-content/70">
                    Based on your merit score, instantly access liquidity support. No collateral required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="w-full bg-gradient-to-r from-primary to-secondary py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-primary-content mb-6">Ready to Unlock Your Reputation?</h2>
            <p className="text-xl text-primary-content/90 mb-8">
              Join the future of reputation-based finance. Your contributions matter.
            </p>
            {connectedAddress ? (
              <Link href="/dashboard" className="btn btn-lg bg-base-100 text-primary hover:bg-base-200 gap-2">
                View Your Dashboard
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            ) : (
              <button className="btn btn-lg bg-base-100 text-primary hover:bg-base-200 gap-2">
                Connect Wallet Now
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
