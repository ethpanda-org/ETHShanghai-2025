"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface CompleteTaskProps {
  taskId: string;
  isTaskInProgress: boolean;
  milestonesLength: number;
  onSuccess?: () => void;
}

export const CompleteTask = ({ taskId, isTaskInProgress, milestonesLength, onSuccess }: CompleteTaskProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync: completeTask } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const handleCompleteTask = async () => {
    try {
      setIsLoading(true);
      const result = await completeTask({
        functionName: "completeTask",
        args: [BigInt(taskId)],
      });
      console.log("Complete task transaction result:", result);
      onSuccess?.();
    } catch (e) {
      console.error("Error completing task:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 只有任务创建者且所有里程碑都已完成时才能完成任务
  if (!isTaskInProgress || milestonesLength === 0) {
    return null;
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={handleCompleteTask} disabled={isLoading}>
      {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "完成任务"}
    </button>
  );
};
