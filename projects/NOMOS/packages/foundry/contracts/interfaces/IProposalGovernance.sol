// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProposalGovernance {
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

    function createProposal(uint256 _projectId, uint256 _amount, uint256 _voteDurationDays, string memory _description)
        external;

    function voteOnProposal(uint256 _projectId, uint256 _proposalId, bool _support) external;

    function executeProposal(uint256 _projectId, uint256 _proposalId) external;
}
