import { parseEther } from "viem";
import abi from "@/abi/StakePass.json";

const CONTRACT = import.meta.env.VITE_CONTRACT as `0x${string}`;
const FIXED_ETH = "0.01";

/**
 * 质押 0.01 ETH
 */
async function stakeFixed(writeContractAsync: any, publicClient: any) {
    const hash = await writeContractAsync({
        abi,
        address: CONTRACT,
        functionName: "stake",
        value: parseEther(FIXED_ETH),
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return { hash, success: true };
}

/**
 * 赎回 0.01 ETH
 */
async function unStakeFixed(writeContractAsync: any, publicClient: any) {
    const hash = await writeContractAsync({
        abi,
        address: CONTRACT,
        functionName: "unstake",
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return { hash, success: true };
}

export default {
    stakeFixed,
    unStakeFixed,
};
