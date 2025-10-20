"use client";

import { useState } from "react";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const DisputeButton = ({
  taskId,
  taskProof,
  taskData,
  disputeProcessingRewardBps,
  onSuccess,
}: {
  taskId: string;
  taskProof: any;
  taskData: any;
  disputeProcessingRewardBps: bigint | undefined;
  onSuccess?: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BiddingTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });
  const { data: disputeResolver } = useDeployedContractInfo({ contractName: "DisputeResolver" });

  const handleFileDispute = async () => {
    try {
      setIsLoading(true);

      // 计算需要批准的代币数量
      // 根据BaseTask.submitDispute函数，需要批准 disputeProcessingRewardBps * rewardAmount / 10000
      const rewardAmount = taskData?.[1] || BigInt(0); // taskData[1] 是 totalreward 字段
      const processingRewardBps = disputeProcessingRewardBps || BigInt(50); // 默认0.5%
      const processingReward = (rewardAmount * processingRewardBps) / BigInt(10000);

      // 先批准代币给DisputeResolver合约
      await approveToken({
        functionName: "approve",
        args: [disputeResolver?.address || "", processingReward],
      });

      await writeContractAsync({
        functionName: "fileDisputeByWorker",
        args: [BigInt(taskId)],
      });
      onSuccess?.();
    } catch (e) {
      console.error("Error filing dispute:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 只有当用户是工作者且工作量证明已提交但未批准，并且满足时间条件时才显示按钮
  // 检查：
  // 1. 是否有工作量证明
  // 2. 工作量证明是否已提交
  // 3. 工作量证明是否未被批准
  // 4. 是否已过最短纠纷提交时间（提交时间 + 3天）
  if (!taskProof || !taskProof[0] || taskProof[1]) {
    return null;
  }

  // 检查是否满足最小纠纷提交时间（3天）
  const submittedAt = taskProof[2]; // 提交时间
  if (submittedAt) {
    const minTimeBeforeDispute = 3 * 24 * 60 * 60; // 3天转换为秒
    const currentTime = Math.floor(Date.now() / 1000); // 当前时间（秒）

    // 如果还没到可以提交纠纷的时间，则不显示按钮
    if (currentTime < Number(submittedAt) + minTimeBeforeDispute) {
      return null;
    }
  }

  return (
    <button className="btn btn-error" onClick={handleFileDispute} disabled={isLoading}>
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-xs"></span>
          提交中...
        </>
      ) : (
        "提出纠纷"
      )}
    </button>
  );
};
