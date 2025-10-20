"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface ClaimMilestoneRewardProps {
  taskId: string;
  milestoneIndex: number;
  onSuccess?: () => void;
}

export const ClaimMilestoneReward = ({ taskId, milestoneIndex, onSuccess }: ClaimMilestoneRewardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync: payMilestone } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const handleClaimReward = async () => {
    try {
      setIsLoading(true);
      const result = await payMilestone({
        functionName: "payMilestone",
        args: [BigInt(taskId), BigInt(milestoneIndex)],
      });
      console.log("Payment transaction result:", result);
      onSuccess?.();
    } catch (e) {
      console.error("Error claiming milestone reward:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button className="btn btn-primary btn-sm" onClick={handleClaimReward} disabled={isLoading}>
      {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "领取报酬"}
    </button>
  );
};
