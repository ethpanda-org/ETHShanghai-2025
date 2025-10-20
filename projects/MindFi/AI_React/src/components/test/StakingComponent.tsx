import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi';
import { ethers } from 'ethers';
import {injected} from "wagmi/connectors";

// 合约地址和 ABI
const CONTRACT_ADDRESS = '0x832D4d77dC746fE0a223aE8E88DBdaa60b0234B1';
import contractJson from '../../abi/AggregatorVault.json'; // 你的 ABI 文件路径
const abi = contractJson.abi;

const StakingComponent: React.FC = () => {
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { address, isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const [amount, setAmount] = useState<string>('0.1');
    const [balance, setBalance] = useState<string>('0');
    const [error, setError] = useState<string>('');

    // 查询账户余额
    const { data: userBalance } = useReadContract({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: 'getUserBalance',
        args: [address],
        chainId: 11155111, // Sepolia 网络的链 ID
        query: { enabled: !!address },
    });

    useEffect(() => {
        if (userBalance) {
            setBalance(ethers.formatEther(userBalance));
        }
    }, [userBalance]);

    // 存款功能
    const handleDeposit = async () => {
        try {
            const tx = await writeContractAsync({
                abi,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'deposit',
                value: ethers.parseEther(amount), // 存款金额
                chainId: 11155111, // Sepolia 网络的链 ID
            });

            // 等待交易确认
            // await tx.wait();
            alert('Deposit successful!');
        } catch (err) {
            setError('Error during deposit: ' + err.message);
        }
    };

    // 提现功能
    const handleWithdraw = async () => {
        try {
            const tx = await writeContractAsync({
                abi,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'withdrawToWallet',
                args: [ethers.parseEther(amount)], // 提现金额
                chainId: 11155111, // Sepolia 网络的链 ID
            });

            // 等待交易确认
            // await tx.wait();
            alert('Withdrawal successful!');
        } catch (err) {
            setError('Error during withdrawal: ' + err.message);
        }
    };

    return (
        <div>
            <h2>💎 ETH 存款池（Sepolia 测试网）</h2>

    {!isConnected ? (
        <button onClick={() => connect({ connector: injected() })}>连接 MetaMask</button>
    ) : (
        <>
            <p>当前钱包：{address}</p>
    <button onClick={() => disconnect()}>断开连接</button>

    <div>
    <h3>账户余额: {balance} ETH</h3>
    </div>

    <div>
    <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="输入金额 (ETH)"
        />
        <button className="py-2 px-6 bg-purple-500 rounded-md text-white mx-4" onClick={handleDeposit}>存款</button>
        <button className="py-2 px-6 bg-purple-500 rounded-md text-white mx-4"  onClick={handleWithdraw}>提现</button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
        )}
        </div>
    );
    };

    export default StakingComponent;
