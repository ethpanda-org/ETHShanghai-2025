// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004
 * @dev AI Agent Commerce Standard Interface
 * @notice Defines the standard interface for AI-driven commercial transactions
 */
interface IERC8004 {
    /// @notice Emitted when an agent initiates a transaction
    event TransactionInitiated(
        bytes32 indexed transactionId, address indexed agent, address indexed merchant, uint256 amount, bytes32 cartHash
    );

    /// @notice Emitted when a transaction is completed
    event TransactionCompleted(bytes32 indexed transactionId, bytes32 receiptHash, uint256 timestamp);

    /// @notice Emitted when a transaction is disputed
    event TransactionDisputed(bytes32 indexed transactionId, address indexed disputer, string reason);

    /**
     * @notice Initialize a transaction with signed mandate
     * @param agent The agent's DID address
     * @param merchant The merchant's address
     * @param amount Transaction amount in wei
     * @param cartHash Hash of the shopping cart
     * @param mandateSignature User's mandate signature
     * @return transactionId Unique transaction identifier
     */
    function initiateTransaction(
        address agent,
        address merchant,
        uint256 amount,
        bytes32 cartHash,
        bytes calldata mandateSignature
    ) external returns (bytes32 transactionId);

    /**
     * @notice Complete a transaction with payment receipt
     * @param transactionId Transaction to complete
     * @param receiptHash Hash of payment receipt
     * @param receiptSignature Payment provider's signature
     */
    function completeTransaction(bytes32 transactionId, bytes32 receiptHash, bytes calldata receiptSignature) external;

    /**
     * @notice Dispute a transaction
     * @param transactionId Transaction to dispute
     * @param reason Dispute reason
     */
    function disputeTransaction(bytes32 transactionId, string calldata reason) external;

    /**
     * @notice Get transaction details
     * @param transactionId Transaction identifier
     */
    function getTransaction(bytes32 transactionId)
        external
        view
        returns (
            address agent,
            address merchant,
            uint256 amount,
            bytes32 cartHash,
            bytes32 receiptHash,
            uint8 status,
            uint256 timestamp
        );
}
