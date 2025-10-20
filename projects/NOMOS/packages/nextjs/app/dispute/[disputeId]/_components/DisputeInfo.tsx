"use client";

import { Address } from "~~/components/scaffold-eth";

interface DisputeInfoProps {
  disputeId: string;
  disputeData: any;
  getStatusText: (status: string) => string;
  getStatusColor: (status: string) => string;
}

export const DisputeInfo = ({ disputeId, disputeData, getStatusText, getStatusColor }: DisputeInfoProps) => {
  return (
    <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold">纠纷 #{disputeId}</h2>
        <span className={`badge ${getStatusColor(disputeData.status)} badge-lg`}>
          {getStatusText(disputeData.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-500">任务ID</p>
          <p className="font-mono">#{disputeData.taskId?.toString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">提交时间</p>
          <p>{disputeData.createdAt ? new Date(Number(disputeData.createdAt) * 1000).toLocaleString() : "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">解决时间</p>
          <p>
            {disputeData.resolvedAt && Number(disputeData.resolvedAt) > 0
              ? new Date(Number(disputeData.resolvedAt) * 1000).toLocaleString()
              : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">奖励金额</p>
          <p className="font-bold">
            {disputeData.rewardAmount ? (Number(disputeData.rewardAmount) / 1e18).toFixed(2) : "0.00"} TST
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">任务合约</p>
          <Address address={disputeData.taskContract} />
        </div>
        <div>
          <p className="text-sm text-gray-500">工作者</p>
          <Address address={disputeData.worker?.address} />
        </div>
        <div>
          <p className="text-sm text-gray-500">任务创建者</p>
          <Address address={disputeData.taskCreator?.address} />
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-500">工作量证明</p>
          <p className="whitespace-pre-wrap break-words">{disputeData.proofOfWork || "N/A"}</p>
        </div>
      </div>

      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" />
        <div className="collapse-title font-medium">纠纷详情</div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-500">工作者批准</p>
              <p className={disputeData.workerApproved ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                {disputeData.workerApproved ? "已批准" : "未批准"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">创建者批准</p>
              <p className={disputeData.creatorApproved ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                {disputeData.creatorApproved ? "已批准" : "未批准"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">工作者份额</p>
              <p>{disputeData.workerShare ? (Number(disputeData.workerShare) / 1e18).toFixed(2) : "0.00"} TST</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">分配时间</p>
              <p>
                {disputeData.distributedAt && Number(disputeData.distributedAt) > 0
                  ? new Date(Number(disputeData.distributedAt) * 1000).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
