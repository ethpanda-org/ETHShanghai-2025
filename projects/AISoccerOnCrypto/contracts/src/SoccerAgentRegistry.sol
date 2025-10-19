// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdentityRegistry.sol";

/// @title SoccerAgentRegistry
/// @notice Registry for simulated soccer robot agents, inheriting from IdentityRegistry
/// @dev Adds soccer-specific metadata and functionality to the base identity registry
contract SoccerAgentRegistry is IdentityRegistry {
    // Soccer-specific agent information
    struct SoccerAgentInfo {
        string teamName;        // 团队名称
        string modelVersion;    // 模型版本
        uint256 registeredAt;   // 注册时间
        bool isActive;          // 是否激活
    }

    // agentId => SoccerAgentInfo
    mapping(uint256 => SoccerAgentInfo) private _soccerAgents;

    // Developer address => list of agent IDs
    mapping(address => uint256[]) private _developerAgents;

    // Events
    event SoccerAgentRegistered(
        uint256 indexed agentId,
        address indexed developer,
        string teamName,
        string modelVersion
    );

    event AgentStatusChanged(
        uint256 indexed agentId,
        bool isActive
    );

    event TeamNameUpdated(
        uint256 indexed agentId,
        string oldTeamName,
        string newTeamName
    );

    /// @notice Register a new soccer agent
    /// @param teamName The name of the team
    /// @param modelVersion The version of the AI model
    /// @param tokenUri The URI for the agent's metadata
    /// @return agentId The ID of the newly registered agent
    function registerSoccerAgent(
        string memory teamName,
        string memory modelVersion,
        string memory tokenUri
    ) external returns (uint256 agentId) {
        // Register using base IdentityRegistry
        agentId = register(tokenUri);

        // Store soccer-specific information
        _soccerAgents[agentId] = SoccerAgentInfo({
            teamName: teamName,
            modelVersion: modelVersion,
            registeredAt: block.timestamp,
            isActive: false
        });

        // Track developer's agents
        _developerAgents[msg.sender].push(agentId);

        emit SoccerAgentRegistered(agentId, msg.sender, teamName, modelVersion);
    }

    /// @notice Register a new soccer agent with additional metadata
    /// @param teamName The name of the team
    /// @param modelVersion The version of the AI model
    /// @param tokenUri The URI for the agent's metadata
    /// @param metadata Additional metadata entries
    /// @return agentId The ID of the newly registered agent
    function registerSoccerAgent(
        string memory teamName,
        string memory modelVersion,
        string memory tokenUri,
        MetadataEntry[] memory metadata
    ) external returns (uint256 agentId) {
        // Register using base IdentityRegistry with metadata
        agentId = register(tokenUri, metadata);

        // Store soccer-specific information
        _soccerAgents[agentId] = SoccerAgentInfo({
            teamName: teamName,
            modelVersion: modelVersion,
            registeredAt: block.timestamp,
            isActive: false
        });

        // Track developer's agents
        _developerAgents[msg.sender].push(agentId);

        emit SoccerAgentRegistered(agentId, msg.sender, teamName, modelVersion);
    }

    /// @notice Update the team name
    /// @param agentId The ID of the agent
    /// @param newTeamName The new team name
    function updateTeamName(uint256 agentId, string memory newTeamName) external {
        require(
            msg.sender == ownerOf(agentId) ||
            isApprovedForAll(ownerOf(agentId), msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );

        string memory oldTeamName = _soccerAgents[agentId].teamName;
        _soccerAgents[agentId].teamName = newTeamName;

        emit TeamNameUpdated(agentId, oldTeamName, newTeamName);
    }

    /// @notice Set agent active/inactive status
    /// @param agentId The ID of the agent
    /// @param isActive The new active status
    function setAgentStatus(uint256 agentId, bool isActive) external {
        require(
            msg.sender == ownerOf(agentId) ||
            isApprovedForAll(ownerOf(agentId), msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );

        _soccerAgents[agentId].isActive = isActive;

        emit AgentStatusChanged(agentId, isActive);
    }

    /// @notice Get soccer agent information
    /// @param agentId The ID of the agent
    /// @return info The soccer agent information
    function getSoccerAgentInfo(uint256 agentId) external view returns (SoccerAgentInfo memory) {
        require(_soccerAgents[agentId].registeredAt > 0, "Agent not registered as soccer agent");
        return _soccerAgents[agentId];
    }

    /// @notice Get all agents owned by a developer
    /// @param developer The address of the developer
    /// @return agentIds Array of agent IDs
    function getDeveloperAgents(address developer) external view returns (uint256[] memory) {
        return _developerAgents[developer];
    }

    /// @notice Check if an agent is a registered soccer agent
    /// @param agentId The ID of the agent
    /// @return bool True if the agent is registered as a soccer agent
    function isSoccerAgent(uint256 agentId) external view returns (bool) {
        return _soccerAgents[agentId].registeredAt > 0;
    }
}