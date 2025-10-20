// 0x75b6e6880859ec805ae8817423f593d9a9ca27c1
// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.0;

// 定义 IUserlessService 接口
interface IUserlessService {
    function echoString(string memory _input) external returns (string memory);
}

contract UserlessService is IUserlessService {
    function echoString(string memory _input) external pure override returns (string memory) {
        return _input;  // 返回传入的字符串
    }
}

contract Votecontract {
    uint public immutable quorum;  // 不可变参数
    uint public immutable endTime; // 不可变参数
    address public owner;
    IUserlessService public userlessService; // UserlessService 合约地址
    address[] public participants;
    mapping(address => bool) public hasParticipated;

    enum VoteOption { Support, Oppose, Abstain }
    mapping(address => VoteOption) public userVotes;
    mapping(VoteOption => uint) public voteCounts;

    event ParticipantJoined(address indexed participant, string ipfsHash);
    event VoteCast(address indexed voter, VoteOption indexed option);
    event QuorumMet();
    event IpfsEchoed(address indexed participant, string response);
    event UserlessServiceAddrSet(address indexed setter, address userlessServiceAddr);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor(uint _endTime, uint _quorum) {
        endTime = _endTime;
        quorum = _quorum;
        owner = msg.sender;
    }

    // 参与者加入登记
    function participate() external {
        require(!hasParticipated[msg.sender], 'Already participated');
        participants.push(msg.sender);
        hasParticipated[msg.sender] = true;
        emit ParticipantJoined(msg.sender,"");
    }

    // 记录两种用户投票总数并更新记录
    function castVote(VoteOption _option) external {
        require(hasParticipated[msg.sender], "Not participated yet");
        require(userVotes[msg.sender] == VoteOption(0), "Already voted");
        require(block.timestamp < endTime, "Voting time has ended");

        userVotes[msg.sender] = _option;
        voteCounts[_option] += 1;
        emit VoteCast(msg.sender, _option);
    }

    // 获取投票结果
    function getVoteResults() external view returns (uint, uint, uint) {
        return (
            voteCounts[VoteOption.Support],
            voteCounts[VoteOption.Oppose],
            voteCounts[VoteOption.Abstain]
        );
    }

    // 判断投票是否仍然有效
    function isVotingActive() public view returns (bool) {
        return block.timestamp < endTime;
    }

    // 获取支持率
    function getVoteSummary() external view returns (uint supportRate) {
        uint totalVotes = voteCounts[VoteOption.Support] + 
                        voteCounts[VoteOption.Oppose] + 
                        voteCounts[VoteOption.Abstain];
        return (totalVotes == 0) ? 0 : (voteCounts[VoteOption.Support] * 100) / totalVotes;
    }
}
