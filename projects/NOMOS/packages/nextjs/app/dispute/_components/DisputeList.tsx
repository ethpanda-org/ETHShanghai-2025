"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { getStatusText, getTaskStatusColor } from "~~/utils/tasks";

/**
 * 纠纷列表组件
 */
export const DisputeList = () => {
  const [activeTab, setActiveTab] = useState<"filed" | "resolved" | "distributed">("filed");
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取纠纷信息
  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        setLoading(true);
        // 获取 GraphQL SDK
        const sdk = getBuiltGraphSDK();

        const result = await sdk.GetDisputesForList({
          first: 100,
          skip: 0,
          where: {
            status: activeTab === "filed" ? "Filed" : activeTab === "resolved" ? "Resolved" : "Distributed",
          },
          orderBy: "createdAt",
          orderDirection: "desc",
        });

        setDisputes(result.disputes || []);
      } catch (err) {
        console.error("Error fetching disputes:", err);
        setError("加载纠纷数据时出错");
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">正在加载纠纷数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
        <div className="text-center py-8 text-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab tab-lg ${activeTab === "filed" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("filed")}
        >
          已提交
        </button>
        <button
          className={`tab tab-lg ${activeTab === "resolved" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("resolved")}
        >
          已解决
        </button>
        <button
          className={`tab tab-lg ${activeTab === "distributed" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("distributed")}
        >
          已分配
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">暂无纠纷数据</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>纠纷ID</th>
                <th>任务ID</th>
                <th>工作者</th>
                <th>创建者</th>
                <th>奖励金额</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(dispute => (
                <tr key={dispute.id}>
                  <td>#{dispute.disputeId.toString()}</td>
                  <td>#{dispute.taskId.toString()}</td>
                  <td>
                    <div className="font-mono text-sm">
                      {dispute.worker.address.slice(0, 6)}...{dispute.worker.address.slice(-4)}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono text-sm">
                      {dispute.taskCreator.address.slice(0, 6)}...{dispute.taskCreator.address.slice(-4)}
                    </div>
                  </td>
                  <td>{(Number(dispute.rewardAmount) / 1e18).toFixed(2)} TST</td>
                  <td>
                    <span className={`badge ${getTaskStatusColor(dispute.status)}`}>
                      {getStatusText(dispute.status)}
                    </span>
                  </td>
                  <td>{new Date(Number(dispute.createdAt) * 1000).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/dispute/${dispute.disputeId}`} className="btn btn-sm btn-primary">
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
