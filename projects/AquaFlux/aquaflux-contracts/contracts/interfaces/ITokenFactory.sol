// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITokenFactory
 * @dev Interface for the token clone factory contract
 */
interface ITokenFactory {
    /**
     * @dev Emitted when a new token is deployed
     * @param tokenType The type of token (AQ, P, C, S)
     * @param assetId The asset identifier
     * @param tokenAddress The deployed token address
     */
    event TokenDeployed(
        string indexed tokenType,
        bytes32 indexed assetId,
        address indexed tokenAddress
    );

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
    ) external returns (address);

    /**
     * @dev Gets the implementation address for a token type
     * @param tokenType The token type
     * @return The implementation address
     */
    function getImplementation(string calldata tokenType) external view returns (address);

    /**
     * @dev Sets the implementation address for a token type
     * @param tokenType The token type
     * @param implementation The implementation address
     */
    function setImplementation(string calldata tokenType, address implementation) external;

    /**
     * @dev Predicts the address where a token will be deployed
     * @param tokenType The token type
     * @param assetId The asset identifier
     * @return The predicted token address
     */
    function predictTokenAddress(
        string calldata tokenType,
        bytes32 assetId
    ) external view returns (address);

    /**
     * @dev Checks if a token is deployed for the given asset and type
     * @param tokenType The token type
     * @param assetId The asset identifier
     * @return True if token is deployed
     */
    function isTokenDeployed(
        string calldata tokenType,
        bytes32 assetId
    ) external view returns (bool);
} 