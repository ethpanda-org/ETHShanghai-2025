// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @dev Groth16 验证器接口
 */
interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[12] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title ZKRWARegistry
 * @dev 管理基于零知识证明的RWA身份注册和合规性验证
 * 
 * 核心功能：
 * 1. 用户通过 ZK 证明注册身份（不暴露私密信息）
 * 2. 平台通过查询 commitment 验证用户合规性
 * 3. 支持身份撤销和更新
 */
contract ZKRWARegistry is Ownable, ReentrancyGuard, Pausable {

    // ============ 状态变量 ============
    
    /// @dev Groth16 验证器合约地址
    IGroth16Verifier public verifier;
    
    /// @dev 用户地址 => 身份证明信息
    mapping(address => IdentityProof) public identityProofs;
    
    /// @dev commitment => 是否已使用（防止重放攻击）
    mapping(bytes32 => bool) public usedCommitments;
    
    /// @dev nullifier => 是否已使用（防止双花）
    mapping(bytes32 => bool) public usedNullifiers;
    
    /// @dev 平台名称 => 平台要求
    mapping(string => PlatformRequirements) public platformRequirements;
    
    /// @dev 注册统计
    uint256 public totalRegistrations;
    uint256 public activeUsers;
    
    // ============ 结构体 ============
    
    /**
     * @dev 身份证明信息
     */
    struct IdentityProof {
        bytes32 commitment;         // 身份承诺（Poseidon hash）
        bytes32 nullifierHash;      // nullifier hash（防止重复使用）
        uint256 timestamp;          // 注册时间戳
        uint256 expiresAt;          // 过期时间
        string provider;            // KYC 提供商（如 "baidu"）
        bool isActive;              // 是否激活
        bool isRevoked;             // 是否已撤销
    }
    
    /**
     * @dev 平台合规要求
     */
    struct PlatformRequirements {
        uint8 minAge;               // 最小年龄
        uint16 allowedCountry;      // 允许的国家代码（ISO 3166-1 numeric）
        uint256 minAssets;          // 最小资产要求（单位：USD）
        bool isActive;              // 是否激活
    }
    
    // ============ 事件 ============
    
    event IdentityRegistered(
        address indexed user,
        bytes32 indexed commitment,
        bytes32 indexed nullifierHash,
        string provider,
        uint256 expiresAt
    );
    
    event IdentityRevoked(
        address indexed user,
        bytes32 indexed commitment,
        uint256 timestamp
    );
    
    event IdentityUpdated(
        address indexed user,
        bytes32 indexed oldCommitment,
        bytes32 indexed newCommitment,
        uint256 newExpiresAt
    );
    
    event PlatformRequirementsSet(
        string indexed platform,
        uint8 minAge,
        uint16 allowedCountry,
        uint256 minAssets
    );
    
    event VerifierUpdated(
        address indexed oldVerifier,
        address indexed newVerifier,
        uint256 timestamp
    );
    
    // ============ 修饰符 ============
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    modifier identityExists(address _user) {
        require(identityProofs[_user].isActive, "Identity not found");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(address _verifier) Ownable(msg.sender) {
        require(_verifier != address(0), "Invalid verifier address");
        verifier = IGroth16Verifier(_verifier);
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice 注册或更新用户身份证明
     * @param proofA ZK 证明部分 A
     * @param proofB ZK 证明部分 B
     * @param proofC ZK 证明部分 C
     * @param pubSignals 公共信号 [commitment, nullifierHash, isCompliant, minAge, allowedCountry, minKycLevel, minNetWorth, minLiquidAssets, requireAccredited, minIncome, walletAddress, timestamp]
     * @param provider KYC 提供商标识
     * @param expiresAt 凭证过期时间
     */
    function registerIdentity(
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[12] calldata pubSignals,
        string calldata provider,
        uint256 expiresAt
    ) external nonReentrant whenNotPaused {
        // Validate parameters
        require(expiresAt > block.timestamp, "Invalid expiration time");
        require(bytes(provider).length > 0, "Provider cannot be empty");
        
        // Extract public signals
        bytes32 commitment = bytes32(pubSignals[0]);
        bytes32 nullifierHash = bytes32(pubSignals[1]);
        bool isCompliant = pubSignals[2] == 1;
        address walletAddress = address(uint160(pubSignals[10]));
        uint256 timestamp = pubSignals[11];
        
        // Verify caller address matches proof
        require(walletAddress == msg.sender, "Address mismatch");
        
        // Check uniqueness
        require(!usedCommitments[commitment], "Commitment already used");
        require(!usedNullifiers[nullifierHash], "Nullifier already used");
        
        // Validate timestamp (5 minute tolerance)
        require(timestamp <= block.timestamp + 300, "Timestamp too far in future");
        if (block.timestamp >= 300) {
            require(timestamp >= block.timestamp - 300, "Timestamp too old");
        }
        
        // Verify compliance
        require(isCompliant, "Not compliant");
        
        // Verify ZK proof
        bool isValid = verifier.verifyProof(proofA, proofB, proofC, pubSignals);
        require(isValid, "Invalid ZK proof");
        
        // Update statistics
        bool isNewUser = !identityProofs[msg.sender].isActive;
        if (!isNewUser) {
            bytes32 oldCommitment = identityProofs[msg.sender].commitment;
            emit IdentityUpdated(msg.sender, oldCommitment, commitment, expiresAt);
        } else {
            totalRegistrations++;
            activeUsers++;
        }
        
        // Store identity proof
        identityProofs[msg.sender] = IdentityProof({
            commitment: commitment,
            nullifierHash: nullifierHash,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            provider: provider,
            isActive: true,
            isRevoked: false
        });
        
        // Mark as used
        usedCommitments[commitment] = true;
        usedNullifiers[nullifierHash] = true;
        
        emit IdentityRegistered(msg.sender, commitment, nullifierHash, provider, expiresAt);
    }
    
    /**
     * @notice 撤销用户身份
     * @param user 用户地址
     */
    function revokeIdentity(address user) 
        external 
        onlyOwner 
        validAddress(user) 
        identityExists(user) 
    {
        identityProofs[user].isActive = false;
        identityProofs[user].isRevoked = true;
        activeUsers--;
        
        emit IdentityRevoked(user, identityProofs[user].commitment, block.timestamp);
    }
    
    /**
     * @notice 用户主动撤销自己的身份
     */
    function selfRevokeIdentity() external identityExists(msg.sender) {
        identityProofs[msg.sender].isActive = false;
        identityProofs[msg.sender].isRevoked = true;
        activeUsers--;
        
        emit IdentityRevoked(msg.sender, identityProofs[msg.sender].commitment, block.timestamp);
    }
    
    // ============ 平台管理 ============
    
    /**
     * @notice 设置平台合规要求
     * @param platform 平台名称
     * @param minAge 最小年龄
     * @param allowedCountry 允许的国家代码（ISO 3166-1 numeric，如 CN=156）
     * @param minAssets 最小资产要求
     */
    function setPlatformRequirements(
        string calldata platform,
        uint8 minAge,
        uint16 allowedCountry,
        uint256 minAssets
    ) external onlyOwner {
        require(bytes(platform).length > 0, "Invalid platform name");
        require(minAge >= 18 && minAge <= 120, "Invalid age requirement");
        
        platformRequirements[platform] = PlatformRequirements({
            minAge: minAge,
            allowedCountry: allowedCountry,
            minAssets: minAssets,
            isActive: true
        });
        
        emit PlatformRequirementsSet(platform, minAge, allowedCountry, minAssets);
    }
    
    /**
     * @notice Check if user meets platform requirements
     * @dev On-chain validates identity validity, compliance checked off-chain via ZK proof
     * @param user User address
     * @param platform Platform name
     * @return Whether user meets requirements
     */
    function isPlatformCompliant(address user, string calldata platform) 
        external 
        view 
        returns (bool) 
    {
        IdentityProof memory proof = identityProofs[user];
        
        if (!proof.isActive || proof.isRevoked) {
            return false;
        }
        
        if (block.timestamp > proof.expiresAt) {
            return false;
        }
        
        PlatformRequirements memory requirements = platformRequirements[platform];
        if (!requirements.isActive) {
            return true;
        }
        
        // Detailed compliance checks performed off-chain during proof generation
        return true;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @notice 检查用户是否有有效身份
     * @param user 用户地址
     * @return 是否有效
     */
    function hasValidIdentity(address user) external view returns (bool) {
        IdentityProof memory proof = identityProofs[user];
        return proof.isActive 
            && !proof.isRevoked 
            && block.timestamp <= proof.expiresAt;
    }
    
    /**
     * @notice 获取用户身份信息
     * @param user 用户地址
     * @return 身份证明结构体
     */
    function getIdentityProof(address user) 
        external 
        view 
        returns (IdentityProof memory) 
    {
        return identityProofs[user];
    }
    
    /**
     * @notice 批量检查用户身份
     * @param users 用户地址数组
     * @return 有效性数组
     */
    function batchCheckIdentities(address[] calldata users) 
        external 
        view 
        returns (bool[] memory) 
    {
        bool[] memory results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            IdentityProof memory proof = identityProofs[users[i]];
            results[i] = proof.isActive 
                && !proof.isRevoked 
                && block.timestamp <= proof.expiresAt;
        }
        return results;
    }
    
    /**
     * @notice 获取平台要求
     * @param platform 平台名称
     * @return 平台要求结构体
     */
    function getPlatformRequirements(string calldata platform) 
        external 
        view 
        returns (PlatformRequirements memory) 
    {
        return platformRequirements[platform];
    }
    
    /**
     * @notice 获取统计信息
     * @return total 总注册数
     * @return active 活跃用户数
     */
    function getStats() external view returns (uint256 total, uint256 active) {
        return (totalRegistrations, activeUsers);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @notice 更新验证器合约地址（仅Owner）
     * @dev 用于从Mock验证器切换到真实Groth16验证器，或升级验证器
     * @param _newVerifier 新的验证器合约地址
     */
    function setVerifier(address _newVerifier) external onlyOwner validAddress(_newVerifier) {
        require(_newVerifier != address(verifier), "Verifier already set to this address");
        
        address oldVerifier = address(verifier);
        verifier = IGroth16Verifier(_newVerifier);
        
        emit VerifierUpdated(oldVerifier, _newVerifier, block.timestamp);
    }
    
    /**
     * @notice 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}




