// CA: 0xa23640ad42f1cd50f165e8d62c3fcc670840ec20
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
    mapping(address => string) public participantIpfs;

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

    // 参与者加入
    function participate(string memory _ipfsHash) external {
        require(!hasParticipated[msg.sender], 'Already participated');
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        participants.push(msg.sender);
        hasParticipated[msg.sender] = true;
        participantIpfs[msg.sender] = _ipfsHash;
        emit ParticipantJoined(msg.sender, _ipfsHash);

        if (participants.length >= quorum) {
            emit QuorumMet();
        }
    }

    // 投票
    function castVote(VoteOption _option) external {
        require(hasParticipated[msg.sender], "Not participated yet");
        require(userVotes[msg.sender] == VoteOption(0), "Already voted");
        require(block.timestamp < endTime, "Voting time has ended");

        userVotes[msg.sender] = _option;
        voteCounts[_option] += 1;
        emit VoteCast(msg.sender, _option);
    }

    // 获取投票结果和 IPFS 哈希
    function getVoteResultsWithIpfs() external view returns (
        uint, 
        uint, 
        uint, 
        address[] memory, 
        string[] memory
    ) {  
        address[] memory addresses = new address[](participants.length);
        string[] memory hashes = new string[](participants.length);
        
        for (uint i = 0; i < participants.length; i++) {
            addresses[i] = participants[i];
            hashes[i] = participantIpfs[participants[i]];
        }
        
        return (  
            voteCounts[VoteOption.Support],  
            voteCounts[VoteOption.Oppose],  
            voteCounts[VoteOption.Abstain],
            addresses,
            hashes
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

    // 设置 UserlessService 合约地址
    function setUserlessServiceAddr(address _userlessServiceAddr) external onlyOwner {
        userlessService = IUserlessService(_userlessServiceAddr);
        emit UserlessServiceAddrSet(msg.sender, _userlessServiceAddr);
    }

    // 调用 UserlessService 合约返回 IPFS 内容
    function sendIpfsToUserless() external onlyOwner { 
        require(address(userlessService) != address(0), "UserlessService not set");
        
        for (uint i = 0; i < participants.length; i++) {
            address participant = participants[i];
            string memory ipfs = participantIpfs[participant];
            require(bytes(ipfs).length > 0, "Participant has no IPFS hash");
            
            string memory response = userlessService.echoString(ipfs);
            emit IpfsEchoed(participant, response);
        }
    }
}