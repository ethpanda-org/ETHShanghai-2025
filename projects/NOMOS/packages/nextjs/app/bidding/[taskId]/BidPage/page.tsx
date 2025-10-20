"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function BidPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { address } = useAccount();
  const [bids, setBids] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [isLoadingBids, setIsLoadingBids] = useState(true);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const { writeContractAsync: acceptBid } = useScaffoldWriteContract({ contractName: "BiddingTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  // 获取BiddingTask合约信息
  const { data: biddingTaskContract } = useDeployedContractInfo({ contractName: "BiddingTask" });

  // 获取任务详情和竞标信息
  const fetchData = useCallback(async () => {
    if (!taskId) return;

    try {
      setIsTaskLoading(true);
      setIsLoadingBids(true);

      // 将sdk的创建移到函数内部，避免因对象引用变化导致的无限循环
      const sdk = getBuiltGraphSDK();
      // 从 GraphQL 获取任务详情和竞标信息
      const result = await sdk.GetBiddingTaskForBidPage({
        id: taskId,
      });

      if (result?.biddingTask) {
        setTask(result.biddingTask);

        // 处理竞标数据
        if (result.biddingTask.bids) {
          setBids(result.biddingTask.bids);
        }
      }
    } catch (err) {
      console.error("Error fetching task data:", err);
    } finally {
      setIsTaskLoading(false);
      setIsLoadingBids(false);
    }
  }, [taskId]); // 移除sdk依赖以避免无限循环

  useEffect(() => {
    fetchData();
  }, [taskId, fetchData]);

  const handleAcceptBid = async (bidIndex: number) => {
    if (!address || !biddingTaskContract || !task) return;

    try {
      // 先授权代币
      const bidAmount = bids[bidIndex].amount;
      await approveToken({
        functionName: "approve",
        args: [biddingTaskContract.address, BigInt(bidAmount)],
      });

      // 然后接受竞标
      await acceptBid({
        functionName: "acceptBid",
        args: [BigInt(taskId), BigInt(bidIndex)],
      });

      // 重新获取数据以更新UI
      const sdk = getBuiltGraphSDK();
      const result = await sdk.GetBiddingTaskForBidPage({
        id: taskId,
      });

      if (result?.biddingTask) {
        setTask(result.biddingTask);
      }
    } catch (e) {
      console.error("Error accepting bid:", e);
    }
  };

  if (isTaskLoading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">任务未找到</h1>
          <Link href="/bidding" className="btn btn-primary">
            返回竞标任务页面
          </Link>
        </div>
      </div>
    );
  }

  const isTaskCreator = address && address.toLowerCase() === task.creator.address.toLowerCase();
  const isTaskOpen = task.status === "Open";

  if (!isTaskCreator) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">访问被拒绝</h1>
          <p className="mb-4">只有任务创建者可以查看竞标者列表</p>
          <Link href={`/bidding/${taskId}`} className="btn btn-primary">
            返回任务详情
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-10 px-4">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">竞标者列表</h1>
          <Link href={`/bidding/${taskId}`} className="btn btn-secondary">
            返回任务详情
          </Link>
        </div>

        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">竞标者列表</h3>
          {isLoadingBids ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner"></span>
            </div>
          ) : bids.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无竞标者</p>
          ) : (
            <div className="space-y-4">
              {bids.map((bid, index) => (
                <div
                  key={bid.id}
                  className="border border-base-300 rounded-xl p-4 hover:bg-base-200 transition cursor-pointer"
                  onClick={() => (window.location.href = `/user/${bid.bidder.address}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Address address={bid.bidder.address} format="short" disableAddressLink />
                        <span className="badge badge-ghost">{formatUnits(BigInt(bid.amount), 18)} Tokens</span>
                      </div>
                      <p className="text-sm mb-2">
                        <span className="font-bold">预计完成时间:</span> {Math.ceil(Number(bid.estimatedTime) / 86400)}{" "}
                        天
                      </p>
                      <p className="text-sm">
                        <span className="font-bold">竞标描述:</span> {bid.description}
                      </p>
                    </div>
                    {isTaskOpen && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={e => {
                          e.stopPropagation();
                          handleAcceptBid(index);
                        }}
                      >
                        选择此竞标者
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
