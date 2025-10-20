import { useEffect, useState } from "react";
import { useReadContract, useAccount, usePublicClient, useWriteContract } from "wagmi";
import { API } from "@/api";
import abi from "@/abi/StakePass.json";

const CONTRACT = import.meta.env.VITE_CONTRACT as `0x${string}`;

export default function StakePanel() {
    const { address, chainId, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const { writeContractAsync, isPending } = useWriteContract();

    const { data: active, refetch } = useReadContract({
        abi,
        address: CONTRACT,
        functionName: "isActive",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
        query: { enabled: !!address, refetchInterval: 4000 },
    });

    const [statusInfo, setStatusInfo] = useState<{ used?: number; daily_limit?: number } | null>(null);

    async function refreshStatus() {
        if (!address) return;
        const res = await API.accessGetStatus(address);
        setStatusInfo(res.data);
    }

    async function doStake() {
        await API.stakeFixed(writeContractAsync, publicClient);
        await refetch();
        await refreshStatus();
    }

    async function doUnstake() {
        await API.unStakeFixed(writeContractAsync, publicClient);
        await refetch();
        await refreshStatus();
    }

    useEffect(() => {
        if (address) refreshStatus();
    }, [address]);

    const chainOk = !isConnected || chainId === 11155111;

    return (
        <div className="p-4 flex flex-col gap-3 bg-gray-100">
            <div className="flex gap-4">
        <span>
          网络:{" "}
            <b className={chainOk ? "text-green-600" : "text-red-600"}>
            {chainOk ? "Sepolia ✅" : `Wrong (${chainId})`}
          </b>
        </span>
                <span>
          状态:{" "}
                    <b className={active ? "text-green-600" : "text-red-600"}>
            {active ? "Active" : "Inactive"}
          </b>
        </span>
            </div>

            <div className="flex gap-2 items-center">
                <button
                    onClick={doStake}
                    disabled={!isConnected || !chainOk || isPending}
                    className="px-2 py-1 bg-indigo-600 text-white rounded"
                >
                    Stake 0.01 ETH
                </button>
                <button
                    onClick={doUnstake}
                    disabled={!isConnected || !chainOk || isPending}
                    className="px-2 py-1 bg-gray-300 rounded"
                >
                    Unstake
                </button>
                <button onClick={refreshStatus} className="px-2 py-1 bg-gray-200 rounded">
                    刷新用量
                </button>
                <span className="text-sm text-gray-600">
          {statusInfo
              ? `今日已用：${statusInfo.used ?? 0} / ${statusInfo.daily_limit ?? 0}`
              : "（点击刷新以查看用量）"}
        </span>
            </div>
        </div>
    );
}
