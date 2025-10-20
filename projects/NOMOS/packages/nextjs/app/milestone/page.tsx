"use client";

import { useCallback, useEffect, useState } from "react";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { CreateTaskModal } from "~~/components/tasks/CreateTaskModal";
import { TaskCard } from "~~/components/tasks/TaskCard";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const MilestonePaymentTaskPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("Open"); // 默认只显示Open状态的任务
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { writeContractAsync: createTask } = useScaffoldWriteContract({ contractName: "MilestonePaymentTask" });

  // 获取任务数据
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      // 将sdk的创建移到函数内部，避免因对象引用变化导致的无限循环
      const sdk = getBuiltGraphSDK();
      const result = await sdk.GetMilestonePaymentTasksForList({
        first: 100,
        skip: 0,
        orderBy: "createdAt",
        orderDirection: "desc",
        where: {},
      });

      if (result?.milestonePaymentTasks) {
        setTasks(result.milestonePaymentTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []); // 移除sdk依赖以避免无限循环

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (title: string, description: string, deadline: number) => {
    if (!title || !description || deadline <= 0) {
      return;
    }

    try {
      await createTask({
        functionName: "createTask",
        args: [title, description, BigInt(Math.floor(Date.now() / 1000) + deadline)],
      });
      // 重新获取任务数据
      await fetchTasks();

      setIsModalOpen(false);
    } catch (e) {
      console.error("Error creating task:", e);
    }
  };

  // 获取状态筛选选项
  const statusOptions = ["Open", "InProgress", "Paid", "Cancelled"];

  // 根据选择的状态筛选任务
  const filteredTasks = tasks.filter(task => {
    // 直接使用字符串状态进行比较，避免数字映射错误
    return task.status === selectedStatus;
  });

  return (
    <div className="flex flex-col items-center pt-10 px-4">
      <div className="w-full max-w-6xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">里程碑任务列表</h2>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            创建新任务
          </button>
        </div>

        {/* 状态筛选器 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <button
                key={option}
                className={`btn btn-sm ${selectedStatus === option ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSelectedStatus(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* 任务列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map(task => <TaskCard key={task.taskId} task={task} basePath="/milestone" />)
          ) : (
            <div className="col-span-full text-center py-10">
              <h3 className="text-xl font-semibold mb-2">暂无任务</h3>
              <p className="text-gray-500">
                {tasks.length === 0 ? "当前没有任何任务，创建一个新任务开始吧！" : "没有符合当前筛选条件的任务"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 w-full max-w-6xl mb-8">
        <h2 className="text-2xl font-bold mb-6">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-base-200 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2">创建任务</h3>
            <p className="text-sm">
              任务创建者可以创建一个里程碑任务，指定任务标题、描述和截止时间。
              创建任务后可以添加工作者并设置里程碑报酬。
            </p>
          </div>
          <div className="bg-base-200 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2">任务执行</h3>
            <p className="text-sm">
              工作者可以接受里程碑任务，任务创建者可以设置多个里程碑节点。 每完成一个里程碑，工作者可以获得相应的报酬。
            </p>
          </div>
          <div className="bg-base-200 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2">任务验证与支付</h3>
            <p className="text-sm">
              任务创建者可以验证工作者提交的工作量证明，验证通过后任务状态将更新为完成状态。
              工作者随后可以调用支付功能领取报酬，系统会自动扣除平台费用后将剩余报酬转账给工作者。
            </p>
          </div>
          <div className="bg-base-200 p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-2">纠纷处理</h3>
            <p className="text-sm">
              如果任务创建者和工作者之间产生争议，无论是任务创建者对工作量证明不满意还是工作者认为报酬不合理，
              双方都可以在满足条件后发起纠纷。纠纷将由专门的纠纷解决合约处理，
              由管理员投票决定资金的最终分配方案，确保交易的公平性。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 w-full max-w-6xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">任务概览</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">总任务数</p>
            <p className="text-2xl font-bold">
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : `#${tasks.length}`}
            </p>
          </div>
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">平台费用</p>
            <p className="text-2xl font-bold">1%</p>
          </div>
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">任务类型</p>
            <p className="text-2xl font-bold">里程碑任务</p>
          </div>
        </div>
      </div>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateTask} />
    </div>
  );
};

export default MilestonePaymentTaskPage;
