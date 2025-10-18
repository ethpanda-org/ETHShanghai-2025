// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/ICloneFactory.sol";
import "../token/AqToken.sol";
import "../token/PToken.sol";
import "../token/CToken.sol";
import "../token/SToken.sol";

/**
 * @title CloneFactory
 * @dev Factory contract for deploying token clones using EIP-1167 minimal proxy pattern
 * Manages the deployment of AqToken, PToken, CToken, and SToken instances
 */
contract CloneFactory is ICloneFactory, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    // Implementation addresses for each token type
    mapping(string => address) private _implementations;
    
    // Mapping to track deployed tokens: tokenType => assetId => tokenAddress
    mapping(string => mapping(bytes32 => address)) private _deployedTokens;

    // Events
    event ImplementationSet(string indexed tokenType, address indexed implementation);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEPLOYER_ROLE, msg.sender);
    }

    /**
     * @dev Sets the implementation address for a token type
     * @param tokenType The token type (AQ, P, C, S)
     * @param implementation The implementation contract address
     */
    function setImplementation(string calldata tokenType, address implementation) external override onlyRole(ADMIN_ROLE) {
        require(implementation != address(0), "Invalid implementation address");
        _implementations[tokenType] = implementation;
        emit ImplementationSet(tokenType, implementation);
    }

    /**
     * @dev Gets the implementation address for a token type
     * @param tokenType The token type
     * @return The implementation address
     */
    function getImplementation(string calldata tokenType) external view override returns (address) {
        return _implementations[tokenType];
    }

    /**
     * @dev Deploys a new token clone
     * @param tokenType The type of token to deploy
     * @param assetId The asset identifier
     * @param name The token name
     * @param symbol The token symbol
     * @return The deployed token address
     */
    function deployToken(
        string calldata tokenType,
        bytes32 assetId,
        string calldata name,
        string calldata symbol
    ) external override onlyRole(DEPLOYER_ROLE) returns (address) {
        require(bytes(tokenType).length > 0, "Invalid token type");
        require(assetId != bytes32(0), "Invalid asset ID");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(symbol).length > 0, "Invalid symbol");

        address implementation = _implementations[tokenType];
        require(implementation != address(0), "Implementation not set");

        // Check if token already deployed
        require(!isTokenDeployed(tokenType, assetId), "Token already deployed");

        // Deploy clone
        address clone = Clones.clone(implementation);
        
        // Initialize the clone
        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("AQ"))) {
            AqToken(clone).initialize(name, symbol, assetId, msg.sender);
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("P"))) {
            PToken(clone).initialize(name, symbol, assetId, msg.sender);
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("C"))) {
            CToken(clone).initialize(name, symbol, assetId, msg.sender);
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("S"))) {
            SToken(clone).initialize(name, symbol, assetId, msg.sender);
        } else {
            revert("Unsupported token type");
        }

        // Record the deployed token
        _deployedTokens[tokenType][assetId] = clone;

        emit TokenDeployed(tokenType, assetId, clone);
        return clone;
    }

    /**
     * @dev Predicts the address where a token will be deployed
     * @param tokenType The token type
     * @param assetId The asset identifier
     * @return The predicted token address
     */
    function predictTokenAddress(
        string calldata tokenType,
        bytes32 assetId
    ) external view override returns (address) {
        address implementation = _implementations[tokenType];
        if (implementation == address(0)) {
            return address(0);
        }
        
        // Create a deterministic salt based on assetId
        bytes32 salt = keccak256(abi.encodePacked(tokenType, assetId));
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }

    /**
     * @dev Checks if a token is deployed for the given asset and type
     * @param tokenType The token type
     * @param assetId The asset identifier
     * @return True if token is deployed
     */
    function isTokenDeployed(
        string calldata tokenType,
        bytes32 assetId
    ) public view override returns (bool) {
        return _deployedTokens[tokenType][assetId] != address(0);
    }

    /**
     * @dev Gets the deployed token address for a given asset and type
     * @param tokenType The token type
     * @param assetId The asset identifier
     * @return The deployed token address
     */
    function getDeployedToken(string calldata tokenType, bytes32 assetId) external view returns (address) {
        return _deployedTokens[tokenType][assetId];
    }

    /**
     * @dev Returns the version of the factory
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
} 