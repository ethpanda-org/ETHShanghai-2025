// 0x5b0ae5f714ece588065c16184271a975e8353713
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoteResultsIPFS {
    uint public constant MIN_VOTES = 10; // 最低投票要求
    uint public totalVotes;
    bool public quorumReached;
    address public owner;

    // 记录用户的投票option
    mapping(address => uint) public agentVote;
    mapping(address => bool) public isAI;
    mapping(address => bool) public hasVoted; // 记录是否已投票

    // 事件
    event VoteSubmitted(address indexed user, uint option);
    event QuorumReached(uint totalVotes);
    event AIStatusUpdated(address indexed user, bool isAI);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // 存储用户投票
    function storeVote(address user, uint option) external {
        require(!quorumReached, "Voting has ended");
        require(!hasVoted[user], "User has already voted");

        agentVote[user] = option;
        hasVoted[user] = true;
        totalVotes += 1;

        emit VoteSubmitted(user, option);

        // 检查是否达到最低要求
        if (totalVotes >= MIN_VOTES && !quorumReached) {
            quorumReached = true;
            emit QuorumReached(totalVotes);
        }
    }

    // 存储AI代理的投票
    function storeAIVote(uint option, address user) external {
        require(!quorumReached, "Voting has ended");
        require(isAI[user], "User is not an AI agent");
        require(!hasVoted[user], "AI agent has already voted");

        agentVote[user] = option;
        hasVoted[user] = true;
        totalVotes += 1;

        emit VoteSubmitted(user, option);

        // 检查是否达到最低要求
        if (totalVotes >= MIN_VOTES && !quorumReached) {
            quorumReached = true;
            emit QuorumReached(totalVotes);
        }
    }

    // 设置AI代理身份（只能由管理员调用）
    function setAIStatus(address user, bool status) external onlyOwner {
        isAI[user] = status;
        emit AIStatusUpdated(user, status);
    }

    // 获取投票结果
    function getVoteResults(address user) external view returns (uint) {
        return agentVote[user];
    }

    // 获取总投票数
    function getTotalVotes() external view returns (uint) {
        return totalVotes;
    }

    // 获取投票是否结束
    function isVotingEnded() external view returns (bool) {
        return quorumReached;
    }

    // 更改合约所有者
    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    //存储提案的投票，传入CID
    function submitProposal(string memory title, string memory description) public {
     //直接传入提案的CID进行存储  
    }
}
