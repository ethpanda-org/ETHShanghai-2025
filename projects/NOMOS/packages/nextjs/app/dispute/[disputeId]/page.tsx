"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminVoting } from "./_components/AdminVoting";
import { DisputeInfo } from "./_components/DisputeInfo";
import { DistributionProposal } from "./_components/DistributionProposal";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { getStatusText, getTaskStatusColor } from "~~/utils/tasks";

export default function DisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const { address: connectedAddress } = useAccount();

  const [disputeData, setDisputeData] = useState<any>(null);
  const [disputeLoading, setDisputeLoading] = useState(true);
  const [distributionProposal, setDistributionProposal] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voteAmount, setVoteAmount] = useState("");

  const fetchDisputeData = useCallback(
    async (isRefreshing = false) => {
      if (!disputeId) return;

      // 获取 GraphQL SDK
      const sdk = getBuiltGraphSDK();

      try {
        if (!isRefreshing) {
          setDisputeLoading(true);
        }

        // 获取纠纷详情
        const disputeResult = await sdk.GetDispute({
          id: disputeId,
        });

        if (disputeResult?.dispute) {
          setDisputeData(disputeResult.dispute);

          // 设置分配方案数据
          if (disputeResult.dispute.workerShare) {
            setDistributionProposal([
              disputeResult.dispute.workerShare,
              disputeResult.dispute.workerApproved,
              disputeResult.dispute.creatorApproved,
            ]);
          }

          // 检查当前用户是否已投票
          if (connectedAddress && disputeResult.dispute.votes) {
            const userVote = disputeResult.dispute.votes.find(
              (vote: any) => vote.admin.address.toLowerCase() === connectedAddress.toLowerCase(),
            );
            setHasVoted(!!userVote);
          }

          // 检查当前用户是否为管理员 (仅在初次加载时)
          if (!isRefreshing && connectedAddress) {
            // 从子图获取管理员信息
            sdk
              .GetAdmin({ id: connectedAddress.toLowerCase() })
              .then(adminResult => {
                if (adminResult?.admin) {
                  setIsAdmin(adminResult.admin.isActive);
                }
              })
              .catch(err => {
                console.error("Error fetching admin data:", err);
              });
          }
        }
      } catch (err) {
        console.error(`Error ${isRefreshing ? "refreshing" : "fetching"} dispute data:`, err);
      } finally {
        if (!isRefreshing) {
          setDisputeLoading(false);
        }
      }
    },
    [disputeId, connectedAddress],
  );

  const refreshDisputeData = async () => {
    await fetchDisputeData(true);
  };

  useEffect(() => {
    fetchDisputeData();
  }, [fetchDisputeData]);

  const isWorker =
    disputeData &&
    disputeData.worker &&
    connectedAddress &&
    disputeData.worker.address?.toLowerCase() === connectedAddress?.toLowerCase();
  const isTaskCreator =
    disputeData &&
    disputeData.taskCreator &&
    connectedAddress &&
    disputeData.taskCreator.address?.toLowerCase() === connectedAddress?.toLowerCase();
  const disputeStatus = disputeData ? disputeData.status : "Unknown";

  const canVote = isAdmin && disputeStatus === "Filed";
  const canProcess =
    isAdmin && disputeStatus === "Filed" && disputeData && disputeData.votes && disputeData.votes.length >= 3;
  const canApprove = (isWorker || isTaskCreator) && disputeStatus === "Resolved";
  const canDistribute =
    disputeStatus === "Resolved" &&
    distributionProposal &&
    distributionProposal[1] && // workerApproved
    distributionProposal[2]; // creatorApproved
  const canReject = (isWorker || isTaskCreator) && disputeStatus === "Resolved";

  if (disputeLoading) {
    return (
      <div className="flex flex-col items-center pt-10 px-4 w-full">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">纠纷详情</h1>
            <Link href="/dispute" className="btn btn-sm btn-outline">
              ← 返回纠纷列表
            </Link>
          </div>
          <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-4">正在加载纠纷数据...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!disputeData) {
    return (
      <div className="flex flex-col items-center pt-10 px-4 w-full">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">纠纷详情</h1>
            <Link href="/dispute" className="btn btn-sm btn-outline">
              ← 返回纠纷列表
            </Link>
          </div>
          <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
            <div className="text-center py-8 text-error">
              <p>无法获取纠纷数据</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-10 px-4 w-full">
      <div className="w-full max-w-4xl">
        {/* 合并的DisputeHeader内容 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">纠纷详情</h1>
          <Link href="/dispute" className="btn btn-sm btn-outline">
            ← 返回纠纷列表
          </Link>
        </div>

        <DisputeInfo
          disputeId={disputeId}
          disputeData={disputeData}
          getStatusText={getStatusText}
          getStatusColor={getTaskStatusColor}
        />

        {/* 管理员投票部分 */}
        <AdminVoting
          disputeData={disputeData}
          canVote={!!canVote}
          canProcess={!!canProcess}
          hasVoted={hasVoted}
          voteAmount={voteAmount}
          setVoteAmount={setVoteAmount}
          refreshDisputeData={refreshDisputeData}
          disputeId={disputeId as string}
        />

        {/* 分配方案部分 */}
        {disputeStatus === "Resolved" && (
          <DistributionProposal
            disputeData={disputeData}
            distributionProposal={distributionProposal}
            canApprove={!!canApprove}
            canDistribute={!!canDistribute}
            canReject={!!canReject}
            isWorker={!!isWorker}
            refreshDisputeData={refreshDisputeData}
            disputeId={disputeId as string}
          />
        )}
      </div>
    </div>
  );
}
