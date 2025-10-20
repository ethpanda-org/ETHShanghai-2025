import { useState } from "react";
import { parseEther } from "viem";
import { InputBase } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: () => void;
}

export const AddMilestoneModal = ({ isOpen, onClose, taskId, onSuccess }: AddMilestoneModalProps) => {
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: milestonePaymentTaskContract } = useDeployedContractInfo({
    contractName: "MilestonePaymentTask",
  });

  const { writeContractAsync: approveToken } = useScaffoldWriteContract({
    contractName: "TaskToken",
  });

  const { writeContractAsync: addMilestoneContract } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      setError("请填写里程碑描述");
      return;
    }

    if (!reward) {
      setError("请填写奖励金额");
      return;
    }

    // 验证奖励金额
    const rewardValue = parseFloat(reward);
    if (isNaN(rewardValue) || rewardValue <= 0) {
      setError("请输入有效的奖励金额");
      return;
    }

    if (!milestonePaymentTaskContract) {
      setError("合约未部署或地址无效");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const rewardInWei = parseEther(reward);

      // 批准代币转移给里程碑付款任务合约
      await approveToken({
        functionName: "approve",
        args: [milestonePaymentTaskContract.address, rewardInWei],
      });

      // 调用合约添加里程碑
      await addMilestoneContract({
        functionName: "addMilestone",
        args: [BigInt(taskId), description, rewardInWei],
      });

      // 重置表单
      setDescription("");
      setReward("");

      // 调用成功回调
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error("Error adding milestone:", e);
      setError(e.message || "添加里程碑时出错");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">添加里程碑</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-bold">里程碑描述</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="输入里程碑描述"
              className="textarea textarea-bordered w-full"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-bold">里程碑报酬 (TST)</span>
            </label>
            <InputBase
              value={reward}
              onChange={value => setReward(value)}
              placeholder="输入里程碑报酬"
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 mt-1">
              输入数字，单位为TST代币。例如：输入1表示1个TST代币（即10^18个最小单位）
            </div>
          </div>

          {error && <div className="text-error text-sm mb-4">{error}</div>}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>
              取消
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "添加中..." : "添加里程碑"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
