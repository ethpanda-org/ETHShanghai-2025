// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITimelockManager
 * @dev Interface for convenient timelock operations and management
 * 
 * This interface provides a standard way to interact with the AquaFlux timelock system,
 * making it easier for external contracts, frontend applications, and governance tools
 * to schedule, manage, and execute time-locked operations.
 */
interface ITimelockManager {
    
    // Events
    event OperationScheduled(
        bytes32 indexed operationId,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 delay,
        string operationType
    );
    
    event BatchOperationScheduled(
        bytes32 indexed operationId,
        address[] targets,
        uint256[] values,
        bytes[] payloads,
        uint256 delay,
        string operationType
    );
    
    event OperationExecuted(
        bytes32 indexed operationId,
        address indexed target,
        uint256 value,
        bytes data
    );
    
    event OperationCancelled(
        bytes32 indexed operationId,
        address indexed canceller
    );
    
    /**
     * @dev Schedules a high-risk operation with automatic delay detection
     * @param target The contract to call
     * @param value The ETH value to send with the call
     * @param data The encoded function call data
     * @param salt A unique salt for the operation
     * @param description Human-readable description of the operation
     * @return operationId The unique identifier for the scheduled operation
     */
    function scheduleHighRiskOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 salt,
        string calldata description
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules multiple operations in a batch with automatic delay detection
     * @param targets Array of target contracts
     * @param values Array of ETH values for each call
     * @param payloads Array of encoded function call data
     * @param salt A unique salt for the batch operation
     * @param description Human-readable description of the batch operation
     * @return operationId The unique identifier for the scheduled batch operation
     */
    function scheduleBatchHighRiskOperation(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 salt,
        string calldata description
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Executes a ready operation
     * @param target The target contract
     * @param value The ETH value
     * @param data The call data
     * @param salt The salt used when scheduling
     */
    function executeOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 salt
    ) external;
    
    /**
     * @dev Executes a ready batch operation
     * @param targets Array of target contracts
     * @param values Array of ETH values
     * @param payloads Array of call data
     * @param salt The salt used when scheduling
     */
    function executeBatchOperation(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 salt
    ) external;
    
    /**
     * @dev Cancels a scheduled operation
     * @param operationId The operation ID to cancel
     */
    function cancelOperation(bytes32 operationId) external;
    
    /**
     * @dev Gets the status of an operation
     * @param operationId The operation ID to check
     * @return pending True if the operation is scheduled but not ready
     * @return ready True if the operation is ready for execution
     * @return done True if the operation has been executed
     */
    function getOperationState(bytes32 operationId) external view returns (
        bool pending,
        bool ready,
        bool done
    );
    
    /**
     * @dev Gets the timestamp when an operation becomes ready for execution
     * @param operationId The operation ID to check
     * @return timestamp The timestamp when the operation can be executed
     */
    function getTimestamp(bytes32 operationId) external view returns (uint256 timestamp);
    
    /**
     * @dev Gets the minimum delay for the timelock
     * @return delay The minimum delay in seconds
     */
    function getMinDelay() external view returns (uint256 delay);
    
    /**
     * @dev Gets the delay for a specific operation type
     * @param functionSelector The function selector to check
     * @return delay The delay in seconds for this operation type
     */
    function getOperationDelay(bytes4 functionSelector) external view returns (uint256 delay);
    
    /**
     * @dev Checks if an address has the proposer role
     * @param account The address to check
     * @return True if the address can propose operations
     */
    function isProposer(address account) external view returns (bool);
    
    /**
     * @dev Checks if an address has the executor role
     * @param account The address to check
     * @return True if the address can execute operations
     */
    function isExecutor(address account) external view returns (bool);
    
    /**
     * @dev Checks if an address has the admin role
     * @param account The address to check
     * @return True if the address has admin privileges
     */
    function isAdmin(address account) external view returns (bool);
    
    /**
     * @dev Gets all scheduled operations (if supported by implementation)
     * @return operationIds Array of scheduled operation IDs
     */
    function getScheduledOperations() external view returns (bytes32[] memory operationIds);
    
    /**
     * @dev Gets operation details
     * @param operationId The operation ID
     * @return target The target contract
     * @return value The ETH value
     * @return data The call data
     * @return timestamp The execution timestamp
     * @return description The operation description
     */
    function getOperationDetails(bytes32 operationId) external view returns (
        address target,
        uint256 value,
        bytes memory data,
        uint256 timestamp,
        string memory description
    );
}

/**
 * @title ITimelockOperations
 * @dev Extended interface for specific AquaFlux timelock operations
 * 
 * This interface provides convenience functions for common AquaFlux operations
 * that require timelock protection, making it easier to use from frontend applications
 * and governance tools.
 */
interface ITimelockOperations {
    
    /**
     * @dev Schedules a fund withdrawal for redemption
     * @param assetId The asset identifier
     * @param amount The amount to withdraw
     * @param salt Unique salt for the operation
     * @param reason Brief description of why funds are being withdrawn
     * @return operationId The scheduled operation ID
     */
    function scheduleFundWithdrawal(
        bytes32 assetId,
        uint256 amount,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules a protocol fee withdrawal for a specific asset
     * @param assetId The asset identifier
     * @param to The recipient address
     * @param amount The amount of fees to withdraw
     * @param salt Unique salt for the operation
     * @param reason Brief description of the fee withdrawal
     * @return operationId The scheduled operation ID
     */
    function scheduleProtocolFeeWithdrawal(
        bytes32 assetId,
        address to,
        uint256 amount,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules a bulk protocol fee withdrawal for multiple assets
     * @param assetIds Array of asset identifiers
     * @param to The recipient address
     * @param salt Unique salt for the operation
     * @param reason Brief description of the bulk withdrawal
     * @return operationId The scheduled operation ID
     */
    function scheduleBulkFeeWithdrawal(
        bytes32[] calldata assetIds,
        address to,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules a redemption revenue injection
     * @param assetId The asset identifier
     * @param amount The amount of revenue to inject
     * @param salt Unique salt for the operation
     * @param reason Brief description of the revenue injection
     * @return operationId The scheduled operation ID
     */
    function scheduleRevenueInjection(
        bytes32 assetId,
        uint256 amount,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules a contract upgrade
     * @param newImplementation The address of the new implementation
     * @param salt Unique salt for the operation
     * @param reason Brief description of the upgrade
     * @return operationId The scheduled operation ID
     */
    function scheduleContractUpgrade(
        address newImplementation,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
    
    /**
     * @dev Schedules a contract upgrade with initialization data
     * @param newImplementation The address of the new implementation
     * @param data The initialization call data
     * @param salt Unique salt for the operation
     * @param reason Brief description of the upgrade
     * @return operationId The scheduled operation ID
     */
    function scheduleContractUpgradeAndCall(
        address newImplementation,
        bytes calldata data,
        bytes32 salt,
        string calldata reason
    ) external returns (bytes32 operationId);
}