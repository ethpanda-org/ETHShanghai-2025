import { useState } from "react";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface DisputeButtonProps {
  taskId: string;
  milestoneIndex: number;
  taskData: any;
  milestoneData: any;
  disputeProcessingRewardBps: bigint | undefined;
  onSuccess?: () => void;
}

export const DisputeButton = ({
  taskId,
  milestoneIndex,
  milestoneData,
  disputeProcessingRewardBps,
  onSuccess,
}: DisputeButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { writeContractAsync: fileDisputeByWorker } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const { writeContractAsync: approveToken } = useScaffoldWriteContract({
    contractName: "TaskToken",
  });

  const { data: milestonePaymentTaskContract } = useDeployedContractInfo({
    contractName: "MilestonePaymentTask",
  });

  const handleFileDispute = async () => {
    try {
      setIsLoading(true);

      // 计算需要批准的金额
      if (milestoneData) {
        const rewardAmount = milestoneData.reward;
        const processingRewardBps = disputeProcessingRewardBps || BigInt(50); // 默认0.5%
        const processingReward = (rewardAmount * processingRewardBps) / BigInt(10000);

        // 批准代币
        await approveToken({
          functionName: "approve",
          args: [milestonePaymentTaskContract?.address || "", processingReward],
        });
      }

      await fileDisputeByWorker({
        functionName: "fileDisputeByWorker",
        args: [BigInt(taskId), BigInt(milestoneIndex)],
      });

      setIsModalOpen(false);
      onSuccess?.();
    } catch (e) {
      console.error("Error filing dispute:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 只有当用户是工作者且工作量证明已提交但未批准时才显示按钮
  if (
    !milestoneData ||
    !milestoneData.workProof ||
    !milestoneData.workProof.submitted ||
    milestoneData.workProof.approved
  ) {
    return null;
  }

  // 检查是否满足时间条件（提交时间后至少3天）
  const minTimeBeforeDispute = 3 * 24 * 60 * 60 * 1000; // 3天转换为毫秒
  const currentTime = Date.now();
  const proofSubmittedTime = Number(milestoneData.workProof.submittedAt) * 1000; // 转换为毫秒
  const timeConditionMet = currentTime >= proofSubmittedTime + minTimeBeforeDispute;

  // 如果不满足时间条件，不显示按钮
  if (!timeConditionMet) {
    return null;
  }

  return (
    <>
      <button className="btn btn-error btn-sm" onClick={() => setIsModalOpen(true)}>
        提出纠纷
      </button>

      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认提交纠纷</h3>
            <p className="py-4">确定要提交纠纷吗？这将冻结任务资金直到纠纷解决。</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                返回
              </button>
              <button className="btn btn-error" onClick={handleFileDispute} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    提交中...
                  </>
                ) : (
                  "确认提交"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
