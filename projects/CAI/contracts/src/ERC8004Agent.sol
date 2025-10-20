// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./interfaces/IERC8004.sol";
import {CAIRegistry} from "./CAIRegistry.sol";
import {AHINAnchor} from "./AHINAnchor.sol";

/**
 * @title ERC8004Agent
 * @dev Implementation of ERC-8004 AI Agent Commerce Standard
 * @notice Integrates CAIRegistry and AHINAnchor for complete verification
 */
contract ERC8004Agent is IERC8004 {
    // Transaction Status
    enum TxStatus {
        Pending,
        Completed,
        Disputed,
        Cancelled
    }

    // Transaction structure
    struct Transaction {
        bytes32 transactionId;
        address agent;
        address merchant;
        address user;
        uint256 amount;
        bytes32 cartHash;
        bytes32 mandateHash;
        bytes32 receiptHash;
        TxStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string disputeReason;
    }

    // Storage
    mapping(bytes32 => Transaction) public transactions;
    CAIRegistry public registry;
    AHINAnchor public anchor;

    uint256 public totalTransactions;
    uint256 public transactionNonce;

    // Events (inherited from IERC8004)

    constructor(address _registry, address _anchor) {
        registry = CAIRegistry(_registry);
        anchor = AHINAnchor(_anchor);
    }

    /**
     * @inheritdoc IERC8004
     */
    function initiateTransaction(
        address agent,
        address merchant,
        uint256 amount,
        bytes32 cartHash,
        bytes calldata mandateSignature
    ) external override returns (bytes32 transactionId) {
        // Verify agent is registered and active
        (,, uint256 createdAt,, CAIRegistry.DIDStatus status,,) = registry.getDID(agent);
        require(createdAt > 0 && status == CAIRegistry.DIDStatus.Active, "ERC8004: invalid agent DID");

        // Generate unique transaction ID
        transactionId = keccak256(abi.encodePacked(agent, merchant, cartHash, transactionNonce++, block.timestamp));

        // Verify mandate signature (simplified - full implementation would use ECDSA)
        bytes32 mandateHash = keccak256(mandateSignature);

        // Create transaction record
        transactions[transactionId] = Transaction({
            transactionId: transactionId,
            agent: agent,
            merchant: merchant,
            user: msg.sender,
            amount: amount,
            cartHash: cartHash,
            mandateHash: mandateHash,
            receiptHash: bytes32(0),
            status: TxStatus.Pending,
            createdAt: block.timestamp,
            completedAt: 0,
            disputeReason: ""
        });

        totalTransactions++;

        emit TransactionInitiated(transactionId, agent, merchant, amount, cartHash);

        return transactionId;
    }

    /**
     * @inheritdoc IERC8004
     */
    function completeTransaction(bytes32 transactionId, bytes32 receiptHash, bytes calldata receiptSignature)
        external
        override
    {
        Transaction storage txn = transactions[transactionId];
        require(txn.status == TxStatus.Pending, "ERC8004: transaction not pending");
        require(msg.sender == txn.agent || msg.sender == txn.merchant, "ERC8004: unauthorized completion");

        // Verify receipt signature (simplified)
        require(receiptHash != bytes32(0), "ERC8004: invalid receipt");
        require(receiptSignature.length > 0, "ERC8004: missing signature");

        txn.receiptHash = receiptHash;
        txn.status = TxStatus.Completed;
        txn.completedAt = block.timestamp;

        emit TransactionCompleted(transactionId, receiptHash, block.timestamp);
    }

    /**
     * @inheritdoc IERC8004
     */
    function disputeTransaction(bytes32 transactionId, string calldata reason) external override {
        Transaction storage txn = transactions[transactionId];
        require(txn.status == TxStatus.Pending || txn.status == TxStatus.Completed, "ERC8004: invalid status");
        require(msg.sender == txn.user || msg.sender == txn.merchant, "ERC8004: unauthorized dispute");

        txn.status = TxStatus.Disputed;
        txn.disputeReason = reason;

        emit TransactionDisputed(transactionId, msg.sender, reason);
    }

    /**
     * @inheritdoc IERC8004
     */
    function getTransaction(bytes32 transactionId)
        external
        view
        override
        returns (
            address agent,
            address merchant,
            uint256 amount,
            bytes32 cartHash,
            bytes32 receiptHash,
            uint8 status,
            uint256 timestamp
        )
    {
        Transaction storage txn = transactions[transactionId];
        return (txn.agent, txn.merchant, txn.amount, txn.cartHash, txn.receiptHash, uint8(txn.status), txn.createdAt);
    }

    /**
     * @notice Verify transaction integrity with AHIN
     * @param transactionId Transaction to verify
     * @param blockNumber AHIN block number
     * @param proof Merkle proof
     * @return valid True if transaction is anchored
     */
    function verifyTransactionIntegrity(bytes32 transactionId, uint256 blockNumber, bytes32[] calldata proof)
        external
        view
        returns (bool valid)
    {
        Transaction storage txn = transactions[transactionId];
        require(txn.createdAt > 0, "ERC8004: transaction not found");

        bytes32 txHash = keccak256(abi.encodePacked(txn.transactionId, txn.cartHash, txn.receiptHash));

        return anchor.verifyTransaction(blockNumber, txHash, proof);
    }
}
