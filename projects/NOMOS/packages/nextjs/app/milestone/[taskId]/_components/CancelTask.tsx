import { useState } from "react";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface CancelTaskProps {
  taskId: string;
  isTaskCreator: boolean;
  isTaskInProgress: boolean;
  taskData: any;
  disputeProcessingRewardBps: bigint | undefined;
  onSuccess?: () => void; // 添加 onSuccess 回调
}

export const CancelTask = ({
  taskId,
  isTaskCreator,
  taskData,
  disputeProcessingRewardBps,
  onSuccess, // 解构 onSuccess
}: CancelTaskProps) => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { writeContractAsync: terminateTask } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const { writeContractAsync: approveToken } = useScaffoldWriteContract({
    contractName: "TaskToken",
  });

  const { data: milestonePaymentTaskContract } = useDeployedContractInfo({
    contractName: "MilestonePaymentTask",
  });

  const handleCancelTask = async () => {
    try {
      setIsCancelling(true);

      // 根据合约逻辑，terminateTask可能需要提交纠纷，需要批准处理奖励
      // 检查是否满足提交纠纷的条件：
      // 1. 有工作者 (worker exists and not zero address)
      // 2. 至少有一个里程碑提交了工作量证明但尚未批准

      const hasWorker = taskData?.[5] && taskData?.[5] !== "0x0000000000000000000000000000000000000000";

      // 只有当任务有工作者且可能有纠纷时才需要批准代币
      if (hasWorker) {
        // 计算需要批准的金额 - 纠纷处理费用
        // 根据FixedPaymentTask的实现，使用整个任务的总奖励来计算处理费用
        const totalReward = taskData[1]; // totalreward
        const processingRewardBps = disputeProcessingRewardBps || BigInt(50); // 默认0.5%
        const processingReward = (totalReward * processingRewardBps) / BigInt(10000);

        // 批准代币给MilestonePaymentTask合约用于可能的纠纷处理奖励
        await approveToken({
          functionName: "approve",
          args: [milestonePaymentTaskContract?.address || "", processingReward],
        });
      }

      await terminateTask({
        functionName: "terminateTask",
        args: [BigInt(taskId)],
      });

      setIsCancelModalOpen(false);

      // 调用成功回调以刷新任务数据
      if (onSuccess) {
        onSuccess();
      }
    } catch (e) {
      console.error("Error cancelling task:", e);
    } finally {
      setIsCancelling(false);
    }
  };

  // 根据合约逻辑，只要任务不是已取消或已支付状态，任务创建者都可以取消任务
  if (!isTaskCreator || (taskData && (taskData[4] === 4 || taskData[4] === 3))) return null;

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          className={`btn btn-error btn-sm ${isCancelling ? "loading" : ""}`}
          onClick={() => setIsCancelModalOpen(true)}
          disabled={isCancelling}
        >
          {isCancelling ? "取消中..." : "取消任务"}
        </button>
      </div>

      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-base-100 rounded-lg p-6 w-96">
            <h3 className="font-bold text-lg mb-4">确认取消任务</h3>
            <p className="mb-4">您确定要取消此任务吗？这将终止任务并根据里程碑状态处理相关资金。</p>
            <div className="flex justify-end space-x-3">
              <button className="btn btn-ghost" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
                取消
              </button>
              <button
                className={`btn btn-error ${isCancelling ? "loading" : ""}`}
                onClick={handleCancelTask}
                disabled={isCancelling}
              >
                {isCancelling ? "取消中..." : "确认取消"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
