"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const IncreaseReward = ({
  taskId,
  taskCreator,
  milestones,
  onSuccess,
}: {
  taskId: string;
  taskCreator: string;
  milestones: any[];
  onSuccess?: () => void;
}) => {
  const { address: connectedAddress } = useAccount();
  const [rewardAmount, setRewardAmount] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 获取用户代币余额
  const { data: userTokenBalance } = useScaffoldReadContract({
    contractName: "TaskToken",
    functionName: "balanceOf",
    args: [connectedAddress || ""],
  });

  const { data: milestonePaymentTaskContract } = useDeployedContractInfo({ contractName: "MilestonePaymentTask" });
  const { writeContractAsync: increaseReward } = useScaffoldWriteContract({ contractName: "MilestonePaymentTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMilestone) {
      setError("请输入里程碑索引");
      return;
    }

    // 用户输入的是从1开始的编号，需要转换为从0开始的索引
    const milestoneIndex = parseInt(selectedMilestone) - 1;
    if (isNaN(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      setError(`请输入有效的里程碑编号 (1-${milestones.length})`);
      return;
    }

    if (!rewardAmount) {
      setError("请输入奖励金额");
      return;
    }

    const reward = parseFloat(rewardAmount);
    if (isNaN(reward) || reward <= 0) {
      setError("请输入有效的奖励金额");
      return;
    }

    if (!milestonePaymentTaskContract) {
      setError("合约未部署或地址无效");
      return;
    }

    // 再次验证是否为任务创建者
    if (!connectedAddress || taskCreator.toLowerCase() !== connectedAddress.toLowerCase()) {
      setError("只有任务创建者才能增加奖励");
      return;
    }

    // 检查用户余额是否足够
    const rewardInWei = parseEther(rewardAmount);
    if (userTokenBalance !== undefined && userTokenBalance < rewardInWei) {
      setError(`代币余额不足。当前余额: ${Number(userTokenBalance) / 1e18} TST，需要: ${reward} TST`);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // 先授权代币
      await approveToken({
        functionName: "approve",
        args: [milestonePaymentTaskContract.address, rewardInWei],
      });

      // 然后增加奖励 - 使用从0开始的索引
      await increaseReward({
        functionName: "increaseMilestoneReward",
        args: [BigInt(taskId), BigInt(milestoneIndex), rewardInWei],
      });

      notification.success("奖励增加成功");
      onSuccess?.();
      setRewardAmount("");
      setSelectedMilestone("");
    } catch (e: any) {
      console.error("Error increasing reward:", e);
      // 检查是否为特定的合约错误
      if (e.message?.includes("OnlyTaskCreator")) {
        setError("只有任务创建者才能增加奖励");
      } else if (e.message?.includes("RewardMoreThanZero")) {
        setError("奖励金额必须大于0");
      } else if (e.message?.includes("ERC20InsufficientBalance")) {
        setError("代币余额不足，请确保您有足够的TST代币");
      } else {
        setError(e.message || "增加奖励时出错");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 只有任务创建者才能增加奖励
  const isTaskCreator = connectedAddress && taskCreator.toLowerCase() === connectedAddress.toLowerCase();

  if (!isTaskCreator) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow-xl mt-6 w-full">
      <div className="card-body">
        <h2 className="card-title">增加奖励</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">里程碑编号</span>
            </label>
            <input
              type="number"
              min="1"
              max={milestones.length}
              placeholder={`输入里程碑编号 (1-${milestones.length})`}
              className="input input-bordered w-full max-w-full"
              value={selectedMilestone}
              onChange={e => setSelectedMilestone(e.target.value)}
            />
          </div>

          <div className="form-control mt-4 w-full">
            <label className="label">
              <span className="label-text">奖励金额 (TST)</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="输入奖励金额"
              className="input input-bordered w-full max-w-full"
              value={rewardAmount}
              onChange={e => setRewardAmount(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-error text-sm mt-2">{error}</div>}

          <div className="card-actions justify-end mt-4">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  增加中...
                </>
              ) : (
                "增加奖励"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
