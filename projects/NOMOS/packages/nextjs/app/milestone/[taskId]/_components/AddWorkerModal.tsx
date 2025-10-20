import { useState } from "react";
import { AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface AddWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: () => void;
}

export const AddWorkerModal = ({ isOpen, onClose, taskId, onSuccess }: AddWorkerModalProps) => {
  const [workerAddress, setWorkerAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync: addWorker } = useScaffoldWriteContract({
    contractName: "MilestonePaymentTask",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workerAddress) {
      setError("请填写工作者地址");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await addWorker({
        functionName: "addWorker",
        args: [BigInt(taskId), workerAddress],
      });

      // 重置表单
      setWorkerAddress("");

      // 调用成功回调
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error("Error adding worker:", e);
      setError(e.message || "添加工作者时出错");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">分配工作者</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-bold">工作者地址</span>
            </label>
            <AddressInput
              value={workerAddress}
              onChange={value => setWorkerAddress(value)}
              placeholder="输入工作者地址"
            />
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
              {isSubmitting ? "分配中..." : "确认分配"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
