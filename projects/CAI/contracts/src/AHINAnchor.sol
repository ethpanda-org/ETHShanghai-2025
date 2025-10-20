// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {CAIRegistry} from "./CAIRegistry.sol";

/**
 * @title AHINAnchor
 * @dev Active Hash Interaction Network - On-chain Audit Trail Anchoring
 * @notice Stores Merkle roots of interaction chains for verification
 */
contract AHINAnchor {
    // AHIN Block structure
    struct AHINBlock {
        bytes32 merkleRoot;
        bytes32 prevBlockHash;
        uint256 timestamp;
        address submitter;
        uint256 transactionCount;
        string metadataURI; // IPFS link to full audit bundle
    }

    // Storage
    mapping(uint256 => AHINBlock) public ahinBlocks;
    uint256 public currentBlockNumber;
    uint256 public totalTransactionsAnchored;

    mapping(address => bool) public authorizedAnchors;
    address public admin;

    // Events
    event BlockAnchored(
        uint256 indexed blockNumber, bytes32 merkleRoot, uint256 transactionCount, address indexed submitter
    );
    event AuthorizedAnchorAdded(address indexed anchor);
    event AuthorizedAnchorRemoved(address indexed anchor);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "AHINAnchor: caller is not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedAnchors[msg.sender] || msg.sender == admin, "AHINAnchor: not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedAnchors[msg.sender] = true;
        currentBlockNumber = 0;
    }

    /**
     * @notice Anchor a new Merkle root
     * @param merkleRoot Root hash of transaction batch
     * @param transactionCount Number of transactions in batch
     * @param metadataURI IPFS URI for full audit data
     */
    function anchorBlock(bytes32 merkleRoot, uint256 transactionCount, string calldata metadataURI)
        external
        onlyAuthorized
    {
        require(merkleRoot != bytes32(0), "AHINAnchor: invalid merkle root");
        require(transactionCount > 0, "AHINAnchor: zero transactions");

        bytes32 prevHash = currentBlockNumber == 0
            ? bytes32(0)
            : keccak256(
                abi.encodePacked(ahinBlocks[currentBlockNumber].merkleRoot, ahinBlocks[currentBlockNumber].timestamp)
            );

        currentBlockNumber++;

        ahinBlocks[currentBlockNumber] = AHINBlock({
            merkleRoot: merkleRoot,
            prevBlockHash: prevHash,
            timestamp: block.timestamp,
            submitter: msg.sender,
            transactionCount: transactionCount,
            metadataURI: metadataURI
        });

        totalTransactionsAnchored += transactionCount;

        emit BlockAnchored(currentBlockNumber, merkleRoot, transactionCount, msg.sender);
    }

    /**
     * @notice Verify a transaction is anchored
     * @param blockNumber Block number to check
     * @param transactionHash Hash of transaction
     * @param proof Merkle proof
     * @return valid True if proof is valid
     */
    function verifyTransaction(uint256 blockNumber, bytes32 transactionHash, bytes32[] calldata proof)
        external
        view
        returns (bool valid)
    {
        require(blockNumber <= currentBlockNumber, "AHINAnchor: invalid block number");

        bytes32 computedRoot = transactionHash;

        for (uint256 i = 0; i < proof.length; i++) {
            if (computedRoot < proof[i]) {
                computedRoot = keccak256(abi.encodePacked(computedRoot, proof[i]));
            } else {
                computedRoot = keccak256(abi.encodePacked(proof[i], computedRoot));
            }
        }

        return computedRoot == ahinBlocks[blockNumber].merkleRoot;
    }

    /**
     * @notice Get block details
     * @param blockNumber Block to query
     */
    function getBlock(uint256 blockNumber)
        external
        view
        returns (
            bytes32 merkleRoot,
            bytes32 prevBlockHash,
            uint256 timestamp,
            address submitter,
            uint256 transactionCount,
            string memory metadataURI
        )
    {
        require(blockNumber <= currentBlockNumber, "AHINAnchor: invalid block number");
        AHINBlock storage ahinBlock = ahinBlocks[blockNumber];
        return (
            ahinBlock.merkleRoot,
            ahinBlock.prevBlockHash,
            ahinBlock.timestamp,
            ahinBlock.submitter,
            ahinBlock.transactionCount,
            ahinBlock.metadataURI
        );
    }

    /**
     * @notice Verify chain integrity
     * @param fromBlock Starting block
     * @param toBlock Ending block
     * @return valid True if chain is intact
     */
    function verifyChainIntegrity(uint256 fromBlock, uint256 toBlock) external view returns (bool valid) {
        require(fromBlock <= toBlock && toBlock <= currentBlockNumber, "AHINAnchor: invalid range");

        for (uint256 i = fromBlock + 1; i <= toBlock; i++) {
            bytes32 expectedPrevHash =
                keccak256(abi.encodePacked(ahinBlocks[i - 1].merkleRoot, ahinBlocks[i - 1].timestamp));

            if (ahinBlocks[i].prevBlockHash != expectedPrevHash) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Add authorized anchor
     * @param anchor Address to authorize
     */
    function addAuthorizedAnchor(address anchor) external onlyAdmin {
        authorizedAnchors[anchor] = true;
        emit AuthorizedAnchorAdded(anchor);
    }

    /**
     * @notice Remove authorized anchor
     * @param anchor Address to remove
     */
    function removeAuthorizedAnchor(address anchor) external onlyAdmin {
        authorizedAnchors[anchor] = false;
        emit AuthorizedAnchorRemoved(anchor);
    }
}
