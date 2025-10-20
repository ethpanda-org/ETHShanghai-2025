"use client";

import { useState } from "react";
import { ClaimMilestoneReward } from "./ClaimMilestoneReward";
import { formatUnits } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface Milestone {
  id: string;
  description: string;
  reward: string;
  workProof?: {
    submitted: boolean;
    approved: boolean;
    proof?: string;
    submitter?: string;
  };
  paid: boolean;
  actions?: React.ReactNode;
}

interface MilestonesListProps {
  milestones: Milestone[];
  isTaskCreator: boolean;
  isTaskWorker: boolean;
  onApproveMilestone: (milestoneIndex: number) => void;
  onPayMilestone: (milestoneIndex: number) => void;
  onSubmitProof: (index: number) => void;
}

const ApproveMilestone = ({
  taskId,
  milestoneIndex,
  onSuccess,
}: {
  taskId: string;
  milestoneIndex: number;
  onSuccess?: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync: approveMilestone } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const handleApproveMilestone = async () => {
    try {
      setIsLoading(true);
      const result = await approveMilestone({
        functionName: "approveMilestone",
        args: [BigInt(taskId), BigInt(milestoneIndex)],
      });
      console.log("Approval transaction result:", result);
      onSuccess?.();
    } catch (e) {
      console.error("Error approving milestone:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button className="btn btn-primary btn-sm" onClick={handleApproveMilestone} disabled={isLoading}>
      {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "批准"}
    </button>
  );
};

export const MilestonesList = ({
  milestones,
  isTaskCreator,
  isTaskWorker,
  onApproveMilestone,
  onPayMilestone,
  onSubmitProof,
}: MilestonesListProps) => {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);

  const toggleMilestone = (index: number) => {
    setExpandedMilestone(expandedMilestone === index ? null : index);
  };

  return (
    <div className="card bg-base-100 shadow border border-base-300 rounded-2xl">
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold mb-4">里程碑</h2>
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="border border-base-300 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">里程碑 #{index + 1}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    报酬: {formatUnits(BigInt(milestone.reward || 0), 18)} Tokens
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {milestone.workProof?.approved && <span className="badge badge-success badge-sm">已批准</span>}
                  {milestone.paid && <span className="badge badge-primary badge-sm">已支付</span>}
                  {milestone.workProof?.submitted && !milestone.workProof?.approved && !milestone.paid && (
                    <span className="badge badge-warning badge-sm">待批准</span>
                  )}
                  <button className="btn btn-xs btn-circle" onClick={() => toggleMilestone(index)}>
                    {expandedMilestone === index ? "−" : "+"}
                  </button>
                </div>
              </div>

              {expandedMilestone === index && (
                <div className="mt-4 pl-4 border-l-2 border-base-300">
                  <p className="mb-3">{milestone.description}</p>

                  {milestone.workProof?.submitted && (
                    <div className="mt-3">
                      <p className="font-semibold">工作量证明:</p>
                      <p className="text-sm mt-1">{milestone.workProof.proof}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        提交者: <Address address={milestone.workProof.submitter} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {!milestone.workProof?.submitted && isTaskWorker && (
                      <button className="btn btn-sm btn-primary" onClick={() => onSubmitProof(index)}>
                        提交工作量证明
                      </button>
                    )}

                    {isTaskCreator && milestone.workProof?.submitted && !milestone.workProof?.approved && (
                      <ApproveMilestone
                        taskId={milestones[0].id.split("-")[0]}
                        milestoneIndex={index}
                        onSuccess={() => onApproveMilestone(index)}
                      />
                    )}

                    {isTaskWorker && milestone.workProof?.approved && !milestone.paid && (
                      <ClaimMilestoneReward
                        taskId={milestones[0].id.split("-")[0]}
                        milestoneIndex={index}
                        onSuccess={() => onPayMilestone(index)}
                      />
                    )}

                    {milestone.actions}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
