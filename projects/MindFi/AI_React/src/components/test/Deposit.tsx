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

// 你的合约地址和 ABI
const CONTRACT_ADDRESS = "0x76E0d67954c3DC3D6C331aC0CC10759fdA4De96d";
import contractJson from "../../abi/DepositPool.json"; // 替换为你合约的 ABI 路径
const abi = contractJson.abi;

// 配置 wagmi
export const config = createConfig({
    chains: [sepolia],
    transports: {
        [sepolia.id]: http(),
    },
    connectors: [injected()],
});

export default function DepositPoolComponent() {
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { address, isConnected } = useAccount();

    const [amount, setAmount] = useState<string>("0.1");
    const [depositBalance, setDepositBalance] = useState<string>("0");
    const [contractBalance, setContractBalance] = useState<string>("0");
    const [error, setError] = useState<string>('');



    // 读取合约池余额
    const { data: contractData, refetch: refetchContract } = useReadContract({
        abi,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "getContractBalance",
        chainId: sepolia.id,
        query: { enabled: !!address },
    });

    // 读取账户存款信息
    const { data: depositData, refetch: refetchDeposit } = useReadContract({
        abi,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "getDepositBalance",
        args: [address],
        chainId: sepolia.id,
        query: { enabled: !!address },
    });
    // 写操作 - 存款
    const { writeContractAsync } = useWriteContract();

    useEffect(() => {
        if (depositData) {
            console.log(depositData)
            setDepositBalance(ethers.formatEther(depositData));
        }
        if (contractData) {
            console.log(contractData);
            setContractBalance(ethers.formatEther(contractData));
        }
    }, [depositData, contractData]);

    // 💰 质押
    const handleDeposit = async () => {
        try {
            await writeContractAsync({
                abi,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: "deposit",
                value: ethers.parseEther(amount), // 存款金额
                chainId: sepolia.id,
            });

            // await tx.wait(); // 等待交易确认
            refetchDeposit(); // 刷新账户信息
            refetchContract(); // 刷新合约余额
        } catch (err) {
            setError("Error during deposit: " + err.message);
        }
    };

    // 💸 提取
    const handleWithdraw = async () => {
        try {
            const tx = await writeContractAsync({
                abi,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: "withdraw",
                args: [ethers.parseEther(amount)], // 提取的金额
                chainId: sepolia.id,
            });
            await tx.wait(); // 等待交易确认
            refetchDeposit(); // 刷新账户信息
            refetchContract(); // 刷新合约余额
        } catch (err) {
            setError("Error during withdraw: " + err.message);
        }
    };

    return (
        <div style={styles.container}>
            <h2>💎 ETH 存款池（Sepolia 测试网）</h2>

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
                        <p>存款余额：{depositBalance} ETH</p>
                        <p>合约池余额：{contractBalance} ETH</p>
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
                            存款
                        </button>
                        <button style={styles.button} onClick={handleWithdraw}>
                            提取
                        </button>
                    </div>

                    {error && <p style={{ color: "red" }}>{error}</p>}
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

// 记得在最外层包裹 <WagmiProvider> 来提供 wagmi 配置
// export default function DepositWrapper() {
//     return (
//         <WagmiProvider config={config}>
//             <DepositPoolComponent />
//         </WagmiProvider>
//     );
// }
