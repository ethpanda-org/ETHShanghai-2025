"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";

/**
 * 管理员信息面板组件
 */
export const AdminPanel = () => {
  const { address: connectedAddress } = useAccount();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 获取管理员状态
  useEffect(() => {
    // 将sdk的创建移到useEffect内部，避免因对象引用变化导致的无限循环
    const sdk = getBuiltGraphSDK();

    const fetchAdminData = async () => {
      if (!connectedAddress) return;

      try {
        setLoading(true);
        const result = await sdk.GetAdmin({
          id: connectedAddress.toLowerCase(),
        });

        setAdmin(result?.admin || null);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [connectedAddress]); // 移除sdk依赖项，因为sdk在每次渲染时都是新对象

  const isAdmin = admin?.isActive || false;
  const hasStake = admin?.stakeAmount && BigInt(admin.stakeAmount) > 0n;

  if (loading) {
    return (
      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">管理员信息</h2>
        <div className="text-center py-4">
          <span className="loading loading-spinner loading-sm"></span>
          <p className="mt-2">正在加载管理员信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">管理员信息</h2>

      {connectedAddress ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">您的地址</p>
            <Address address={connectedAddress} />
          </div>
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">管理员状态</p>
            <p className={`font-bold ${isAdmin ? "text-green-500" : "text-red-500"}`}>
              {isAdmin ? "已激活" : hasStake ? "已质押(未激活)" : "未质押"}
            </p>
          </div>
          <div className="bg-base-200 p-4 rounded-xl">
            <p className="text-sm text-gray-500">质押金额</p>
            <p className="font-bold">{admin?.stakeAmount ? (Number(admin.stakeAmount) / 1e18).toFixed(2) : "0"} TST</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500">请连接钱包以查看管理员信息</p>
        </div>
      )}
    </div>
  );
};
