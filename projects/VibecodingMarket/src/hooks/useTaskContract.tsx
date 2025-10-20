import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";
import { CONTRACT_ADDRESS, TASK_MARKET_ABI, SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_NAME } from "@/lib/contract";

export const useTaskContract = () => {
  const switchToSepolia = async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: SEPOLIA_CHAIN_NAME,
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add Sepolia network");
        }
      } else {
        throw switchError;
      }
    }
  };

  const createTask = async (
    title: string,
    description: string,
    tags: string[],
    urgency: number,
    budgetInETH: string
  ) => {
    try {
      // Switch to Sepolia
      await switchToSepolia();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // For MVP: Store task data on-chain or IPFS
      // Currently simplified: just escrow the ETH
      const tagsString = tags.join(",");
      const budgetWei = ethers.parseEther(budgetInETH);

      // Temporary: Send transaction directly without contract
      // In production, this should interact with deployed smart contract
      const tx = await signer.sendTransaction({
        to: CONTRACT_ADDRESS || signer.address, // Self-send for testing
        value: budgetWei,
        data: ethers.hexlify(
          ethers.toUtf8Bytes(
            JSON.stringify({ title, description, tags: tagsString, urgency })
          )
        ),
      });

      toast({
        title: "交易已发送",
        description: "等待区块链确认...",
      });

      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt?.hash,
      };
    } catch (error: any) {
      console.error("Create task error:", error);
      
      if (error.code === 4001) {
        toast({
          title: "交易已取消",
          description: "用户拒绝了交易",
          variant: "destructive",
        });
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        toast({
          title: "余额不足",
          description: "账户中没有足够的 ETH 来完成交易",
          variant: "destructive",
        });
      } else {
        toast({
          title: "交易失败",
          description: error.message || "发布任务时出错",
          variant: "destructive",
        });
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
  };

  return {
    createTask,
    switchToSepolia,
  };
};
