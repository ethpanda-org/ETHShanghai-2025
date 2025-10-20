import { useState } from "react";
import { parseEther } from "viem";
import { AddressInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface AddWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: () => void;
}

export const AddWorkerModal = ({ isOpen, onClose, taskId, onSuccess }: AddWorkerModalProps) => {
  const [workerAddress, setWorkerAddress] = useState("");
  const [taskReward, setTaskReward] = useState("");
  const [isAddingWorker, setIsAddingWorker] = useState(false);

  // 获取FixedPaymentTask合约信息
  const { data: fixedPaymentTaskContract } = useDeployedContractInfo({ contractName: "FixedPaymentTask" });

  // 获取TaskToken合约信息
  const { data: taskTokenContract } = useDeployedContractInfo({ contractName: "TaskToken" });

  const { writeContractAsync: addWorker } = useScaffoldWriteContract({ contractName: "FixedPaymentTask" });
  const { writeContractAsync: approveToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workerAddress) {
      alert("请填写工作者地址");
      return;
    }

    if (!taskReward || Number(taskReward) <= 0) {
      alert("请输入有效的任务报酬");
      return;
    }

    if (!fixedPaymentTaskContract || !taskTokenContract) {
      alert("合约信息未找到");
      return;
    }

    try {
      setIsAddingWorker(true);

      // 将用户输入的值转换为wei单位
      const rewardInWei = parseEther(taskReward);

      // 先授权代币，使用 TaskToken 合约地址
      await approveToken({
        functionName: "approve",
        args: [fixedPaymentTaskContract.address, rewardInWei],
      });

      // 然后添加工作者
      await addWorker({
        functionName: "addWorker",
        args: [BigInt(taskId), workerAddress, rewardInWei],
      });

      // 重置表单
      setWorkerAddress("");
      setTaskReward("");

      if (onSuccess) {
        onSuccess();
      }

      // 关闭模态框
      onClose();
    } catch (e) {
      console.error("Error adding worker:", e);
      alert("添加工作者时出错，请查看控制台了解详细信息");
    } finally {
      setIsAddingWorker(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">添加工作者</h3>
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

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-bold">任务报酬 (TST)</span>
            </label>
            <input
              type="number"
              placeholder="任务报酬"
              className="input input-bordered w-full"
              value={taskReward}
              onChange={e => setTaskReward(e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose} disabled={isAddingWorker}>
              取消
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${isAddingWorker ? "loading" : ""}`}
              disabled={isAddingWorker}
            >
              {isAddingWorker ? "添加中..." : "添加工作者"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
