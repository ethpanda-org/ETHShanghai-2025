"use client";

import { useState } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface AdminVotingProps {
  disputeData: any;
  canVote: boolean;
  canProcess: boolean;
  hasVoted: boolean;
  voteAmount: string;
  setVoteAmount: (value: string) => void;
  refreshDisputeData: () => void;
  disputeId: string;
}

export const AdminVoting = ({
  disputeData,
  canVote,
  canProcess,
  hasVoted,
  voteAmount,
  setVoteAmount,
  refreshDisputeData,
  disputeId,
}: AdminVotingProps) => {
  const [isVotingState, setIsVotingState] = useState(false);
  const [isProcessingVotesState, setIsProcessingVotesState] = useState(false);

  const { writeContractAsync: voteOnDispute } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: processVotes } = useScaffoldWriteContract({ contractName: "DisputeResolver" });

  const handleVote = async () => {
    if (!voteAmount || !disputeData || !disputeData.rewardAmount) {
      return;
    }

    const voteAmountWei = BigInt(Math.round(parseFloat(voteAmount) * 1e18));
    if (voteAmountWei > BigInt(disputeData.rewardAmount)) {
      return;
    }

    try {
      setIsVotingState(true);
      await voteOnDispute({
        functionName: "voteOnDispute",
        args: [BigInt(disputeId || "0"), voteAmountWei],
      });

      setVoteAmount("");

      // 重新获取纠纷数据
      setTimeout(() => {
        refreshDisputeData();
      }, 1000);
    } catch (error) {
      console.error("Error voting on dispute:", error);
    } finally {
      setIsVotingState(false);
    }
  };

  const handleProcessVotes = async () => {
    try {
      setIsProcessingVotesState(true);
      await processVotes({
        functionName: "processVotes",
        args: [BigInt(disputeId || "0")],
      });

      // 重新获取纠纷数据
      setTimeout(() => {
        refreshDisputeData();
      }, 1000);
    } catch (error) {
      console.error("Error processing votes:", error);
    } finally {
      setIsProcessingVotesState(false);
    }
  };

  return (
    <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">管理员投票</h2>

      {canVote && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">分配给工作者的金额 (TST)</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="投票金额"
              className="input input-bordered w-full"
              value={voteAmount}
              onChange={e => setVoteAmount(e.target.value)}
              disabled={hasVoted}
            />
          </div>
          <div className="flex items-end">
            <button
              className={`btn btn-primary w-full ${isVotingState ? "loading" : ""}`}
              onClick={handleVote}
              disabled={isVotingState || hasVoted || !voteAmount}
            >
              {hasVoted ? "已投票" : "投票"}
            </button>
          </div>
        </div>
      )}

      {canProcess && (
        <div className="mb-4">
          <button
            className={`btn btn-secondary w-full ${isProcessingVotesState ? "loading" : ""}`}
            onClick={handleProcessVotes}
            disabled={isProcessingVotesState}
          >
            处理投票结果
          </button>
        </div>
      )}

      {disputeData.votes && disputeData.votes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-3">投票记录</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>管理员</th>
                  <th>工作者份额</th>
                  <th>投票时间</th>
                </tr>
              </thead>
              <tbody>
                {disputeData.votes.map((vote: any) => (
                  <tr key={vote.id}>
                    <td>
                      <Address address={vote.admin.address} />
                    </td>
                    <td>{(Number(vote.workerShare) / 1e18).toFixed(2)} TST</td>
                    <td>{new Date(Number(vote.createdAt) * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
