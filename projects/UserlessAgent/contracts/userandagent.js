const voteContract = new ethers.Contract(voteContractAddress, voteABI, provider);

// 解析 IPFS 数据，获取用户投票信息
async function fetchUserVote(userAddress) {
    try {
        const ipfsHash = await voteContract.getUserVoteIpfs(userAddress);
        console.log("User's Vote IPFS Hash:", ipfsHash);
        return ipfsHash;
    } catch (error) {
        console.error(`获取用户 ${userAddress} 的投票数据失败:`, error);
        return null;
    }
}

// 用户阅读 IPFS 数据
async function readIpfsData(ipfsHash) {
    try {
        const url = `https://ipfs.io/ipfs/${ipfsHash}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log("Parsed IPFS Data:", data);
        return data;
    } catch (error) {
        console.error(`读取 IPFS 数据失败:`, error);
        return null;
    }
}

// 查询用户是否选择 AI 代理
async function selectAI(userAddress) {
    try {
        const isAI = await voteContract.isAI(userAddress);
        console.log("User's AI Status:", isAI);
        return isAI;
    } catch (error) {
        console.error(`查询 AI 代理状态失败:`, error);
        return null;
    }
}

// 处理 AI 代理投票逻辑
async function handleAIAgentApproval(approved, option) {
    if (!approved) {
        console.log("用户未选择 AI 代理，跳过存储。");
        return;
    }

    try {
        const signer = provider.getSigner(); // 获取当前签名者
        const userlessAgent = new ethers.Contract(USERLESS_AGENT_ADDRESS, UserlessAgentABI, signer);
        
        // 调用合约函数存储 AI 代理的投票
        const tx = await userlessAgent.storeAIVote(option);
        await tx.wait();
        console.log(`AI 代理投票成功: 选项 ${option}`);

        // 监听最低投票要求是否达成（避免重复监听）
        userlessAgent.once("QuorumReached", async (totalVotes) => {
            console.log(`达到最低投票要求: ${totalVotes}`);
            await calculateResults();
        });
    } catch (error) {
        console.error("存储 AI 代理投票结果时出错:", error);
    }
}

// 计算投票结果（确保已达到 quorum）
async function calculateResults() {
    try {
        const results = await voteContract.getVoteResultsWithIpfs();
        console.log("最终投票结果:", results);
        return results;
    } catch (error) {
        console.error("计算投票结果失败:", error);
        return null;
    }
}
