"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApproveProofOfWork } from "./_components/ApproveProofOfWork";
import { CancelTask } from "./_components/CancelTask";
import { ClaimReward } from "./_components/ClaimReward";
import { DisputeButton } from "./_components/DisputeButton";
import { ExtendDeadline } from "./_components/ExtendDeadline";
import { IncreaseReward } from "./_components/IncreaseReward";
import { SubmitBid } from "./_components/SubmitBid";
import { SubmitProofOfWork } from "./_components/SubmitProofOfWork";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";
import { formatCreatedAt, formatDeadline, getTaskStatusColor } from "~~/utils/tasks";

export default function BiddingTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { address: connectedAddress } = useAccount();
  const [task, setTask] = useState<any>(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [taskProof, setTaskProof] = useState<any>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 合并数据获取和处理逻辑
  const fetchTaskData = useCallback(async () => {
    if (!taskId) {
      setError("任务ID无效");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 创建sdk实例
      const sdk = getBuiltGraphSDK();

      // 从 GraphQL 获取任务详情
      const taskResult = await sdk.GetBiddingTaskForDetail({
        id: taskId as string,
      });

      if (taskResult?.biddingTask) {
        const taskObj = taskResult.biddingTask;
        setTask(taskObj);

        // 直接处理taskData格式以匹配组件期望的格式
        setTaskData([
          BigInt(taskObj.taskId || 0),
          BigInt(taskObj.reward || 0),
          BigInt(taskObj.deadline || 0),
          taskObj.status, // 直接使用字符串状态
          taskObj.creator?.address || "",
          taskObj.worker?.address || "",
        ]);

        // 设置taskWorker
        // 直接处理taskProof格式以匹配组件期望的格式
        if (taskObj.proofOfWork) {
          setTaskProof([
            taskObj.proofOfWork,
            taskObj.status === "Completed" || taskObj.status === "Paid",
            taskObj.updatedAt,
            taskObj.worker?.address || "",
          ]);
        }
      } else {
        setError("任务未找到");
      }
    } catch (err) {
      console.error("Error fetching task data:", err);
      setError("获取任务数据时出错");
      // 出错时重置数据
      setTask(null);
      setTaskData(null);
      setTaskProof(null);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center pt-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{error}</h2>
          <Link href="/bidding" className="btn btn-primary">
            返回任务列表
          </Link>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center pt-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">任务未找到</h2>
          <Link href="/bidding" className="btn btn-primary">
            返回任务列表
          </Link>
        </div>
      </div>
    );
  }

  // 解构任务数据
  const { id, creator, worker, title, description, reward, deadline, status, createdAt, proofOfWork, updatedAt } = task;

  // 检查当前用户是否为任务创建者
  const isTaskCreator = connectedAddress && connectedAddress.toLowerCase() === creator.address.toLowerCase();

  // 获取工作者地址
  const workerAddress = worker?.address;

  // 检查任务状态
  const isTaskOpen = status === "Open";
  const isTaskInProgress = status === "InProgress";
  const isTaskCompleted = status === "Completed";
  const isTaskCancelled = status === "Cancelled";
  const isTaskPaid = status === "Paid";
  const hasWorker = workerAddress && workerAddress !== "0x0000000000000000000000000000000000000000";
  const isTaskWorker =
    connectedAddress && workerAddress && connectedAddress.toLowerCase() === workerAddress.toLowerCase();

  return (
    <div className="flex flex-col items-center pt-10 px-2 min-h-screen bg-gradient-to-br from-base-200 to-base-100">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/bidding" className="btn btn-sm btn-outline">
            ← 返回任务列表
          </Link>
          <div className="flex gap-2">
            {/* 查看竞标者列表按钮 */}
            {isTaskCreator && isTaskOpen && !hasWorker && (
              <Link href={`/bidding/${taskId}/BidPage`} className="btn btn-primary btn-sm">
                查看竞标者列表
              </Link>
            )}
            {/* 取消任务按钮 */}
            {isTaskCreator && !isTaskCancelled && !isTaskPaid && (
              <CancelTask
                taskId={taskId as string}
                taskStatus={status} // 直接传递状态字符串
                taskData={taskData}
                taskProof={taskProof}
                disputeProcessingRewardBps={BigInt(50)} // 使用默认值
                onSuccess={fetchTaskData}
              />
            )}
            {/* 只有工作者且任务状态为InProgress时才显示提交工作量证明按钮 */}
            {isTaskInProgress && hasWorker && isTaskWorker && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsProofModalOpen(true)}>
                提交工作量证明
              </button>
            )}
            {/* 只有工作者且任务状态为Completed时才能申领报酬 */}
            {isTaskWorker && isTaskCompleted && <ClaimReward taskId={taskId as string} onSuccess={fetchTaskData} />}
          </div>
        </div>

        {/* 任务详情卡片 */}
        <div className="card bg-base-100 shadow-2xl border border-base-300 rounded-3xl">
          <div className="card-body">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <h1 className="card-title text-3xl font-bold mb-2 text-primary">{title}</h1>
                <span className={`badge ${getTaskStatusColor(status)} badge-lg text-base mt-2`}>{status}</span>
                <div className="mt-4 bg-base-200 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">任务描述</p>
                  <p className="mt-1 text-base leading-relaxed">{description}</p>
                </div>
                <div className="mt-4 text-sm">
                  <p className="text-gray-500">创建时间</p>
                  <p className="font-semibold">{formatCreatedAt(createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 min-w-[180px] items-end">
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">任务ID</div>
                  <div className="font-mono text-lg">#{id?.toString()}</div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">报酬</div>
                  <div className="text-xl font-bold text-primary">
                    {formatUnits(BigInt(reward || 0), 18)} <span className="text-sm font-normal">Tokens</span>
                  </div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">截止时间</div>
                  <div className="font-semibold">{formatDeadline(deadline)}</div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">创建者</div>
                  <div className="font-semibold">
                    <Address address={creator?.address} />
                  </div>
                </div>
                {worker?.address && (
                  <div className="bg-base-200 rounded-xl p-3 w-full">
                    <div className="text-xs text-gray-500">工作者</div>
                    <div className="font-semibold">
                      <Address address={worker?.address} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 根据用户角色和任务状态显示不同内容 */}
        {isTaskCreator ? (
          <>
            {/* 操作区：延长截止日期和增加奖励同一行 */}
            {(status === "Open" || status === "InProgress" || status === "Completed") && (
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex-1 min-w-[220px]">
                  <ExtendDeadline
                    taskId={taskId as string}
                    currentDeadline={BigInt(deadline || 0)}
                    taskCreator={creator?.address}
                    onSuccess={fetchTaskData}
                  />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <IncreaseReward taskId={taskId as string} taskCreator={creator?.address} onSuccess={fetchTaskData} />
                </div>
              </div>
            )}
          </>
        ) : (
          // 工作者视图
          <>
            {isTaskOpen && (
              <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                  <SubmitBid taskId={BigInt(taskId)} isTaskOpen={isTaskOpen} />
                </div>
              </div>
            )}

            {/* 工作量证明提交模态框 */}
            {isTaskInProgress && hasWorker && isTaskWorker && (
              <SubmitProofOfWork
                taskId={BigInt(taskId)}
                taskDeadline={deadline}
                isOpen={isProofModalOpen}
                onClose={() => setIsProofModalOpen(false)}
                onSuccess={() => {
                  fetchTaskData();
                  setIsProofModalOpen(false);
                }}
              />
            )}
          </>
        )}

        {/* 显示已提交的工作量证明 */}
        {proofOfWork && (
          <div className="card bg-base-100 shadow border border-base-300 rounded-2xl">
            <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="card-title text-xl font-bold mb-2">工作量证明</h2>
                <div className="form-control mt-2">
                  <label className="label">
                    <span className="label-text">提交时间</span>
                  </label>
                  <p className="font-mono">{updatedAt ? formatCreatedAt(updatedAt) : "N/A"}</p>
                </div>
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">证明内容</span>
                  </label>
                  <div className="p-4 bg-base-200 rounded-lg text-base">
                    <p>{proofOfWork}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 justify-center items-end">
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">状态</span>
                  </label>
                  <p className="font-semibold">{status === "Completed" || status === "Paid" ? "已批准" : "待批准"}</p>
                </div>

                {/* 只有任务创建者且工作量证明尚未批准时才显示批准按钮 */}
                {isTaskCreator && status !== "Completed" && status !== "Paid" && isTaskInProgress && hasWorker && (
                  <ApproveProofOfWork
                    taskId={BigInt(taskId)}
                    taskWorker={workerAddress}
                    isTaskCreator={isTaskCreator}
                    isTaskInProgress={isTaskInProgress}
                  />
                )}

                {/* 只有工作者且工作量证明尚未批准时才显示提出纠纷按钮 */}
                {isTaskWorker && status !== "Completed" && status !== "Paid" && (
                  <DisputeButton
                    taskId={taskId as string}
                    taskProof={taskProof}
                    taskData={taskData}
                    disputeProcessingRewardBps={undefined}
                    onSuccess={fetchTaskData}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
