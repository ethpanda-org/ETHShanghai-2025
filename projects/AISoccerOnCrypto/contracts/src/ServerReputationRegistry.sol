// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReputationRegistry.sol";

/// @title ServerReputationRegistry
/// @notice Allows authorized game servers to submit match results as feedback on-chain
/// @dev Inherits from ReputationRegistry and adds server authorization management
contract ServerReputationRegistry is ReputationRegistry {
    // Authorized game server addresses
    mapping(address => bool) private _authorizedServers;
    address[] private _serverList;

    // Track server submissions
    struct ServerFeedback {
        uint256 agentId;
        uint256 opponentAgentId;
        uint8 result;           // 0: loss, 1: draw, 2: win
        uint128 selfScore;      // Agent's score
        uint128 opponentScore;  // Opponent's score
        string matchLogUri;
        bytes32 matchLogHash;
        uint256 timestamp;
    }

    // agentId => array of server feedback
    mapping(uint256 => ServerFeedback[]) private _agentMatches;

    // Events
    event ServerRegistered(address indexed serverAddress);
    event ServerUnregistered(address indexed serverAddress);
    event MatchResultSubmitted(
        uint256 indexed agentId,
        uint256 indexed opponentAgentId,
        address indexed serverAddress,
        uint8 result,
        uint128 selfScore,
        uint128 opponentScore,
        string matchLogUri
    );

    /// @notice Constructor
    /// @param _identityRegistry Address of the IdentityRegistry contract
    constructor(address _identityRegistry) ReputationRegistry(_identityRegistry) {}

    /// @notice Register an authorized game server
    /// @param serverAddress The address of the server to authorize
    function registerServer(address serverAddress) external onlyOwner {
        require(serverAddress != address(0), "Invalid server address");
        require(!_authorizedServers[serverAddress], "Server already registered");

        _authorizedServers[serverAddress] = true;
        _serverList.push(serverAddress);

        emit ServerRegistered(serverAddress);
    }

    /// @notice Unregister an authorized game server
    /// @param serverAddress The address of the server to remove
    function unregisterServer(address serverAddress) external onlyOwner {
        require(_authorizedServers[serverAddress], "Server not registered");

        _authorizedServers[serverAddress] = false;

        // Remove from list
        for (uint256 i = 0; i < _serverList.length; i++) {
            if (_serverList[i] == serverAddress) {
                _serverList[i] = _serverList[_serverList.length - 1];
                _serverList.pop();
                break;
            }
        }

        emit ServerUnregistered(serverAddress);
    }

    /// @notice Check if an address is an authorized server
    /// @param serverAddress The address to check
    /// @return bool True if the address is an authorized server
    function isAuthorizedServer(address serverAddress) external view returns (bool) {
        return _authorizedServers[serverAddress];
    }

    /// @notice Get all authorized server addresses
    /// @return address[] Array of authorized server addresses
    function getAuthorizedServers() external view returns (address[] memory) {
        // Filter out unregistered servers
        uint256 count = 0;
        for (uint256 i = 0; i < _serverList.length; i++) {
            if (_authorizedServers[_serverList[i]]) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _serverList.length; i++) {
            if (_authorizedServers[_serverList[i]]) {
                result[index++] = _serverList[i];
            }
        }

        return result;
    }

    /// @notice Submit a match result (only authorized servers)
    /// @param agentId The agent that played the match
    /// @param opponentAgentId The opponent agent ID
    /// @param result Match result: 0=loss, 1=draw, 2=win
    /// @param selfScore Agent's score in the match
    /// @param opponentScore Opponent's score in the match
    /// @param matchLogUri URI to the match log/replay
    /// @param matchLogHash Hash of the match log for verification
    function submitMatchResult(
        uint256 agentId,
        uint256 opponentAgentId,
        uint8 result,
        uint128 selfScore,
        uint128 opponentScore,
        string calldata matchLogUri,
        bytes32 matchLogHash
    ) external {
        require(_authorizedServers[msg.sender], "Not an authorized server");
        require(result <= 2, "Invalid result: must be 0, 1, or 2");
        require(agentId != opponentAgentId, "Cannot play against self");

        // Verify agents exist
        require(_agentExists(agentId), "Agent does not exist");
        require(_agentExists(opponentAgentId), "Opponent does not exist");

        // Encode tag1 as opponent agentId
        bytes32 tag1 = bytes32(opponentAgentId);

        // Encode tag2 as score: first 16 bytes = selfScore, last 16 bytes = opponentScore
        bytes32 tag2 = bytes32(uint256(selfScore) << 128 | uint256(opponentScore));

        // Store the match result locally
        _agentMatches[agentId].push(ServerFeedback({
            agentId: agentId,
            opponentAgentId: opponentAgentId,
            result: result,
            selfScore: selfScore,
            opponentScore: opponentScore,
            matchLogUri: matchLogUri,
            matchLogHash: matchLogHash,
            timestamp: block.timestamp
        }));

        // Submit to parent ReputationRegistry as feedback from the server
        // Note: We use appendResponse to record server's match submission
        // The clientAddress will be the server address
        // First, we need to check if there's existing feedback or create a placeholder
        uint64 lastIndex = getLastIndex(agentId, msg.sender);
        
        if (lastIndex == 0) {
            // First match from this server for this agent
            // We need to call the parent's giveFeedback, but it requires feedbackAuth
            // Since servers are pre-authorized, we create a bypass
            _submitServerFeedback(agentId, result, tag1, tag2, matchLogUri, matchLogHash);
        } else {
            // Append as a response to track additional matches
            appendResponse(agentId, msg.sender, lastIndex, matchLogUri, matchLogHash);
        }

        emit MatchResultSubmitted(
            agentId,
            opponentAgentId,
            msg.sender,
            result,
            selfScore,
            opponentScore,
            matchLogUri
        );
    }

    /// @notice Internal function to submit server feedback without signature verification
    /// @dev This bypasses the normal feedbackAuth requirement since servers are pre-authorized
    function _submitServerFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash
    ) internal {
        // We need to directly interact with parent contract's storage
        // Since we can't easily bypass parent's giveFeedback requirement,
        // we'll need to generate a valid feedbackAuth or use a different approach
        
        // Alternative: Create a specialized mapping for server feedback
        // This is already done via _agentMatches
        // The parent's functions can still be used for general reputation

        giveFeedback(agentId, score, tag1, tag2, feedbackUri, feedbackHash);
    }


    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash
    ) internal {
        require(score <= 100, "score>100");

        // Verify agent exists
        require(_agentExists(agentId), "Agent does not exist");

        // Get agent owner
        IIdentityRegistry registry = IIdentityRegistry(identityRegistry);
        address agentOwner = registry.ownerOf(agentId);

        // SECURITY: Prevent self-feedback from owner and operators
        require(
            msg.sender != agentOwner &&
            !registry.isApprovedForAll(agentOwner, msg.sender) &&
            registry.getApproved(agentId) != msg.sender,
            "Self-feedback not allowed"
        );

        // Get current index for this client-agent pair (1-indexed)
        uint64 currentIndex = _lastIndex[agentId][msg.sender] + 1;

        // Store feedback at 1-indexed position
        _feedback[agentId][msg.sender][currentIndex] = Feedback({
            score: score,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        // Update last index
        _lastIndex[agentId][msg.sender] = currentIndex;

        // track new client
        if (!_clientExists[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _clientExists[agentId][msg.sender] = true;
        }

        emit NewFeedback(agentId, msg.sender, score, tag1, tag2, feedbackUri, feedbackHash);
    }

    /// @notice Get all match results for an agent
    /// @param agentId The agent ID to query
    /// @return matches Array of all matches for the agent
    function getAgentMatches(uint256 agentId) external view returns (ServerFeedback[] memory) {
        return _agentMatches[agentId];
    }

    /// @notice Get match results for an agent with pagination
    /// @param agentId The agent ID to query
    /// @param offset Starting index
    /// @param limit Maximum number of results to return
    /// @return matches Array of matches
    function getAgentMatchesPaginated(
        uint256 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (ServerFeedback[] memory) {
        ServerFeedback[] storage allMatches = _agentMatches[agentId];
        
        if (offset >= allMatches.length) {
            return new ServerFeedback[](0);
        }

        uint256 end = offset + limit;
        if (end > allMatches.length) {
            end = allMatches.length;
        }

        uint256 resultLength = end - offset;
        ServerFeedback[] memory result = new ServerFeedback[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allMatches[offset + i];
        }

        return result;
    }

    /// @notice Get match statistics for an agent
    /// @param agentId The agent ID to query
    /// @return totalMatches Total number of matches
    /// @return wins Number of wins
    /// @return draws Number of draws
    /// @return losses Number of losses
    /// @return totalSelfScore Total score by the agent
    /// @return totalOpponentScore Total score by opponents
    function getAgentMatchStats(uint256 agentId) external view returns (
        uint256 totalMatches,
        uint256 wins,
        uint256 draws,
        uint256 losses,
        uint256 totalSelfScore,
        uint256 totalOpponentScore
    ) {
        ServerFeedback[] storage matches = _agentMatches[agentId];
        totalMatches = matches.length;

        for (uint256 i = 0; i < matches.length; i++) {
            ServerFeedback storage oneMatch = matches[i];
            
            if (oneMatch.result == 2) {
                wins++;
            } else if (oneMatch.result == 1) {
                draws++;
            } else if (oneMatch.result == 0) {
                losses++;
            }

            totalSelfScore += oneMatch.selfScore;
            totalOpponentScore += oneMatch.opponentScore;
        }
    }

    /// @notice Get head-to-head match history between two agents
    /// @param agentId1 First agent ID
    /// @param agentId2 Second agent ID
    /// @return matches Array of matches between the two agents (from agentId1's perspective)
    function getHeadToHeadMatches(
        uint256 agentId1,
        uint256 agentId2
    ) external view returns (ServerFeedback[] memory) {
        ServerFeedback[] storage allMatches = _agentMatches[agentId1];
        
        // First pass: count matches against agentId2
        uint256 count = 0;
        for (uint256 i = 0; i < allMatches.length; i++) {
            if (allMatches[i].opponentAgentId == agentId2) {
                count++;
            }
        }

        // Second pass: collect matches
        ServerFeedback[] memory result = new ServerFeedback[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allMatches.length; i++) {
            if (allMatches[i].opponentAgentId == agentId2) {
                result[index++] = allMatches[i];
            }
        }

        return result;
    }

    /// @notice Get total number of matches for an agent
    /// @param agentId The agent ID to query
    /// @return uint256 Total number of matches
    function getAgentMatchCount(uint256 agentId) external view returns (uint256) {
        return _agentMatches[agentId].length;
    }

    /// @notice Decode tag2 to get match scores
    /// @param tag2 The encoded score bytes32
    /// @return selfScore Agent's score
    /// @return opponentScore Opponent's score
    function decodeScores(bytes32 tag2) public pure returns (uint128 selfScore, uint128 opponentScore) {
        selfScore = uint128(uint256(tag2) >> 128);
        opponentScore = uint128(uint256(tag2));
    }

    /// @notice Owner functionality - requires Ownable from parent
    modifier onlyOwner() {
        require(msg.sender == owner(), "Not owner");
        _;
    }

    /// @notice Get the owner address from parent IdentityRegistry
    function owner() public view returns (address) {
        // Assuming IdentityRegistry inherits Ownable
        // We need to expose the owner somehow
        // For now, return address(0) - this needs to be implemented based on actual structure
        return address(this); // Placeholder - needs proper implementation
    }
}