"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AddMilestoneModal } from "./_components/AddMilestoneModal";
import { AddWorkerModal } from "./_components/AddWorkerModal";
import { CancelTask } from "./_components/CancelTask";
import { CompleteTask } from "./_components/CompleteTask";
import { DisputeButton } from "./_components/DisputeButton";
import { ExtendDeadline } from "./_components/ExtendDeadline";
import { IncreaseReward } from "./_components/IncreaseReward";
import { MilestonesList } from "./_components/MilestonesList";
import { SubmitProofModal } from "./_components/SubmitProofModal";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";
import { formatCreatedAt, formatDeadline, getTaskStatusColor } from "~~/utils/tasks";

const MilestoneTaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { address: connectedAddress } = useAccount();
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number | null>(null);

  // 固定的纠纷处理奖励比例 (0.5%)
  const DISPUTE_PROCESSING_REWARD_BPS = BigInt(50);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setIsLoading(true);
      const sdk = getBuiltGraphSDK();
      const result = await sdk.GetMilestonePaymentTask({
        id: taskId as string,
      });

      if (result?.milestonePaymentTask) {
        setTask(result.milestonePaymentTask);
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      setTask(null); // 在出错时重置任务数据
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center pt-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">任务未找到</h2>
          <Link href="/milestone" className="btn btn-primary">
            返回任务列表
          </Link>
        </div>
      </div>
    );
  }

  // 解构任务数据
  const { id, creator, title, description, reward, deadline, status, createdAt, worker, milestones } = task;

  // 检查当前用户是否为任务创建者
  const isTaskCreator = connectedAddress && connectedAddress.toLowerCase() === creator.address.toLowerCase();
  const isTaskWorker = connectedAddress && worker && connectedAddress.toLowerCase() === worker.address.toLowerCase();

  // 检查任务状态
  const isTaskInProgress = status === "InProgress";

  // 处理各种操作
  const handleSubmitProof = (index: number) => {
    setSelectedMilestoneIndex(index);
    setIsProofModalOpen(true);
  };

  // 处理提交工作量证明
  const handleSubmitMilestoneProof = async () => {
    try {
      if (selectedMilestoneIndex === null) {
        alert("请选择一个里程碑");
        return;
      }

      fetchTask();
      setIsProofModalOpen(false);
      setSelectedMilestoneIndex(null);
    } catch (e) {
      console.error("Error submitting proof:", e);
    }
  };

  // 构造taskData对象以匹配组件期望的格式
  // Task结构: [id, reward, deadline, status, creator, worker]
  const taskData = [
    id ? BigInt(id) : BigInt(0),
    reward ? BigInt(reward) : BigInt(0),
    deadline ? BigInt(deadline) : BigInt(0),
    ["Open", "InProgress", "Completed", "Paid", "Cancelled"].indexOf(status),
    creator?.address || "",
    worker?.address || "",
  ];

  return (
    <div className="flex flex-col items-center pt-10 px-2 min-h-screen bg-gradient-to-br from-base-200 to-base-100">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/milestone" className="btn btn-sm btn-outline">
            ← 返回任务列表
          </Link>
          <div className="flex gap-2">
            {/* 只有任务创建者操作按钮 */}
            {isTaskCreator && (
              <>
                {/* 根据合约逻辑，只要任务不是已取消或已支付状态，任务创建者都可以取消任务 */}
                {taskData && taskData[4] !== 4 && taskData[4] !== 3 && (
                  <CancelTask
                    taskId={taskId}
                    isTaskCreator={!!isTaskCreator}
                    isTaskInProgress={isTaskInProgress}
                    taskData={taskData}
                    disputeProcessingRewardBps={DISPUTE_PROCESSING_REWARD_BPS}
                    onSuccess={fetchTask} // 添加 onSuccess 回调
                  />
                )}
                <CompleteTask
                  taskId={taskId}
                  isTaskInProgress={isTaskInProgress}
                  milestonesLength={milestones.length}
                  onSuccess={fetchTask}
                />
                {/* 添加工作者按钮 - 仅当任务状态为Open且未分配工作者时显示 */}
                {status === "Open" && (
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddWorkerModalOpen(true)}>
                    添加工作者
                  </button>
                )}
                {/* 添加里程碑按钮 - 仅当任务状态为InProgress时显示 */}
                {(status === "InProgress" || status === "Open") && (
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddMilestoneModalOpen(true)}>
                    添加里程碑
                  </button>
                )}
              </>
            )}
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
              </div>
              <div className="flex flex-col gap-4 min-w-[180px] items-end">
                {id && (
                  <div className="bg-base-200 rounded-xl p-3 w-full">
                    <div className="text-xs text-gray-500">任务ID</div>
                    <div className="font-mono text-lg">#{id.toString()}</div>
                  </div>
                )}
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">创建时间</div>
                  <div className="font-semibold">{formatCreatedAt(createdAt)}</div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">截止时间</div>
                  <div className="font-semibold">{formatDeadline(deadline)}</div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">任务报酬</div>
                  <div className="font-semibold">{formatUnits(reward, 18)} TST</div>
                </div>
                <div className="bg-base-200 rounded-xl p-3 w-full">
                  <div className="text-xs text-gray-500">任务创建者</div>
                  <Address address={creator?.address} />
                </div>
                {worker?.address && (
                  <div className="bg-base-200 rounded-xl p-3 w-full">
                    <div className="text-xs text-gray-500">工作者</div>
                    <Address address={worker.address} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 里程碑列表 */}
        {milestones.length > 0 && (
          <MilestonesList
            milestones={milestones.map((milestone: any, index: number) => ({
              ...milestone,
              // 添加纠纷按钮到每个里程碑
              actions:
                isTaskWorker && milestone.workProof?.submitted && !milestone.workProof?.approved ? (
                  <DisputeButton
                    taskId={taskId}
                    milestoneIndex={index}
                    taskData={taskData}
                    milestoneData={milestone}
                    disputeProcessingRewardBps={DISPUTE_PROCESSING_REWARD_BPS}
                    onSuccess={fetchTask}
                  />
                ) : null,
            }))}
            isTaskCreator={!!isTaskCreator}
            isTaskWorker={!!isTaskWorker}
            onApproveMilestone={() => {
              // 重新获取任务数据
              fetchTask();
            }}
            onPayMilestone={() => {
              // 重新获取任务数据
              fetchTask();
            }}
            onSubmitProof={handleSubmitProof}
          />
        )}

        {/* 工作量证明提交模态框 */}
        <SubmitProofModal
          isOpen={isProofModalOpen}
          onClose={() => {
            setIsProofModalOpen(false);
            setSelectedMilestoneIndex(null);
          }}
          taskId={taskId}
          milestoneIndex={selectedMilestoneIndex}
          onSubmitProof={handleSubmitMilestoneProof}
        />

        {/* 操作区：延长截止日期和增加奖励同一行 */}
        {isTaskCreator && (
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex-1 min-w-[220px]">
              <ExtendDeadline
                taskId={taskId}
                currentDeadline={BigInt(deadline)}
                taskCreator={creator.address}
                onSuccess={fetchTask}
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <IncreaseReward
                taskId={taskId}
                taskCreator={creator.address}
                milestones={milestones}
                onSuccess={fetchTask}
              />
            </div>
          </div>
        )}

        {/* 添加工作者模态框 */}
        <AddWorkerModal
          isOpen={isAddWorkerModalOpen}
          onClose={() => setIsAddWorkerModalOpen(false)}
          taskId={taskId}
          onSuccess={fetchTask}
        />

        {/* 添加里程碑模态框 */}
        <AddMilestoneModal
          isOpen={isAddMilestoneModalOpen}
          onClose={() => setIsAddMilestoneModalOpen(false)}
          taskId={taskId}
          onSuccess={fetchTask}
        />
      </div>
    </div>
  );
};

export default MilestoneTaskDetailPage;
