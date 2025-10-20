"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function StakeManagementPage() {
  const { address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);

  const { writeContractAsync: stakeToBecomeAdmin } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: withdrawStake } = useScaffoldWriteContract({ contractName: "DisputeResolver" });
  const { writeContractAsync: approveTaskToken } = useScaffoldWriteContract({ contractName: "TaskToken" });

  // 获取DisputeResolver合约信息
  const { data: disputeResolver } = useDeployedContractInfo({ contractName: "DisputeResolver" });

  // 固定的管理员质押金额 (1000 TST)
  const ADMIN_STAKE_AMOUNT = 1000n * 10n ** 18n;

  // 获取 GraphQL SDK
  const sdk = getBuiltGraphSDK();

  const fetchAdminData = useCallback(async () => {
    try {
      // 获取管理员信息
      if (connectedAddress) {
        const adminResult = await sdk.GetAdminStakeInfo({
          id: connectedAddress.toLowerCase(),
        });
        setAdminData(adminResult?.admin || null);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  }, [connectedAddress, sdk]);

  // 获取管理员状态
  useEffect(() => {
    fetchAdminData();
  }, [connectedAddress, fetchAdminData]);

  const isAdmin = adminData?.isActive || false;
  const hasStake = adminData?.stakeAmount && BigInt(adminData.stakeAmount) > 0n;

  const handleStake = async () => {
    if (!disputeResolver?.address) {
      notification.error("无法获取纠纷解决合约地址");
      return;
    }

    try {
      setIsProcessing(true);

      // 先授权代币给DisputeResolver合约
      await approveTaskToken({
        functionName: "approve",
        args: [disputeResolver.address, ADMIN_STAKE_AMOUNT],
      });

      // 再进行质押
      await stakeToBecomeAdmin({
        functionName: "stakeToBecomeAdmin",
      });

      notification.success("质押成功，您已成为管理员");

      // 重新获取数据
      await fetchAdminData();
    } catch (error) {
      console.error("Error staking:", error);
      notification.error("质押失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setIsProcessing(true);

      await withdrawStake({
        functionName: "withdrawStake",
      });

      notification.success("质押金提取成功");

      // 重新获取数据
      await fetchAdminData();
    } catch (error) {
      console.error("Error withdrawing stake:", error);
      notification.error("提取质押金失败");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-10 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">管理员质押管理</h1>
          <div className="flex gap-2">
            {connectedAddress &&
              (!hasStake ? (
                <button
                  className={`btn btn-primary btn-sm ${isProcessing ? "loading" : ""}`}
                  onClick={handleStake}
                  disabled={isProcessing || !connectedAddress}
                >
                  质押 {(Number(ADMIN_STAKE_AMOUNT) / 1e18).toFixed(0)} TST
                </button>
              ) : (
                <button
                  className={`btn btn-error btn-sm ${isProcessing ? "loading" : ""}`}
                  onClick={handleWithdraw}
                  disabled={isProcessing || !connectedAddress || !hasStake}
                >
                  提取质押金
                </button>
              ))}
            <Link href="/dispute" className="btn btn-sm btn-outline">
              ← 返回纠纷中心
            </Link>
          </div>
        </div>

        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">您的质押状态</h2>

          {connectedAddress ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                <p className="font-bold">
                  {adminData?.stakeAmount ? (Number(adminData.stakeAmount) / 1e18).toFixed(2) : "0.00"} /
                  {(Number(ADMIN_STAKE_AMOUNT) / 1e18).toFixed(2)} TST
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">请连接钱包以查看质押信息</p>
            </div>
          )}
        </div>

        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 p-6">
          <h2 className="text-2xl font-bold mb-4">质押说明</h2>
          <div className="prose max-w-none">
            <ul>
              <li>成为管理员需要质押 {(Number(ADMIN_STAKE_AMOUNT) / 1e18).toFixed(0)} TST 代币</li>
              <li>质押后您将获得管理员资格，可以参与纠纷投票</li>
              <li>提取质押金需要先取消管理员资格（通过纠纷中心的&quot;取消管理员资格&quot;按钮）</li>
              <li>参与纠纷处理可获得处理奖励（根据贡献比例分配）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
