import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface SubmitBidProps {
  taskId: bigint;
  isTaskOpen: boolean;
}

export const SubmitBid = ({ taskId, isTaskOpen }: SubmitBidProps) => {
  const { address } = useAccount();
  const [bidAmount, setBidAmount] = useState("");
  const [bidDescription, setBidDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const { writeContractAsync: submitBid } = useScaffoldWriteContract({ contractName: "BiddingTask" });

  const handleSubmitBid = async () => {
    if (!address || !isTaskOpen) {
      return;
    }

    if (!bidAmount || !bidDescription || !estimatedTime) {
      return;
    }

    try {
      // 将天数转换为秒数（1天 = 86400秒）
      const estimatedTimeInSeconds = BigInt(estimatedTime) * BigInt(86400);

      // 将竞标金额转换为正确的单位
      const bidAmountInWei = parseEther(bidAmount);

      await submitBid({
        functionName: "submitBid",
        args: [taskId, bidAmountInWei, bidDescription, estimatedTimeInSeconds],
      });
      // 清空表单
      setBidAmount("");
      setBidDescription("");
      setEstimatedTime("");
    } catch (e) {
      console.error("Error submitting bid:", e);
    }
  };

  if (!isTaskOpen) {
    return (
      <div className="bg-base-200 p-4 rounded-xl">
        <h3 className="font-bold text-lg mb-2">提交竞标</h3>
        <p className="text-gray-500">任务已关闭，无法提交竞标</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 p-4 rounded-xl">
      <h3 className="font-bold text-lg mb-2">提交竞标</h3>
      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold">竞标金额</span>
          </label>
          <input
            type="number"
            placeholder="竞标金额"
            className="input input-bordered w-full"
            value={bidAmount}
            onChange={e => setBidAmount(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold">竞标描述/提案</span>
          </label>
          <textarea
            placeholder="详细描述您的竞标方案"
            className="textarea textarea-bordered w-full"
            value={bidDescription}
            onChange={e => setBidDescription(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold">预计完成时间 (天)</span>
          </label>
          <input
            type="number"
            placeholder="预计完成时间"
            className="input input-bordered w-full"
            value={estimatedTime}
            onChange={e => setEstimatedTime(e.target.value)}
            min="1"
          />
        </div>
        <button className="btn btn-primary w-full" onClick={handleSubmitBid}>
          提交竞标
        </button>
      </div>
    </div>
  );
};
