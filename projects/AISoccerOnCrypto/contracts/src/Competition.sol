// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IdentityRegistry.sol";
import "./ServerReputationRegistry.sol";
import "./IUniswapV2.sol";
import "./LaunchPad.sol";

interface IERC20Burnable {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title Competition
/// @notice Manages soccer robot competition invitations and matches
/// @dev Handles invitation creation, acceptance, match queue, and fee distribution
contract Competition is Ownable, ReentrancyGuard {
    IIdentityRegistry public immutable identityRegistry;
    IServerReputationRegistry public immutable serverReputationRegistry;
    ILaunchPad public immutable launchPad;
    IUniswapV2Router02 public immutable uniswapV2Router;

    uint256 public minMatchFee;  // Minimum fee required to create a match invitation
    address public platformTreasury;  // Address to receive platform fees
    uint256 public constant PLATFORM_PERCENTAGE = 10; // 10% to platform when match succeed
    uint256 public constant BUYBACK_PERCENTAGE = 20; // 20% of opponent share for buyback

    // Match states
    enum MatchState {
        Pending,      // Waiting for opponent to accept/reject
        Accepted,     // Accepted, in queue waiting for server
        InProgress,   // Match is being played
        Completed,    // Match finished
        Rejected,     // Invitation rejected
        Cancelled,    // Invitation cancelled by challenger
        Failed        // Match failed during execution
    }

    // Match invitation/competition struct
    struct Match {
        uint256 matchId;
        uint256 challengerAgentId;
        uint256 opponentAgentId;
        address challenger;
        address opponent;
        uint256 matchFee;
        MatchState state;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 startedAt;
        uint256 completedAt;
        address assignedServer;
    }

    // Storage
    uint256 private _matchIdCounter;
    mapping(uint256 => Match) public matches;
    
    // Queue for accepted matches waiting to be played
    uint256[] private _matchQueue;
    mapping(uint256 => uint256) private _matchQueueIndex; // matchId => index in queue
    mapping(uint256 => bool) private _inQueue;

    // Track last acceptance time for each agent to enforce cooldown
    mapping(uint256 => uint256) private _lastAcceptanceTime;
    uint256 public constant ACCEPTANCE_COOLDOWN = 1 hours;

    // Track matches by agent
    mapping(uint256 => uint256[]) private _agentMatches;

    // Track pending invitations for an agent (as opponent)
    mapping(uint256 => uint256[]) private _pendingInvitations;

    // Events
    event MatchInvitationCreated(
        uint256 indexed matchId,
        uint256 indexed challengerAgentId,
        uint256 indexed opponentAgentId,
        address challenger,
        address opponent,
        uint256 matchFee
    );

    event MatchInvitationAccepted(
        uint256 indexed matchId,
        uint256 indexed opponentAgentId,
        address opponent
    );

    event MatchInvitationRejected(
        uint256 indexed matchId,
        uint256 indexed opponentAgentId,
        address opponent
    );

    event MatchInvitationCancelled(
        uint256 indexed matchId,
        address challenger
    );

    event MatchStarted(
        uint256 indexed matchId,
        address indexed server
    );

    event MatchCompleted(
        uint256 indexed matchId,
        address indexed server
    );

    event MatchFailed(
        uint256 indexed matchId,
        address indexed server,
        uint256 refundAmount
    );

    event MinMatchFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformTreasuryUpdated(address oldTreasury, address newTreasury);
    event TokenBuybackAndBurn(
        uint256 indexed matchId,
        uint256 indexed agentId,
        address indexed tokenAddress,
        uint256 ethAmount,
        uint256 tokenAmount
    );

    /// @notice Constructor
    /// @param _identityRegistry Address of the IdentityRegistry contract
    /// @param _serverReputationRegistry Address of the ServerReputationRegistry contract
    /// @param _launchPad Address of the LaunchPad contract
    /// @param _uniswapV2Router Address of the Uniswap V2 Router
    /// @param _minMatchFee Minimum fee required to create a match invitation
    /// @param _platformTreasury Address to receive platform fees
    constructor(
        address _identityRegistry,
        address _serverReputationRegistry,
        address _launchPad,
        address _uniswapV2Router,
        uint256 _minMatchFee,
        address _platformTreasury
    ) Ownable(msg.sender) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_serverReputationRegistry != address(0), "Invalid server registry");
        require(_launchPad != address(0), "Invalid launch pad");
        require(_uniswapV2Router != address(0), "Invalid router");
        require(_platformTreasury != address(0), "Invalid treasury");

