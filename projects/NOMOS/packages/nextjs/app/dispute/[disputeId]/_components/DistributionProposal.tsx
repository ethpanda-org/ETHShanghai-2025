"use client";

import { useState } from "react";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// 固定的纠纷处理奖励比例 (以基点表示，100基点=1%)
const DISPUTE_PROCESSING_REWARD_BPS = 50n; // 0.5%
const DENOMINATOR_FEE = 10000n;

interface DistributionProposalProps {
  disputeData: any;
  distributionProposal: any;
  canApprove: boolean;
  canDistribute: boolean;
  canReject: boolean;
  isWorker: boolean;
  refreshDisputeData: () => void;
  disputeId: string;
}

export const DistributionProposal = ({
  disputeData,
  canApprove,
  canDistribute,
  canReject,
  isWorker,
  refreshDisputeData,
  disputeId,
}: DistributionProposalProps) => {
  const [isApprovingState, setIsApprovingState] = useState(false);
  const [isDistributingState, setIsDistributingState] = useState(false);
  const [isRejectingState, setIsRejectingState] = useState(false);

  const { writeContractAsync: approveProposal } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: distributeFunds } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: rejectProposal } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  // 获取DisputeResolver合约信息
  const { data: disputeResolver } = useDeployedContractInfo({ contractName: "DisputeResolver" });

  const disputeStatus = disputeData ? disputeData.status : "Unknown";

  const handleApprove = async () => {
    try {
      setIsApprovingState(true);
      await approveProposal({
        functionName: "approveProposal",
        args: [BigInt(disputeId || "0")],
      });

      // 重新获取纠纷数据
      setTimeout(() => {
        refreshDisputeData();
      }, 1000);
    } catch (error) {
      console.error("Error approving proposal:", error);
    } finally {
      setIsApprovingState(false);
    }
  };

  const handleDistribute = async () => {
    try {
      setIsDistributingState(true);
      await distributeFunds({
        functionName: "distributeFunds",
        args: [BigInt(disputeId || "0")],
      });

      // 重新获取纠纷数据
      setTimeout(() => {
        refreshDisputeData();
      }, 1000);
    } catch (error) {
      console.error("Error distributing funds:", error);
    } finally {
      setIsDistributingState(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejectingState(true);

      // 计算处理费用
      if (disputeData && DISPUTE_PROCESSING_REWARD_BPS) {
        const processingReward = (BigInt(disputeData.rewardAmount) * DISPUTE_PROCESSING_REWARD_BPS) / DENOMINATOR_FEE;

        if (processingReward > 0n) {
          // 先授权合约可以转移处理费用
          await approveToken({
            functionName: "approve",
            args: [disputeResolver?.address, processingReward],
          });
        }
      }

      await rejectProposal({
        functionName: "rejectProposal",
        args: [BigInt(disputeId || "0")],
      });

      // 重新获取纠纷数据
      setTimeout(() => {
        refreshDisputeData();
      }, 1000);
    } catch (error) {
      console.error("Error rejecting proposal:", error);
    } finally {
      setIsRejectingState(false);
    }
  };

  return (
    <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">分配方案</h2>

      {disputeStatus === "Resolved" && disputeData.workerShare && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-base-200 p-4 rounded-xl">
              <p className="text-sm text-gray-500">工作者份额</p>
              <p className="font-bold">
                {disputeData.workerShare ? (Number(disputeData.workerShare) / 1e18).toFixed(2) : "0.00"} TST
              </p>
            </div>
            <div className="bg-base-200 p-4 rounded-xl">
              <p className="text-sm text-gray-500">创建者份额</p>
              <p className="font-bold">
                {disputeData.rewardAmount && disputeData.workerShare
                  ? (Number(disputeData.rewardAmount - disputeData.workerShare) / 1e18).toFixed(2)
                  : "0.00"}{" "}
                TST
              </p>
            </div>
            <div className="bg-base-200 p-4 rounded-xl">
              <p className="text-sm text-gray-500">工作者批准</p>
              <p className={disputeData.workerApproved ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                {disputeData.workerApproved ? "已批准" : "未批准"}
              </p>
            </div>
            <div className="bg-base-200 p-4 rounded-xl">
              <p className="text-sm text-gray-500">创建者批准</p>
              <p className={disputeData.creatorApproved ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                {disputeData.creatorApproved ? "已批准" : "未批准"}
              </p>
            </div>
          </div>

          {canApprove && (
            <div className="mb-4">
              <button
                className={`btn ${isWorker ? "btn-primary" : "btn-secondary"} w-full ${isApprovingState ? "loading" : ""}`}
                onClick={handleApprove}
                disabled={isApprovingState}
              >
                {isWorker ? "工作者批准" : "创建者批准"}
              </button>
            </div>
          )}

          {canReject && (
            <div className="mb-4">
              <button
                className={`btn btn-error w-full ${isRejectingState ? "loading" : ""}`}
                onClick={handleReject}
                disabled={isRejectingState}
              >
                拒绝提案
              </button>
            </div>
          )}

          {canDistribute && (
            <div className="mb-4">
              <button
                className={`btn btn-success w-full ${isDistributingState ? "loading" : ""}`}
                onClick={handleDistribute}
                disabled={isDistributingState}
              >
                分配资金
              </button>
            </div>
          )}
        </>
      )}

      {disputeStatus === "Distributed" && (
        <div className="text-center py-8">
          <div className="text-success text-5xl mb-4">✓</div>
          <h3 className="text-xl font-bold mb-2">资金已分配</h3>
          <p className="text-gray-600">纠纷已解决，资金已成功分配</p>
          {disputeData.distributedAt && (
            <p className="text-sm text-gray-500 mt-2">
              分配时间: {new Date(Number(disputeData.distributedAt) * 1000).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
