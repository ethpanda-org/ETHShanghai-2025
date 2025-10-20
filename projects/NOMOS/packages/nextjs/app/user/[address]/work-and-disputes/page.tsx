"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { getDisputeStatusColor, getTaskStatusColor } from "~~/utils/tasks";

// 获取 GraphQL SDK
const sdk = getBuiltGraphSDK();

const UserWorkAndDisputesPage = () => {
  const params = useParams<{ address: string }>();
  const { address: connectedAddress } = useAccount();
  const [userAddress, setUserAddress] = useState<string>("");
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 标签页状态
  const [activeTab, setActiveTab] = useState<"assigned" | "created" | "disputes" | "bids">("assigned");

  // 可折叠面板状态
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assignedFixed: false,
    assignedBidding: false,
    assignedMilestone: false,
    createdFixed: false,
    createdBidding: false,
    createdMilestone: false,
    workerDisputes: false,
    creatorDisputes: false,
    bids: false,
  });

  // 用户数据
  const [userData, setUserData] = useState<any>(null);

  // 切换可折叠面板
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 验证地址格式并获取用户数据
  useEffect(() => {
    // 验证地址格式
    if (!params.address || !params.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setIsValidAddress(false);
      return;
    }

    setIsValidAddress(true);
    setUserAddress(params.address);

    // 获取用户参与的所有任务和纠纷数据
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取用户所有相关数据
        const userResult = await sdk.GetUserWorkSummary({
          id: params.address.toLowerCase(),
        });

        if (userResult?.user) {
          setUserData(userResult.user);
        } else {
          setError("用户未找到");
        }
      } catch (err: any) {
        console.error("获取用户数据时出错:", err);
        setError(err.message || "获取用户数据时出错");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [params.address, connectedAddress]);

  // 格式化代币数量显示
  const formatTokenAmount = (amount: any) => {
    if (!amount) return "0";
    try {
      const amountStr = amount.toString();
      // 假设代币有18位小数
      const formatted = (Number(amountStr) / 1e18).toFixed(2);
      return formatted;
    } catch (e) {
      console.error("Error formatting token amount:", e);
      return amount.toString();
    }
  };

  if (!isValidAddress) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">无效地址</h2>
          <div className="text-center">
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">加载中...</h2>
          <div className="text-center">
            <p className="mb-4">正在加载用户工作和纠纷信息...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">错误</h2>
          <div className="text-center">
            <p className="mb-4">{error}</p>
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">用户未找到</h2>
          <div className="text-center">
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-10 px-4">
      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">工作和纠纷记录</h2>
          <Link href={`/user/${userAddress}`} className="btn btn-secondary btn-sm">
            返回用户资料
          </Link>
        </div>

        {/* 圆形按钮标签页导航 */}
        <div className="flex flex-wrap gap-2 mb-6 justify-start">
          <button
            className={`btn btn-sm ${activeTab === "assigned" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("assigned")}
            title="作为工作者参与"
          >
            作为工作者参与
          </button>
          <button
            className={`btn btn-sm ${activeTab === "created" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("created")}
            title="创建的任务"
          >
            创建的任务
          </button>
          <button
            className={`btn btn-sm ${activeTab === "disputes" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("disputes")}
            title="纠纷记录"
          >
            纠纷记录
          </button>
          <button
            className={`btn btn-sm ${activeTab === "bids" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("bids")}
            title="竞标记录"
          >
            竞标记录
          </button>
        </div>

        {/* 用户作为工作者参与的任务 */}
        {activeTab === "assigned" && (
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">作为工作者参与的任务</h3>

            {/* 固定薪酬任务 */}
            <div className="mb-4">
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("assignedFixed")}
              >
                <h4 className="text-lg font-semibold">固定薪酬任务</h4>
                <span className="text-xl">{expandedSections.assignedFixed ? "−" : "+"}</span>
              </div>
              {expandedSections.assignedFixed && (
                <div className="mt-2">
                  {userData.assignedTasks && userData.assignedTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>报酬</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.assignedTasks.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/fixed-payment/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无作为工作者参与的固定薪酬任务</div>
                  )}
                </div>
              )}
            </div>

            {/* 竞标任务 */}
            <div className="mb-4">
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("assignedBidding")}
              >
                <h4 className="text-lg font-semibold">竞标任务</h4>
                <span className="text-xl">{expandedSections.assignedBidding ? "−" : "+"}</span>
              </div>
              {expandedSections.assignedBidding && (
                <div className="mt-2">
                  {userData.biddingTaskAssigned && userData.biddingTaskAssigned.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>报酬</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.biddingTaskAssigned.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/bidding/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无作为工作者参与的竞标任务</div>
                  )}
                </div>
              )}
            </div>

            {/* 里程碑任务 */}
            <div>
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("assignedMilestone")}
              >
                <h4 className="text-lg font-semibold">里程碑任务</h4>
                <span className="text-xl">{expandedSections.assignedMilestone ? "−" : "+"}</span>
              </div>
              {expandedSections.assignedMilestone && (
                <div className="mt-2">
                  {userData.milestonePaymentTaskAssigned && userData.milestonePaymentTaskAssigned.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>报酬</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.milestonePaymentTaskAssigned.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/milestone/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无作为工作者参与的里程碑任务</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 用户创建的任务 */}
        {activeTab === "created" && (
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">创建的任务</h3>

            {/* 固定薪酬任务 */}
            <div className="mb-4">
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("createdFixed")}
              >
                <h4 className="text-lg font-semibold">固定薪酬任务</h4>
                <span className="text-xl">{expandedSections.createdFixed ? "−" : "+"}</span>
              </div>
              {expandedSections.createdFixed && (
                <div className="mt-2">
                  {userData.createdTasks && userData.createdTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>报酬</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.createdTasks.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/fixed-payment/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无创建的固定薪酬任务</div>
                  )}
                </div>
              )}
            </div>

            {/* 竞标任务 */}
            <div className="mb-4">
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("createdBidding")}
              >
                <h4 className="text-lg font-semibold">竞标任务</h4>
                <span className="text-xl">{expandedSections.createdBidding ? "−" : "+"}</span>
              </div>
              {expandedSections.createdBidding && (
                <div className="mt-2">
                  {userData.biddingTaskCreated && userData.biddingTaskCreated.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>报酬</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.biddingTaskCreated.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/bidding/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无创建的竞标任务</div>
                  )}
                </div>
              )}
            </div>

            {/* 里程碑任务 */}
            <div>
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("createdMilestone")}
              >
                <h4 className="text-lg font-semibold">里程碑任务</h4>
                <span className="text-xl">{expandedSections.createdMilestone ? "−" : "+"}</span>
              </div>
              {expandedSections.createdMilestone && (
                <div className="mt-2">
                  {userData.milestonePaymentTaskCreated && userData.milestonePaymentTaskCreated.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>任务ID</th>
                            <th>标题</th>
                            <th>总报酬</th>
                            <th>里程碑数</th>
                            <th>已完成</th>
                            <th>截止时间</th>
                            <th>状态</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.milestonePaymentTaskCreated.map((task: any) => (
                            <tr key={task.id}>
                              <td>#{task.taskId?.toString()}</td>
                              <td>{task.title}</td>
                              <td>{formatTokenAmount(task.reward)} Tokens</td>
                              <td>{task.milestones?.length || 0}</td>
                              <td>{task.completedMilestonesCount?.toString() || "0"}</td>
                              <td>
                                {task.deadline ? new Date(Number(task.deadline) * 1000).toLocaleDateString() : "N/A"}
                              </td>
                              <td>
                                <span className={`badge ${getTaskStatusColor(task.status)}`}>{task.status}</span>
                              </td>
                              <td>
                                <Link href={`/milestone/${task.taskId}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无创建的里程碑任务</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 纠纷记录 */}
        {activeTab === "disputes" && (
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">纠纷记录</h3>

            {/* 作为工作者参与的纠纷 */}
            <div className="mb-4">
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("workerDisputes")}
              >
                <h4 className="text-lg font-semibold">作为工作者参与的纠纷</h4>
                <span className="text-xl">{expandedSections.workerDisputes ? "−" : "+"}</span>
              </div>
              {expandedSections.workerDisputes && (
                <div className="mt-2">
                  {userData.workerDisputes && userData.workerDisputes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>纠纷ID</th>
                            <th>任务ID</th>
                            <th>报酬金额</th>
                            <th>分配给工作者</th>
                            <th>状态</th>
                            <th>创建时间</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.workerDisputes.map((dispute: any) => (
                            <tr key={dispute.id}>
                              <td>#{dispute.disputeId?.toString()}</td>
                              <td>#{dispute.taskId?.toString()}</td>
                              <td>{formatTokenAmount(dispute.rewardAmount)} Tokens</td>
                              <td>{formatTokenAmount(dispute.workerShare)} Tokens</td>
                              <td>
                                <span className={`badge ${getDisputeStatusColor(dispute.status)}`}>
                                  {dispute.status}
                                </span>
                              </td>
                              <td>
                                {dispute.createdAt
                                  ? new Date(Number(dispute.createdAt) * 1000).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td>
                                <Link href={`/dispute/${dispute.id}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无作为工作者参与的纠纷</div>
                  )}
                </div>
              )}
            </div>

            {/* 作为任务创建者参与的纠纷 */}
            <div>
              <div
                className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
                onClick={() => toggleSection("creatorDisputes")}
              >
                <h4 className="text-lg font-semibold">作为任务创建者参与的纠纷</h4>
                <span className="text-xl">{expandedSections.creatorDisputes ? "−" : "+"}</span>
              </div>
              {expandedSections.creatorDisputes && (
                <div className="mt-2">
                  {userData.creatorDisputes && userData.creatorDisputes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra w-full">
                        <thead>
                          <tr>
                            <th>纠纷ID</th>
                            <th>任务ID</th>
                            <th>报酬金额</th>
                            <th>状态</th>
                            <th>创建时间</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.creatorDisputes.map((dispute: any) => (
                            <tr key={dispute.id}>
                              <td>#{dispute.disputeId?.toString()}</td>
                              <td>#{dispute.taskId?.toString()}</td>
                              <td>{formatTokenAmount(dispute.rewardAmount)} Tokens</td>
                              <td>
                                <span className={`badge ${getDisputeStatusColor(dispute.status)}`}>
                                  {dispute.status}
                                </span>
                              </td>
                              <td>
                                {dispute.createdAt
                                  ? new Date(Number(dispute.createdAt) * 1000).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td>
                                <Link href={`/dispute/${dispute.id}`} className="btn btn-xs btn-primary">
                                  查看详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">暂无作为任务创建者参与的纠纷</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 竞标记录 */}
        {activeTab === "bids" && (
          <div>
            <div
              className="flex justify-between items-center cursor-pointer bg-base-200 p-3 rounded-lg"
              onClick={() => toggleSection("bids")}
            >
              <h3 className="text-xl font-bold">竞标记录</h3>
              <span className="text-xl">{expandedSections.bids ? "−" : "+"}</span>
            </div>
            {expandedSections.bids && (
              <div className="mt-2">
                {userData.bids && userData.bids.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>任务ID</th>
                          <th>竞标金额</th>
                          <th>预计时间</th>
                          <th>竞标描述</th>
                          <th>创建时间</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userData.bids.map((bid: any) => (
                          <tr key={bid.id}>
                            <td>#{bid.taskId?.toString()}</td>
                            <td>{formatTokenAmount(bid.amount)} Tokens</td>
                            <td>
                              {bid.estimatedTime ? (BigInt(bid.estimatedTime) / BigInt(86400)).toString() : "0"} 天
                            </td>
                            <td>{bid.description}</td>
                            <td>
                              {bid.createdAt ? new Date(Number(bid.createdAt) * 1000).toLocaleDateString() : "N/A"}
                            </td>
                            <td>
                              <Link href={`/bidding/${bid.taskId}`} className="btn btn-xs btn-primary">
                                查看任务
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">暂无竞标记录</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserWorkAndDisputesPage;