        identityRegistry = IIdentityRegistry(_identityRegistry);
        serverReputationRegistry = IServerReputationRegistry(_serverReputationRegistry);
        launchPad = ILaunchPad(_launchPad);
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
        minMatchFee = _minMatchFee;
        platformTreasury = _platformTreasury;
    }

    /// @notice Create a match invitation to another agent
    /// @param challengerAgentId The agent ID of the challenger
    /// @param opponentAgentId The agent ID of the opponent
    function createMatchInvitation(
        uint256 challengerAgentId,
        uint256 opponentAgentId
    ) external payable nonReentrant returns (uint256 matchId) {
        require(msg.value >= minMatchFee, "Fee below minimum");
        require(challengerAgentId != opponentAgentId, "Cannot challenge self");

        // Verify caller owns or is approved for challenger agent
        address challengerOwner = identityRegistry.ownerOf(challengerAgentId);
        require(
            msg.sender == challengerOwner ||
            identityRegistry.isApprovedForAll(challengerOwner, msg.sender) ||
            identityRegistry.getApproved(challengerAgentId) == msg.sender,
            "Not authorized for challenger agent"
        );

        // Verify opponent agent exists
        address opponentOwner = identityRegistry.ownerOf(opponentAgentId);
        require(opponentOwner != address(0), "Opponent agent does not exist");

        // Create match
        matchId = _matchIdCounter++;
        matches[matchId] = Match({
            matchId: matchId,
            challengerAgentId: challengerAgentId,
            opponentAgentId: opponentAgentId,
            challenger: challengerOwner,
            opponent: opponentOwner,
            matchFee: msg.value,
            state: MatchState.Pending,
            createdAt: block.timestamp,
            acceptedAt: 0,
            startedAt: 0,
            completedAt: 0,
            assignedServer: address(0)
        });

        // Track match for both agents
        _agentMatches[challengerAgentId].push(matchId);
        _agentMatches[opponentAgentId].push(matchId);

        // Track pending invitation
        _pendingInvitations[opponentAgentId].push(matchId);

        emit MatchInvitationCreated(
            matchId,
            challengerAgentId,
            opponentAgentId,
            challengerOwner,
            opponentOwner,
            msg.value
        );
    }

    /// @notice Accept a match invitation
    /// @param matchId The match ID to accept
    function acceptMatchInvitation(uint256 matchId) external nonReentrant {
        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.Pending, "Match not in pending state");

        // Verify caller owns or is approved for opponent agent
        address opponentOwner = identityRegistry.ownerOf(oneMatch.opponentAgentId);
        require(
            msg.sender == opponentOwner ||
            identityRegistry.isApprovedForAll(opponentOwner, msg.sender) ||
            identityRegistry.getApproved(oneMatch.opponentAgentId) == msg.sender,
            "Not authorized for opponent agent"
        );

        // Check cooldown period
        uint256 lastAcceptance = _lastAcceptanceTime[oneMatch.opponentAgentId];
        require(
            block.timestamp >= lastAcceptance + ACCEPTANCE_COOLDOWN,
            "Cooldown period not elapsed"
        );

        // Update match state
        oneMatch.state = MatchState.Accepted;
        oneMatch.acceptedAt = block.timestamp;

        // Update last acceptance time
        _lastAcceptanceTime[oneMatch.opponentAgentId] = block.timestamp;

        // Add to match queue
        _addToQueue(matchId);        

        // Remove from pending invitations
        _removePendingInvitation(oneMatch.opponentAgentId, matchId);

        emit MatchInvitationAccepted(matchId, oneMatch.opponentAgentId, opponentOwner);
    }

    /// @notice Reject a match invitation
    /// @param matchId The match ID to reject
    function rejectMatchInvitation(uint256 matchId) external nonReentrant {
        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.Pending, "Match not in pending state");

        // Verify caller owns or is approved for opponent agent
        address opponentOwner = identityRegistry.ownerOf(oneMatch.opponentAgentId);
        require(
            msg.sender == opponentOwner ||
            identityRegistry.isApprovedForAll(opponentOwner, msg.sender) ||
            identityRegistry.getApproved(oneMatch.opponentAgentId) == msg.sender,
            "Not authorized for opponent agent"
        );

        // Update match state
        oneMatch.state = MatchState.Rejected;

        // Refund the fee to challenger
        (bool success, ) = oneMatch.challenger.call{value: oneMatch.matchFee}("");
        require(success, "Refund failed");

        // Remove from pending invitations
        _removePendingInvitation(oneMatch.opponentAgentId, matchId);

        emit MatchInvitationRejected(matchId, oneMatch.opponentAgentId, opponentOwner);
    }

    /// @notice Cancel a match invitation (only by challenger before acceptance)
    /// @param matchId The match ID to cancel
    function cancelMatchInvitation(uint256 matchId) external nonReentrant {
        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.Pending, "Match not in pending state");

        // Verify caller is the challenger
        require(msg.sender == oneMatch.challenger, "Not the challenger");

        // Update match state
        oneMatch.state = MatchState.Cancelled;

        // Refund the fee
        (bool success, ) = oneMatch.challenger.call{value: oneMatch.matchFee}("");
        require(success, "Refund failed");

        // Remove from pending invitations
        _removePendingInvitation(oneMatch.opponentAgentId, matchId);

        emit MatchInvitationCancelled(matchId, oneMatch.challenger);
    }

    /// @notice Server starts a match from the queue
    /// @param matchId The match ID to start
    function startMatch(uint256 matchId) external {
        require(
            serverReputationRegistry.isAuthorizedServer(msg.sender),
            "Not an authorized server"
        );

        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.Accepted, "Match not in accepted state");
        require(_inQueue[matchId], "Match not in queue");

        // Update match state
        oneMatch.state = MatchState.InProgress;
        oneMatch.startedAt = block.timestamp;
        oneMatch.assignedServer = msg.sender;

        // Remove from queue
        _removeFromQueue(matchId);

        emit MatchStarted(matchId, msg.sender);
    }

    /// @notice Server completes a match
    /// @param matchId The match ID to complete
    function completeMatch(uint256 matchId) external {
        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.InProgress, "Match not in progress");
        require(oneMatch.assignedServer == msg.sender, "Not the assigned server");

        // Update match state
        oneMatch.state = MatchState.Completed;
        oneMatch.completedAt = block.timestamp;

        // Distribute fees with buyback
        _distributeFees(matchId, oneMatch.matchFee, oneMatch.opponent, oneMatch.opponentAgentId);

        emit MatchCompleted(matchId, msg.sender);
    }

    /// @notice Server marks a match as failed and refunds fees
    /// @param matchId The match ID to mark as failed
    function failMatch(uint256 matchId) external nonReentrant {
        Match storage oneMatch = matches[matchId];
        require(oneMatch.state == MatchState.InProgress, "Match not in progress");
        require(oneMatch.assignedServer == msg.sender, "Not the assigned server");

        // Update match state
        oneMatch.state = MatchState.Failed;
        oneMatch.completedAt = block.timestamp;

        // Platform keeps minimum fee, refund the rest to challenger
        uint256 refundAmount = 0;
        if (oneMatch.matchFee > minMatchFee) {
            refundAmount = oneMatch.matchFee - minMatchFee;
            
            // Transfer minimum fee to platform
            (bool success1, ) = platformTreasury.call{value: minMatchFee}("");
            require(success1, "Platform transfer failed");
            
            // Refund remaining to challenger
            (bool success2, ) = oneMatch.challenger.call{value: refundAmount}("");
            require(success2, "Refund failed");
        } else {
            // If matchFee <= minMatchFee, all goes to platform
            (bool success, ) = platformTreasury.call{value: oneMatch.matchFee}("");
            require(success, "Platform transfer failed");
        }

        emit MatchFailed(matchId, msg.sender, refundAmount);
    }

    /// @notice Get the match queue
    /// @return uint256[] Array of match IDs in the queue
    function getMatchQueue() external view returns (uint256[] memory) {
        return _matchQueue;
    }

    /// @notice Get the next match in queue
    /// @return hasMatch Whether there is a match in queue
    /// @return matchId The next match ID (only valid if hasMatch is true)
    function getNextMatch() external view returns (bool hasMatch, uint256 matchId) {
        if (_matchQueue.length > 0) {
            return (true, _matchQueue[0]);
        }
        return (false, 0);
    }

    /// @notice Get matches for an agent
    /// @param agentId The agent ID
    /// @return uint256[] Array of match IDs
    function getAgentMatches(uint256 agentId) external view returns (uint256[] memory) {
        return _agentMatches[agentId];
    }

    /// @notice Get pending invitations for an agent
    /// @param agentId The agent ID
    /// @return uint256[] Array of match IDs
    function getPendingInvitations(uint256 agentId) external view returns (uint256[] memory) {
        return _pendingInvitations[agentId];
    }

    /// @notice Get match details
    /// @param matchId The match ID
    /// @return match The match struct
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    /// @notice Get time until an agent can accept another match
    /// @param agentId The agent ID
    /// @return uint256 Seconds remaining (0 if can accept now)
    function getAcceptanceCooldownRemaining(uint256 agentId) external view returns (uint256) {
        uint256 lastAcceptance = _lastAcceptanceTime[agentId];
        uint256 cooldownEnd = lastAcceptance + ACCEPTANCE_COOLDOWN;
        
        if (block.timestamp >= cooldownEnd) {
            return 0;
        }
        return cooldownEnd - block.timestamp;
    }

    /// @notice Update minimum match fee (only owner)
    /// @param newMinFee The new minimum fee
    function setMinMatchFee(uint256 newMinFee) external onlyOwner {
        uint256 oldFee = minMatchFee;
        minMatchFee = newMinFee;
        emit MinMatchFeeUpdated(oldFee, newMinFee);
    }

    /// @notice Update platform treasury address (only owner)
    /// @param newTreasury The new treasury address
    function setPlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = platformTreasury;
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Internal function to distribute match fees
    /// @param totalFee The total fee to distribute
    /// @param opponentOwner The opponent owner address
    function _distributeFees(uint256 matchId, uint256 totalFee, address opponentOwner, uint256 opponentAgentId) internal {
        // Platform gets: minimum fee + 10% of remaining fee
        uint256 remainingFee = totalFee - minMatchFee;
        uint256 platformShare = minMatchFee + (remainingFee * PLATFORM_PERCENTAGE) / 100;
        uint256 opponentShare = totalFee - platformShare;

        (address tokenAddress, , , , , , bool isCompleted, ,) = launchPad.tokenLaunches(opponentAgentId);
        if (isCompleted) {
          // Buyback and burn tokens
          uint256 buybackAmount = (opponentShare * BUYBACK_PERCENTAGE) / 100;
          opponentShare = opponentShare - buybackAmount;
          uint256 burnAmount = _buybackAndBurnTokens(tokenAddress, buybackAmount);
          emit TokenBuybackAndBurn(matchId, opponentAgentId, tokenAddress, buybackAmount, burnAmount);
        }
        // Transfer platform share
        (bool success1, ) = platformTreasury.call{value: platformShare}("");
        require(success1, "Platform transfer failed");

        // Transfer opponent share
        (bool success2, ) = opponentOwner.call{value: opponentShare}("");
        require(success2, "Opponent transfer failed");
    }

    /// @notice Internal function to buyback tokens with ETH and burn them
    /// @param tokenAddress The token address to buyback
    /// @param ethAmount The amount of ETH to use for buyback
    /// @return tokensBurned The amount of tokens bought and burned
    function _buybackAndBurnTokens(
        address tokenAddress,
        uint256 ethAmount
    ) internal returns (uint256 tokensBurned) {
        if (ethAmount == 0 || tokenAddress == address(0)) {
            return 0;
        }

        // Dead address for burning tokens
        address DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

        // Create swap path: WETH -> Token
        address[] memory path = new address[](2);
        path[0] = uniswapV2Router.WETH();
        path[1] = tokenAddress;

        try uniswapV2Router.swapExactETHForTokens{value: ethAmount}(
            0, // amountOutMin = 0, accept any amount to prevent revert
            path,
            DEAD_ADDRESS, // Receive tokens to this contract first
            block.timestamp + 300 // 5 minutes deadline
        ) returns (uint256[] memory amounts) {
            // amounts[0] = ETH in, amounts[1] = tokens out
            tokensBurned = amounts[1];
        } catch {
            // If swap fails (e.g., no liquidity, pair doesn't exist)
            // Return 0 and the ETH remains in the contract
            return 0;
        }

        return tokensBurned;
    }

    /// @notice Internal function to add a match to the queue
    /// @param matchId The match ID to add
    function _addToQueue(uint256 matchId) internal {
        require(!_inQueue[matchId], "Already in queue");
        _matchQueue.push(matchId);
        _matchQueueIndex[matchId] = _matchQueue.length - 1;
        _inQueue[matchId] = true;
    }

    /// @notice Internal function to remove a match from the queue
    /// @param matchId The match ID to remove
    function _removeFromQueue(uint256 matchId) internal {
        require(_inQueue[matchId], "Not in queue");

        uint256 index = _matchQueueIndex[matchId];
        uint256 lastIndex = _matchQueue.length - 1;

        if (index != lastIndex) {
            uint256 lastMatchId = _matchQueue[lastIndex];
            _matchQueue[index] = lastMatchId;
            _matchQueueIndex[lastMatchId] = index;
        }

        _matchQueue.pop();
        delete _matchQueueIndex[matchId];
        _inQueue[matchId] = false;
    }

    /// @notice Internal function to remove a match from pending invitations
    /// @param agentId The agent ID
    /// @param matchId The match ID to remove
    function _removePendingInvitation(uint256 agentId, uint256 matchId) internal {
        uint256[] storage invitations = _pendingInvitations[agentId];
        
        for (uint256 i = 0; i < invitations.length; i++) {
            if (invitations[i] == matchId) {
                invitations[i] = invitations[invitations.length - 1];
                invitations.pop();
                break;
            }
        }
    }

    /// @notice Get total number of matches created
    /// @return uint256 Total match count
    function getTotalMatches() external view returns (uint256) {
        return _matchIdCounter;
    }

    /// @notice Get queue length
    /// @return uint256 Number of matches in queue
    function getQueueLength() external view returns (uint256) {
        return _matchQueue.length;
    }
}