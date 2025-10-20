"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export const IncreaseReward = ({
  taskId,
  task,
  userTokenBalance,
  onSuccess,
}: {
  taskId: string;
  task: any;
  userTokenBalance: any;
  onSuccess?: () => void;
}) => {
  const { address: connectedAddress } = useAccount();
  const [rewardAmount, setRewardAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: fixedPaymentTaskContract } = useDeployedContractInfo({ contractName: "FixedPaymentTask" });
  const { writeContractAsync: increaseReward } = useScaffoldWriteContract({ contractName: "FixedPaymentTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rewardAmount) {
      setError("请输入奖励金额");
      return;
    }

    const reward = parseFloat(rewardAmount);
    if (isNaN(reward) || reward <= 0) {
      setError("请输入有效的奖励金额");
      return;
    }

    if (!fixedPaymentTaskContract) {
      setError("合约未部署或地址无效");
      return;
    }

    // 再次验证是否为任务创建者
    // Task结构: [id, totalreward, deadline, status, creator, worker]
    if (!task || !connectedAddress || task[4].toLowerCase() !== connectedAddress.toLowerCase()) {
      setError("只有任务创建者才能增加奖励");
      return;
    }

    // 检查用户余额是否足够
    const rewardInWei = BigInt(Math.floor(reward * 1e18));
    if (userTokenBalance !== undefined && userTokenBalance < rewardInWei) {
      setError(`代币余额不足。当前余额: ${Number(userTokenBalance) / 1e18} TST，需要: ${reward} TST`);
      return;
    }

    try {
      setIsLoading(true);

      // 先授权代币
      await approveToken({
        functionName: "approve",
        args: [fixedPaymentTaskContract.address, rewardInWei],
      });

      // 然后增加奖励
      await increaseReward({
        functionName: "increaseReward",
        args: [BigInt(taskId), rewardInWei],
      });

      onSuccess?.();
      setRewardAmount("");
    } catch (e: any) {
      console.error("Error increasing reward:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 只有任务创建者才能增加奖励
  // Task结构: [id, totalreward, deadline, status, creator, worker]
  const isTaskCreator = task && connectedAddress && task[4].toLowerCase() === connectedAddress.toLowerCase();

  if (!isTaskCreator) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow-xl mt-6">
      <div className="card-body">
        <h2 className="card-title">增加奖励</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">增加的奖励金额 (TST)</span>
            </label>
            <input
              type="number"
              value={rewardAmount}
              onChange={e => setRewardAmount(e.target.value)}
              placeholder="输入奖励金额"
              className="input input-bordered"
              min="0"
              step="0.01"
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
