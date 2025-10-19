// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title SimpleMultiSig
 * @dev A simple multi-signature wallet for governance operations
 * Supports m-of-n signature requirements with configurable signers and threshold
 */
contract SimpleMultiSig is ReentrancyGuard {
    using Address for address;

    // Events
    event SignerAdded(address indexed signer, address indexed addedBy);
    event SignerRemoved(address indexed signer, address indexed removedBy);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold, address indexed changedBy);
    event TransactionProposed(uint256 indexed txId, address indexed proposer, address target, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed signer);
    event TransactionRevoked(uint256 indexed txId, address indexed signer);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event TransactionCanceled(uint256 indexed txId, address indexed canceler);

    // Structure for pending transactions
    struct Transaction {
        address target;
        uint256 value;
        bytes data;
        bool executed;
        bool canceled;
        uint256 confirmations;
        uint256 proposedAt;
        address proposer;
        mapping(address => bool) confirmed;
    }

    // State variables
    mapping(address => bool) public isSigner;
    address[] public signers;
    uint256 public threshold;
    uint256 public transactionCount;
    uint256 public constant TRANSACTION_TIMEOUT = 7 days;
    
    mapping(uint256 => Transaction) public transactions;

    // Modifiers
    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    modifier onlyMultiSig() {
        require(msg.sender == address(this), "Only multisig can call");
        _;
    }

    modifier transactionExists(uint256 txId) {
        require(txId < transactionCount, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Transaction already executed");
        _;
    }

    modifier notCanceled(uint256 txId) {
        require(!transactions[txId].canceled, "Transaction canceled");
        _;
    }

    modifier notConfirmed(uint256 txId) {
        require(!transactions[txId].confirmed[msg.sender], "Transaction already confirmed");
        _;
    }

    modifier confirmed(uint256 txId) {
        require(transactions[txId].confirmed[msg.sender], "Transaction not confirmed");
        _;
    }

    modifier notExpired(uint256 txId) {
        require(
            block.timestamp <= transactions[txId].proposedAt + TRANSACTION_TIMEOUT,
            "Transaction expired"
        );
        _;
    }

    /**
     * @dev Constructor sets initial signers and threshold
     * @param _signers Initial list of signers
     * @param _threshold Number of confirmations required
     */
    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "At least one signer required");
        require(_threshold > 0 && _threshold <= _signers.length, "Invalid threshold");

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Invalid signer address");
            require(!isSigner[signer], "Duplicate signer");
            
            isSigner[signer] = true;
            signers.push(signer);
        }
        
        threshold = _threshold;
    }

    /**
     * @dev Propose a new transaction
     * @param target The target contract address
     * @param value The amount of ETH to send
     * @param data The call data
     * @return txId The transaction ID
     */
    function proposeTransaction(
        address target,
        uint256 value,
        bytes memory data
    ) external onlySigner returns (uint256 txId) {
        require(target != address(0), "Invalid target address");

        txId = transactionCount;
        Transaction storage newTx = transactions[txId];
        newTx.target = target;
        newTx.value = value;
        newTx.data = data;
        newTx.executed = false;
        newTx.canceled = false;
        newTx.confirmations = 0;
        newTx.proposedAt = block.timestamp;
        newTx.proposer = msg.sender;

        transactionCount++;

        emit TransactionProposed(txId, msg.sender, target, value, data);
    }

    /**
     * @dev Confirm a transaction
     * @param txId The transaction ID
     */
    function confirmTransaction(uint256 txId)
        external
        onlySigner
        transactionExists(txId)
        notExecuted(txId)
        notCanceled(txId)
        notConfirmed(txId)
        notExpired(txId)
    {
        Transaction storage txn = transactions[txId];
        txn.confirmed[msg.sender] = true;
        txn.confirmations++;

        emit TransactionConfirmed(txId, msg.sender);
    }

    /**
     * @dev Revoke confirmation for a transaction
     * @param txId The transaction ID
     */
    function revokeConfirmation(uint256 txId)
        external
        onlySigner
        transactionExists(txId)
        notExecuted(txId)
        notCanceled(txId)
        confirmed(txId)
    {
        Transaction storage txn = transactions[txId];
        txn.confirmed[msg.sender] = false;
        txn.confirmations--;

        emit TransactionRevoked(txId, msg.sender);
    }

    /**
     * @dev Execute a transaction if it has enough confirmations
     * @param txId The transaction ID
     */
    function executeTransaction(uint256 txId)
        external
        nonReentrant
        transactionExists(txId)
        notExecuted(txId)
        notCanceled(txId)
        notExpired(txId)
    {
        Transaction storage txn = transactions[txId];
        require(txn.confirmations >= threshold, "Not enough confirmations");

        txn.executed = true;

        // Execute the transaction
        (bool success, bytes memory returnData) = txn.target.call{value: txn.value}(txn.data);
        require(success, string(returnData));

        emit TransactionExecuted(txId, msg.sender);
    }

    /**
     * @dev Cancel a transaction (only proposer or if expired)
     * @param txId The transaction ID
     */
    function cancelTransaction(uint256 txId)
        external
        transactionExists(txId)
        notExecuted(txId)
        notCanceled(txId)
    {
        Transaction storage txn = transactions[txId];
        
        // Only proposer can cancel, or anyone if expired
        require(
            msg.sender == txn.proposer || 
            block.timestamp > txn.proposedAt + TRANSACTION_TIMEOUT,
            "Not authorized to cancel"
        );

        txn.canceled = true;

        emit TransactionCanceled(txId, msg.sender);
    }

    /**
     * @dev Add a new signer (requires multisig approval)
     * @param newSigner The address of the new signer
     */
    function addSigner(address newSigner) external onlyMultiSig {
        require(newSigner != address(0), "Invalid signer address");
        require(!isSigner[newSigner], "Already a signer");

        isSigner[newSigner] = true;
        signers.push(newSigner);

        emit SignerAdded(newSigner, msg.sender);
    }

    /**
     * @dev Remove a signer (requires multisig approval)
     * @param signer The address of the signer to remove
     */
    function removeSigner(address signer) external onlyMultiSig {
        require(isSigner[signer], "Not a signer");
        require(signers.length > 1, "Cannot remove last signer");
        require(signers.length - 1 >= threshold, "Would break threshold requirement");

        isSigner[signer] = false;

        // Remove from signers array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signer, msg.sender);
    }

    /**
     * @dev Change the confirmation threshold (requires multisig approval)
     * @param newThreshold The new threshold
     */
    function changeThreshold(uint256 newThreshold) external onlyMultiSig {
        require(newThreshold > 0 && newThreshold <= signers.length, "Invalid threshold");

        uint256 oldThreshold = threshold;
        threshold = newThreshold;

        emit ThresholdChanged(oldThreshold, newThreshold, msg.sender);
    }

    /**
     * @dev Get transaction confirmation status
     * @param txId The transaction ID
     * @param signer The signer address
     * @return Whether the signer has confirmed the transaction
     */
    function isConfirmed(uint256 txId, address signer) external view returns (bool) {
        return transactions[txId].confirmed[signer];
    }

    /**
     * @dev Get transaction details
     * @param txId The transaction ID
     */
    function getTransaction(uint256 txId)
        external
        view
        returns (
            address target,
            uint256 value,
            bytes memory data,
            bool executed,
            bool canceled,
            uint256 confirmations,
            uint256 proposedAt,
            address proposer
        )
    {
        Transaction storage txn = transactions[txId];
        return (
            txn.target,
            txn.value,
            txn.data,
            txn.executed,
            txn.canceled,
            txn.confirmations,
            txn.proposedAt,
            txn.proposer
        );
    }

    /**
     * @dev Get the list of signers
     * @return Array of signer addresses
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @dev Get the number of signers
     * @return The number of signers
     */
    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }

    /**
     * @dev Check if a transaction can be executed
     * @param txId The transaction ID
     * @return Whether the transaction can be executed
     */
    function canExecute(uint256 txId) external view returns (bool) {
        if (txId >= transactionCount) return false;
        
        Transaction storage txn = transactions[txId];
        return (
            !txn.executed &&
            !txn.canceled &&
            txn.confirmations >= threshold &&
            block.timestamp <= txn.proposedAt + TRANSACTION_TIMEOUT
        );
    }

    /**
     * @dev Check if a transaction is expired
     * @param txId The transaction ID
     * @return Whether the transaction is expired
     */
    function isExpired(uint256 txId) external view returns (bool) {
        if (txId >= transactionCount) return false;
        return block.timestamp > transactions[txId].proposedAt + TRANSACTION_TIMEOUT;
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}

    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}