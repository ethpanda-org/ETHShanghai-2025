// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ICrowdfunding.sol";

contract ProposalGovernance is Ownable {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/
    struct Proposal {
        uint256 projectId;
        uint256 proposalId;
        string description; // 提案描述
        uint256 amount; // 请求拨款金额
        uint256 voteDeadline; // 投票截止时间戳
        bool executed; // 是否已执行
        bool passed; // 是否通过
        uint256 yesVotesAmount; // 支持金额总量
        uint256 noVotesAmount; // 反对金额总量
        mapping(address => bool) hasVoted; // 每个地址是否已投票
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // 每个项目下的提案列表
    mapping(uint256 => Proposal[]) public projectProposals;

    // 每个项目的提案失败次数计数器
    mapping(uint256 => uint256) public proposalFailureCount;

    // Crowdfunding 主合约地址
    address public crowdfundingAddress;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/
    event ProposalCreated(
        uint256 indexed projectId, uint256 indexed proposalId, string description, uint256 amount, uint256 voteDeadline
    );

    event Voted(
        uint256 indexed projectId, uint256 indexed proposalId, address indexed voter, bool support, uint256 amount
    );

    event ProposalExecuted(uint256 indexed projectId, uint256 indexed proposalId, bool passed);

    /*//////////////////////////////////////////////////////////////
                             MAIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    constructor(address _crowdfundingAddress) Ownable(_crowdfundingAddress) {
        crowdfundingAddress = _crowdfundingAddress;
    }

    /**
     * @dev 创建提案，只有项目发起人才能创建，且在同一时间段内只能创建一个提案
     * 申请的金额不能超过项目剩余金额
     * @param _projectId 项目ID
     * @param _amount 请求拨款金额
     * @param _voteDurationDays 投票持续时间（天）
     * @param _description 提案描述
     */
    function createProposal(uint256 _projectId, uint256 _amount, uint256 _voteDurationDays, string memory _description)
        external
    {
        require(
            projectProposals[_projectId].length == 0
                || projectProposals[_projectId][projectProposals[_projectId].length - 1].executed,
            "Previous proposal not executed"
        );
        require(_voteDurationDays > 0 && _voteDurationDays <= 7, "Vote duration must be 1-7 days");

        // 解构获取项目信息
        (, address payable creator,,,,,, uint256 currentDeposits, uint256 allowence,,, bool isSuccessful) =
            ICrowdfunding(crowdfundingAddress).projects(_projectId);
        require(msg.sender == creator, "Only project creator can create proposal");
        require(isSuccessful, "Project is not successful");
        require(currentDeposits - allowence >= _amount, "Requested amount exceeds available funds");

        uint256 deadline = block.timestamp + (_voteDurationDays * 1 days); // 1 day = 86400 seconds

        // 创建新提案的正确方式
        uint256 newProposalId = projectProposals[_projectId].length;
        projectProposals[_projectId].push(); // 添加空结构体
        Proposal storage newProposal = projectProposals[_projectId][newProposalId];

        // 初始化结构体字段
        newProposal.projectId = _projectId;
        newProposal.proposalId = newProposalId;
        newProposal.description = _description;
        newProposal.amount = _amount;
        newProposal.voteDeadline = deadline;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.yesVotesAmount = 0;
        newProposal.noVotesAmount = 0;

        emit ProposalCreated(_projectId, newProposal.proposalId, _description, _amount, deadline);
    }

    /**
     * @dev 投票，只有捐赠者才能投票，且不能重复投票，如果在投票截止日期之后没有投票视为弃权。
     * @param _projectId 项目ID
     * @param _proposalId 提案ID
     * @param _support 支持还是反对
     */
    function voteOnProposal(uint256 _projectId, uint256 _proposalId, bool _support) external {
        Proposal storage proposal = projectProposals[_projectId][_proposalId];
        require(block.timestamp <= proposal.voteDeadline, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        // 检查用户是否为项目参与者
        require(
            ICrowdfunding(crowdfundingAddress).checkIsParticipant(msg.sender, _projectId), "Not a project participant"
        );

        // 获取参与者的押金金额作为投票权重
        uint256 votingWeight = ICrowdfunding(crowdfundingAddress).getParticipantDeposit(msg.sender, _projectId);
        require(votingWeight > 0, "No deposit balance to vote");

        if (_support) {
            proposal.yesVotesAmount += votingWeight;
        } else {
            proposal.noVotesAmount += votingWeight;
        }

        proposal.hasVoted[msg.sender] = true;

        emit Voted(_projectId, _proposalId, msg.sender, _support, votingWeight);
    }

    /**
     * @dev 执行提案，任何人都可以执行，且必须在投票截止日期之后才能执行。
     * 支持票占总投票比例超过60%的提案才能通过，提案连续失败三次之后该项目失败，捐赠者可以将剩余金额取回。
     * @param _projectId 项目ID
     * @param _proposalId 提案ID
     */
    function executeProposal(uint256 _projectId, uint256 _proposalId) external {
        Proposal storage proposal = projectProposals[_projectId][_proposalId];
        require(block.timestamp > proposal.voteDeadline, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");

        uint256 totalVotes = proposal.yesVotesAmount + proposal.noVotesAmount;

        if (totalVotes > 0 && (proposal.yesVotesAmount * 100) / totalVotes >= 60) {
            // 成功
            proposal.passed = true;
            ICrowdfunding(crowdfundingAddress).increaseAllowence(_projectId, proposal.amount);
            proposalFailureCount[_projectId] = 0; // 重置失败计数
        } else {
            // 失败
            proposalFailureCount[_projectId] += 1;

            if (proposalFailureCount[_projectId] >= 3) {
                ICrowdfunding(crowdfundingAddress).setProjectFailed(_projectId);
            }
        }

        proposal.executed = true;

        emit ProposalExecuted(_projectId, _proposalId, proposal.passed);
    }
}
