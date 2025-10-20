import { useState } from "react";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface CancelTaskProps {
  taskId: string;
  taskStatus: string; // 修改类型为string
  taskData: any;
  taskProof: any;
  disputeProcessingRewardBps: bigint | undefined;
  onSuccess?: () => void;
}

export const CancelTask = ({
  taskId,
  taskStatus,
  taskData,
  taskProof,
  disputeProcessingRewardBps,
  onSuccess,
}: CancelTaskProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { writeContractAsync: terminateTask } = useScaffoldWriteContract({ contractName: "FixedPaymentTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });
  const { data: fixedPaymentTaskContract } = useDeployedContractInfo({ contractName: "FixedPaymentTask" });

  const handleCancelTask = async () => {
    try {
      // 根据合约逻辑，terminateTask可能需要提交纠纷，需要批准处理奖励
      if (
        taskData?.[5] &&
        taskData?.[5] !== "0x0000000000000000000000000000000000000000" && // worker exists
        taskProof &&
        taskProof[0] &&
        !taskProof[1]
      ) {
        // proof submitted but not approved
        // 如果有工作者且有报酬，则可能需要提交纠纷
        const rewardAmount = taskData?.[1] || BigInt(0);
        const processingRewardBps = disputeProcessingRewardBps || BigInt(50); // 默认0.5%
        const processingReward = (rewardAmount * processingRewardBps) / BigInt(10000);

        // 先批准代币给FixedPaymentTask合约用于可能的纠纷处理
        await approveToken({
          functionName: "approve",
          args: [fixedPaymentTaskContract?.address || "", processingReward],
        });
      }

      await terminateTask({
        functionName: "terminateTask",
        args: [BigInt(taskId)],
      });
      setIsModalOpen(false);
      onSuccess?.();
    } catch (e) {
      console.error("Error cancelling task:", e);
    }
  };

  // 根据合约逻辑更新，只要不是已经支付或者已经取消的任务都可以使用取消任务的功能
  const canCancelTask = taskStatus !== "Paid" && taskStatus !== "Cancelled";

  if (!canCancelTask) {
    return null;
  }

  return (
    <>
      <button className="btn btn-error" onClick={() => setIsModalOpen(true)}>
        取消任务
      </button>

      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认取消任务</h3>
            <p className="py-4">确定要取消这个任务吗？</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                返回
              </button>
              <button className="btn btn-error" onClick={handleCancelTask}>
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
