// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
}

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(msg.sender);
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function renounceOwnership() public onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract VotingSystem is Ownable {
    enum VoteOption {
        Support,
        Against,
        Abstain
    }

    struct Proposal {
        string metadataHash;
        uint256 supportVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool privilegedOnly;
        bool exists;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    IERC20 public stakeToken;
    IERC721 public gateNft;
    uint256 public stakeRequirement;

    mapping(address => uint256) private _stakedBalances;

    uint256 private constant DISTRIBUTION_SCALE = 1e18;

    event ProposalCreated(uint256 indexed proposalId, string metadataHash, bool privilegedOnly);
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteOption option, bool privileged);
    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);
    event StakeRequirementUpdated(uint256 previousRequirement, uint256 newRequirement);
    event StakeTokenUpdated(address previousToken, address newToken);
    event GateNftUpdated(address previousNft, address newNft);

    constructor(uint256 initialStakeRequirement, address initialStakeToken, address initialGateNft) {
        stakeRequirement = initialStakeRequirement;
        stakeToken = IERC20(initialStakeToken);
        gateNft = IERC721(initialGateNft);
    }

    function createProposal(string calldata metadataHash, bool privilegedOnly)
        external
        onlyOwner
        returns (uint256 proposalId)
    {
        require(bytes(metadataHash).length != 0, "Voting: empty hash");
        proposalId = ++proposalCount;
        Proposal storage proposal = _proposals[proposalId];
        proposal.metadataHash = metadataHash;
        proposal.privilegedOnly = privilegedOnly;
        proposal.exists = true;

        emit ProposalCreated(proposalId, metadataHash, privilegedOnly);
    }

    function vote(uint256 proposalId, VoteOption option) external {
        Proposal storage proposal = _getProposalOrRevert(proposalId);
        require(!proposal.privilegedOnly, "Voting: privileged proposal");
        _recordVote(proposal, proposalId, option, msg.sender, false);
    }

    function privilegedVote(uint256 proposalId, VoteOption option) external {
        address voter = msg.sender;
        Proposal storage proposal = _getProposalOrRevert(proposalId);
        require(proposal.privilegedOnly, "Voting: public proposal");
        require(hasPrivilegedAccess(voter), "Voting: not privileged");
        _recordVote(proposal, proposalId, option, voter, true);
    }

    function stake(uint256 amount) external {
        require(address(stakeToken) != address(0), "Voting: stake token not set");
        require(amount > 0, "Voting: zero amount");
        require(stakeToken.transferFrom(msg.sender, address(this), amount), "Voting: transfer failed");
        _stakedBalances[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(address(stakeToken) != address(0), "Voting: stake token not set");
        require(amount > 0, "Voting: zero amount");
        uint256 userStaked = _stakedBalances[msg.sender];
        require(userStaked >= amount, "Voting: insufficient stake");
        _stakedBalances[msg.sender] = userStaked - amount;
        require(stakeToken.transfer(msg.sender, amount), "Voting: transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function hasPrivilegedAccess(address account) public view returns (bool) {
        bool meetsStakeRequirement = stakeRequirement > 0 && _stakedBalances[account] >= stakeRequirement;
        bool ownsGateNft = address(gateNft) != address(0) && gateNft.balanceOf(account) > 0;
        return meetsStakeRequirement || ownsGateNft;
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            string memory metadataHash,
            uint256 supportVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool privilegedOnly
        )
    {
        Proposal storage proposal = _getProposalOrRevert(proposalId);
        return (
            proposal.metadataHash,
            proposal.supportVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.privilegedOnly
        );
    }

    function getVoteDistribution(uint256 proposalId)
        external
        view
        returns (
            uint256 supportVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 supportRatioE18,
            uint256 againstRatioE18,
            uint256 abstainRatioE18
        )
    {
        Proposal storage proposal = _getProposalOrRevert(proposalId);
        supportVotes = proposal.supportVotes;
        againstVotes = proposal.againstVotes;
        abstainVotes = proposal.abstainVotes;

        uint256 totalVotes = supportVotes + againstVotes + abstainVotes;
        if (totalVotes == 0) {
            return (supportVotes, againstVotes, abstainVotes, 0, 0, 0);
        }

        supportRatioE18 = (supportVotes * DISTRIBUTION_SCALE) / totalVotes;
        againstRatioE18 = (againstVotes * DISTRIBUTION_SCALE) / totalVotes;
        abstainRatioE18 = (abstainVotes * DISTRIBUTION_SCALE) / totalVotes;
    }

    function stakedBalance(address account) external view returns (uint256) {
        return _stakedBalances[account];
    }

    function setStakeRequirement(uint256 newRequirement) external onlyOwner {
        uint256 previous = stakeRequirement;
        stakeRequirement = newRequirement;
        emit StakeRequirementUpdated(previous, newRequirement);
    }

    function setStakeToken(address newStakeToken) external onlyOwner {
        emit StakeTokenUpdated(address(stakeToken), newStakeToken);
        stakeToken = IERC20(newStakeToken);
    }

    function setGateNft(address newGateNft) external onlyOwner {
        emit GateNftUpdated(address(gateNft), newGateNft);
        gateNft = IERC721(newGateNft);
    }

    function _recordVote(Proposal storage proposal, uint256 proposalId, VoteOption option, address voter, bool privileged)
        private
    {
        require(!_hasVoted[proposalId][voter], "Voting: already voted");
        require(_isValidVoteOption(option), "Voting: invalid option");

        _hasVoted[proposalId][voter] = true;

        if (option == VoteOption.Support) {
            proposal.supportVotes += 1;
        } else if (option == VoteOption.Against) {
            proposal.againstVotes += 1;
        } else {
            proposal.abstainVotes += 1;
        }

        emit VoteCast(proposalId, voter, option, privileged);
    }

    function _getProposalOrRevert(uint256 proposalId) private view returns (Proposal storage) {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.exists, "Voting: proposal not found");
        return proposal;
    }

    function _isValidVoteOption(VoteOption option) private pure returns (bool) {
        return uint8(option) <= uint8(VoteOption.Abstain);
    }
}
