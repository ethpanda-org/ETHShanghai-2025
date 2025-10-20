import React, { useState, useEffect } from "react";
import {
    WagmiProvider,
    createConfig,
    http,
    useAccount,
    useConnect,
    useDisconnect,
    useReadContract,
    useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { ethers } from "ethers";
import contractJson from "../abi/TieredETHStaking.json";
const abi = contractJson.abi;
// 🟢 你的合约地址
const CONTRACT_ADDRESS = "0x0f9C2eA4c8c2468f8cA872a69325932D27b03CC8";

// 🧩 配置 wagmi
export const config = createConfig({
    chains: [sepolia],
    transports: {
        [sepolia.id]: http(),
    },
    connectors: [injected()],
});

export default function StakingWagmi() {
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { address, isConnected } = useAccount();

    const [amount, setAmount] = useState<string>("0.1");
    const [summary, setSummary] = useState({
        principal: "0",
        accRewards: "0",
        pending: "0",
        total: "0",
    });

    // 🧾 读取账户信息
    const { data, refetch } = useReadContract({
        abi,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "getAccountSummary",
        args: [address],
        chainId: sepolia.id,
        query: { enabled: !!address },
    });

    // ✍️ 写操作
    const { writeContractAsync } = useWriteContract();

    useEffect(() => {
        if (data) {
            const [p, a, pend, t] = data as bigint[];
            setSummary({
                principal: ethers.formatEther(p),
                accRewards: ethers.formatEther(a),
                pending: ethers.formatEther(pend),
                total: ethers.formatEther(t),
            });
        }
    }, [data]);

    // 💰 质押
    const handleDeposit = async () => {
        await writeContractAsync({
            abi,
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: "deposit",
            value: ethers.parseEther(amount),
            chainId: sepolia.id,
        });
        refetch();
    };

    // 💸 提取本金
    const handleWithdraw = async () => {
        await writeContractAsync({
            abi,
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: "withdraw",
            args: [ethers.parseEther(amount)],
            chainId: sepolia.id,
        });
        refetch();
    };

    // 🎁 领取奖励
    const handleClaim = async () => {
        await writeContractAsync({
            abi,
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: "claim",
            chainId: sepolia.id,
        });
        refetch();
    };

    // 🚪 一键退出
    const handleExit = async () => {
        await writeContractAsync({
            abi,
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: "exit",
            chainId: sepolia.id,
        });
        refetch();
    };

    return (
        <div style={styles.container}>
            <h2>💎 ETH 质押系统（Sepolia 测试网）</h2>

            {!isConnected ? (
                <button style={styles.button} onClick={() => connect({ connector: injected() })}>
                    连接 MetaMask
                </button>
            ) : (
                <>
                    <p>当前钱包：{address}</p>
                    <button style={styles.disconnect} onClick={() => disconnect()}>
                        断开连接
                    </button>

                    <div style={styles.card}>
                        <h3>账户信息</h3>
                        <p>本金：{summary.principal} ETH</p>
                        <p>已结算奖励：{summary.accRewards} ETH</p>
                        <p>未结算奖励：{summary.pending} ETH</p>
                        <p>总资产：{summary.total} ETH</p>
                    </div>

                    <div style={styles.actions}>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={styles.input}
                            placeholder="输入金额 (ETH)"
                        />
                        <button style={styles.button} onClick={handleDeposit}>
                            质押
                        </button>
                        <button style={styles.button} onClick={handleWithdraw}>
                            提取
                        </button>
                        <button style={styles.button} onClick={handleClaim}>
                            领取奖励
                        </button>
                        <button style={styles.button} onClick={()=>refetch()}>
                            刷新
                        </button>
                        <button style={styles.exit} onClick={handleExit}>
                            全部退出
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// 样式
const styles: Record<string, React.CSSProperties> = {
    container: {
        width: "420px",
        margin: "40px auto",
        padding: "20px",
        border: "2px solid #4c6ef5",
        borderRadius: "12px",
        backgroundColor: "#f9f9fb",
        textAlign: "center",
    },
    button: {
        padding: "10px",
        borderRadius: "6px",
        border: "none",
        backgroundColor: "#4c6ef5",
        color: "#fff",
        cursor: "pointer",
    },
    disconnect: {
        padding: "6px 12px",
        border: "none",
        borderRadius: "6px",
        backgroundColor: "#adb5bd",
        color: "#fff",
        cursor: "pointer",
    },
    exit: {
        padding: "10px",
        borderRadius: "6px",
        border: "none",
        backgroundColor: "#d6336c",
        color: "#fff",
        cursor: "pointer",
    },
    input: {
        padding: "8px",
        margin: "8px 0",
        borderRadius: "6px",
        border: "1px solid #ccc",
        width: "90%",
    },
    card: {
        background: "#fff",
        borderRadius: "8px",
        padding: "15px",
        margin: "20px 0",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    },
    actions: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
};

// export default function StakingWrapper() {
//     return (
//         <WagmiProvider config={config}>
//             <StakingWagmi />
//         </WagmiProvider>
//     );
// }
