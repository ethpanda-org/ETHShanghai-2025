// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./interfaces/IERC8004.sol";

// ============================================================================
// CAI × ERC-8004 Framework - Core Contracts
// ETH Shanghai 2025 Hackathon
// ============================================================================

// ============================================================================
// File: contracts/src/CAIRegistry.sol
// ============================================================================

/**
 * @title CAIRegistry
 * @dev Decentralized Identity Registry for AI Agents and Users
 * @notice Manages DID registration, credential verification, and revocation
 */
contract CAIRegistry {
    // DID Status enum
    enum DIDStatus {
        Inactive,
        Active,
        Revoked,
        Suspended
    }

    // DID Record structure
    struct DIDRecord {
        address owner;
        string didDocument; // IPFS hash or JSON-LD document
        uint256 createdAt;
        uint256 updatedAt;
        DIDStatus status;
        bytes32 credentialHash; // Hash of associated VC
        uint256 nonce; // For replay protection
    }

    // Credential metadata
    struct Credential {
        bytes32 credentialHash;
        address issuer;
        address subject;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
        string credentialType; // "MandateVC", "CartVC", etc.
    }

    // Storage
    mapping(address => DIDRecord) public didRegistry;
    mapping(bytes32 => Credential) public credentials;
    mapping(address => bool) public trustedIssuers;

    address public admin;
    uint256 public totalDIDs;
    uint256 public totalCredentials;

    // Events
    event DIDRegistered(address indexed did, string didDocument, uint256 timestamp);
    event DIDUpdated(address indexed did, string newDocument, uint256 timestamp);
    event DIDRevoked(address indexed did, uint256 timestamp);
    event CredentialIssued(bytes32 indexed credentialHash, address indexed subject, uint256 timestamp);
    event CredentialRevoked(bytes32 indexed credentialHash, uint256 timestamp);
    event TrustedIssuerAdded(address indexed issuer);
    event TrustedIssuerRemoved(address indexed issuer);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "CAIRegistry: caller is not admin");
        _;
    }

    modifier onlyDIDOwner(address did) {
        require(didRegistry[did].owner == msg.sender, "CAIRegistry: not DID owner");
        _;
    }

    modifier onlyTrustedIssuer() {
        require(trustedIssuers[msg.sender], "CAIRegistry: not trusted issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
        trustedIssuers[msg.sender] = true;
    }

    /**
     * @notice Register a new DID
     * @param didDocument IPFS hash or JSON-LD document URL
     */
    function registerDID(string calldata didDocument) external {
        require(didRegistry[msg.sender].status == DIDStatus.Inactive, "CAIRegistry: DID already registered");

        didRegistry[msg.sender] = DIDRecord({
            owner: msg.sender,
            didDocument: didDocument,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            status: DIDStatus.Active,
            credentialHash: bytes32(0),
            nonce: 0
        });

        totalDIDs++;
        emit DIDRegistered(msg.sender, didDocument, block.timestamp);
    }

    /**
     * @notice Update DID document
     * @param newDocument New document hash
     */
    function updateDID(string calldata newDocument) external onlyDIDOwner(msg.sender) {
        require(didRegistry[msg.sender].status == DIDStatus.Active, "CAIRegistry: DID not active");

        didRegistry[msg.sender].didDocument = newDocument;
        didRegistry[msg.sender].updatedAt = block.timestamp;

        emit DIDUpdated(msg.sender, newDocument, block.timestamp);
    }

    /**
     * @notice Revoke a DID
     * @param did DID address to revoke
     */
    function revokeDID(address did) external {
        require(msg.sender == did || msg.sender == admin, "CAIRegistry: unauthorized revocation");
        require(didRegistry[did].status == DIDStatus.Active, "CAIRegistry: DID not active");

        didRegistry[did].status = DIDStatus.Revoked;
        didRegistry[did].updatedAt = block.timestamp;

        emit DIDRevoked(did, block.timestamp);
    }

    /**
     * @notice Issue a verifiable credential
     * @param subject Subject's DID address
     * @param credentialHash Hash of the credential
     * @param credentialType Type of credential (e.g., "MandateVC")
     * @param expiresAt Expiration timestamp
     */
    function issueCredential(
        address subject,
        bytes32 credentialHash,
        string calldata credentialType,
        uint256 expiresAt
    ) external onlyTrustedIssuer {
        require(didRegistry[subject].status == DIDStatus.Active, "CAIRegistry: subject DID not active");
        require(credentials[credentialHash].issuedAt == 0, "CAIRegistry: credential already exists");
        require(expiresAt > block.timestamp, "CAIRegistry: invalid expiration");

        credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            issuer: msg.sender,
            subject: subject,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            credentialType: credentialType
        });

        didRegistry[subject].credentialHash = credentialHash;
        totalCredentials++;

        emit CredentialIssued(credentialHash, subject, block.timestamp);
    }

    /**
     * @notice Revoke a credential
     * @param credentialHash Hash of credential to revoke
     */
    function revokeCredential(bytes32 credentialHash) external {
        Credential storage cred = credentials[credentialHash];
        require(msg.sender == cred.issuer || msg.sender == admin, "CAIRegistry: unauthorized revocation");
        require(!cred.revoked, "CAIRegistry: already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialHash, block.timestamp);
    }

    /**
     * @notice Verify a credential is valid
     * @param credentialHash Hash to verify
     * @return valid True if credential is valid
     */
    function verifyCredential(bytes32 credentialHash) external view returns (bool valid) {
        Credential storage cred = credentials[credentialHash];

        if (cred.issuedAt == 0) return false;
        if (cred.revoked) return false;
        if (block.timestamp > cred.expiresAt) return false;
        if (didRegistry[cred.subject].status != DIDStatus.Active) return false;

        return true;
    }

    /**
     * @notice Add a trusted issuer
     * @param issuer Address to add
     */
    function addTrustedIssuer(address issuer) external onlyAdmin {
        trustedIssuers[issuer] = true;
        emit TrustedIssuerAdded(issuer);
    }

    /**
     * @notice Remove a trusted issuer
     * @param issuer Address to remove
     */
    function removeTrustedIssuer(address issuer) external onlyAdmin {
        trustedIssuers[issuer] = false;
        emit TrustedIssuerRemoved(issuer);
    }

    /**
     * @notice Get DID record
     * @param did DID address
     */
    function getDID(address did)
        external
        view
        returns (
            address owner,
            string memory didDocument,
            uint256 createdAt,
            uint256 updatedAt,
            DIDStatus status,
            bytes32 credentialHash,
            uint256 nonce
        )
    {
        DIDRecord storage record = didRegistry[did];
        return (
            record.owner,
            record.didDocument,
            record.createdAt,
            record.updatedAt,
            record.status,
            record.credentialHash,
            record.nonce
        );
    }

    /**
     * @notice Increment nonce for replay protection
     * @param did DID address
     */
    function incrementNonce(address did) external onlyDIDOwner(did) {
        didRegistry[did].nonce++;
    }
}
