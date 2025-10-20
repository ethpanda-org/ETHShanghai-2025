import { create } from "zustand";
import { persist } from "zustand/middleware";

// 定义用户信息的接口
interface UserState {
    walletAddress: string | null; // 用户的钱包地址
    alias: string; // 用户名称
    avatar_url: string; // 用户头像
    address: string; // 用户钱包地址
    amount: number; // 用户余额
    profit: number; // 用户利润
    number: number; // 交易次数或其他信息
    avgAnnualized: number; // 年化收益率
    setWallet: (addr: string | null) => void; // 设置钱包地址
    setUserInfo: (userInfo: {
        avatar_url: string;
        address: string;
        alias: string;
        amount: number;
        profit: number;
        number: number;
        avgAnnualized: number;
    }) => void; // 设置用户信息
}

// 默认的用户信息
const defaultPersonal = {
    avatar_url: "https://app.termix.ai/_next/image?url=https%3A%2F%2Ftermixai.s3.ap-southeast-1.amazonaws.com%2Fmcp_icon%2Faster_mcp.svg&w=48&q=75&dpl=dpl_F9BT1ZQtfFTVMbREaz5fhXf13eu7",
    address: "0x....4252",
    alias: "user",
    amount: 0.1,
    profit: 0.001,
    number: 5,
    avgAnnualized: 5,
};

// 使用 Zustand 创建 store
export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            walletAddress: null,
            alias: defaultPersonal.alias,
            avatar_url: defaultPersonal.avatar_url,
            address: defaultPersonal.address,
            amount: defaultPersonal.amount,
            profit: defaultPersonal.profit,
            number: defaultPersonal.number,
            avgAnnualized: defaultPersonal.avgAnnualized,

            // 设置钱包地址
            setWallet: (addr) => set({ walletAddress: addr }),

            // 设置用户信息
            setUserInfo: (userInfo) => set({
                avatar_url: userInfo.avatar_url,
                address: userInfo.address,
                alias: userInfo.alias,
                amount: userInfo.amount,
                profit: userInfo.profit,
                number: userInfo.number,
                avgAnnualized: userInfo.avgAnnualized,
            }),
        }),
        {
            name: "user-storage", // 设置存储名称
        }
    )
);
