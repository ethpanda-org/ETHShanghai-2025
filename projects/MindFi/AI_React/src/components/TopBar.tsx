import abi from "@/abi/StakePass.json";
import { API } from "@/api";
import ChatModal from "@/components/ChatModal.tsx";
import { useChatStore } from "@/stores/chatStore";
import { useSystemStore } from "@/stores/systemStore.ts";
import {useStatusStore} from "@/stores/useStatusStore.ts";
import { hiddenMiddle } from "@/utils/addressUtils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {useNavigate} from "react-router-dom";
import type { Connector } from "wagmi";
import {
    useAccount,
    useConnect,
    useDisconnect,
    usePublicClient,
    useReadContract,
    useSwitchChain,
    useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { Modal } from "antd";

const CONTRACT = import.meta.env.VITE_CONTRACT as `0x${string}`;

export default function TopBar() {
    /** 钱包相关 */
    const { connectors, connectAsync, status } = useConnect();
    const { switchChainAsync } = useSwitchChain();
    const { disconnect } = useDisconnect();
    const { address, isConnected, chainId } = useAccount();
    const [open, setOpen] = useState(false);
    const [selecting, setSelecting] = useState<string | null>(null);
    const { clearAll } = useChatStore();
    const { language, toggleLanguage } = useSystemStore();
    const { t } = useTranslation();
    const { sessions,  switchSession} = useChatStore();

    /** Stake 相关 */
    const publicClient = usePublicClient();
    const { writeContractAsync, isPending: isStakePending } = useWriteContract();
    const { data: active, refetch } = useReadContract({
        abi,
        address: CONTRACT,
        functionName: "isActive",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
        query: { enabled: !!address, refetchInterval: 4000 },
    });
    const { statusInfo, setStatusInfo } = useStatusStore();
    const chainOk = !isConnected || chainId === sepolia.id;
    const navigate = useNavigate(); // 用于页面跳转

    useEffect(() => {
        if (!isConnected) {
            // 如果已连接，跳转到主页面
            navigate('/'); // 假设主页面路由是 '/main'
        }
    }, [isConnected, navigate]); // 依赖项是 isConnected 和 navigate

    async function refreshStatus() {
        if (!address) return;
        const res = await API.accessGetStatus(address);
        setStatusInfo(res.data);
    }

    async function doStake() {
        await API.stakeFixed(writeContractAsync, publicClient);
        refreshStatus();
        refetch();

    }

    async function doUnstake() {
        await API.unStakeFixed(writeContractAsync, publicClient);
        refreshStatus();
        refetch();

    }

    useEffect(() => {
        if (address) refreshStatus();
    }, [address]);

    /** 钱包连接 */
    const handlePick = async (connector: Connector) => {
        const key = (connector as any).uid ?? connector.id;
        try {
            setSelecting(key);
            const res = await connectAsync({ connector });
            if (res.chainId !== sepolia.id) {
                try {
                    await switchChainAsync({ chainId: sepolia.id });
                } catch {}
            }
            setOpen(false);
            switchSession(sessions[0].id);
        } catch (e) {
            console.error("connect error:", e);
        } finally {
            setSelecting(null);
        }
    };

    const onDisconnect = () => {
        Modal.confirm({
            title: `${t("sidebar.modalText.title")}`,
            content: `${t("sidebar.modalText.content")}`,
            okText: `${t("sidebar.modalText.ok")}`,
            cancelText: `${t("sidebar.modalText.cancel")}`,
            onOk: () => {
                // 删除会话
                disconnect();
                clearAll();
                switchSession(sessions[0].id);
            },
        });
    };

    return (
        <div className="px-6 py-3 flex justify-between items-center
                    bg-white border-b border-gray-200
                    dark:bg-gray-900 dark:border-gray-700">
            {/* 已连接 */}
            {isConnected ? (
                <>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Stake 状态 */}
                        <div className="flex items-center gap-4 text-sm">
              <span>
                {t("topBar.network")}:{" "}
                  <b className={chainOk ? "text-green-600" : "text-red-500"}>
                  {chainOk ? "Sepolia ✅" : `Wrong (${chainId})`}
                </b>
              </span>
                            <span>
                {t("topBar.status")}:{" "}
                                <b className={active ? "text-green-600" : "text-red-500"}>
                  {active ? "Active" : "Inactive"}
                </b>
              </span>
                            <span>
                {t("topBar.todayUse")}:{" "}
                                {statusInfo
                                    ? `${statusInfo.used ?? 0} / ${statusInfo.daily_limit ?? 0}`
                                    : `${t("topBar.refresh")}`}
              </span>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                            <button
                                onClick={doStake}
                                disabled={!isConnected || !chainOk || isStakePending}
                                className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm
                           hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {t("topBar.shake")}
                            </button>
                            <button
                                onClick={doUnstake}
                                disabled={!isConnected || !chainOk || isStakePending}
                                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm hover:bg-gray-300
                           dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                                {t("topBar.unShake")}
                            </button>
                            <button
                                onClick={refreshStatus}
                                className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-200
                           dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                {t("topBar.refresh")}
                            </button>
                        </div>
                    </div>

                    {/* 地址和语言切换 */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLanguage}
                            className="px-3 py-1 rounded-md bg-blue-100 text-blue-600 text-sm hover:bg-blue-200
                         dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                        >
                            {language === "zh" ? "中文" : "English"}
                        </button>
                        <span className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium
                             dark:bg-gray-700 dark:text-gray-200">
                          {hiddenMiddle(address as string)}
                        </span>
                        <button
                            onClick={onDisconnect}
                            className="px-3 py-1 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-200
                         dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                        >
                            {t("topBar.disconnect")}
                        </button>
                    </div>
                </>
            ) : (
                // 未连接
                <>
                    <div></div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLanguage}
                            className="px-3 py-1 rounded-md bg-blue-100 text-blue-600 text-sm hover:bg-blue-200
                         dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                        >
                            {language === "zh" ? "中文" : "English"}
                        </button>
                        <button
                            onClick={() => setOpen(true)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                        >
                            {(status as string) === "connecting"
                                ? `${t("topBar.connecting")}`
                                : `${t("topBar.connect")}`}
                        </button>
                        <ChatModal open={open} onClose={() => setOpen(false)}>
                            {connectors.map((c) => {
                                const key = (c as any).uid ?? c.id;
                                const connectingThis =
                                    selecting === key && (status as string) === "connecting";

                                return (
                                    <button
                                        key={key}
                                        onClick={() => handlePick(c as Connector)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-left cursor-pointer
                               dark:hover:bg-gray-800"
                                    >
                                        {c.icon && (
                                            <img
                                                src={c.icon}
                                                alt={c.name}
                                                className="w-6 h-6 rounded-full"
                                            />
                                        )}
                                        <span className="font-medium">
                      {c.name === "Injected" ? "默认钱包" : c.name}
                                            {connectingThis ? " · 连接中" : ""}
                    </span>
                                    </button>
                                );
                            })}
                        </ChatModal>
                    </div>
                </>
            )}
        </div>
    );
}
