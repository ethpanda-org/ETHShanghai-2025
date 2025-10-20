// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @dev Groth16 验证器接口 (12 个信号)
 */
interface IGroth16Verifier12 {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[12] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @dev Groth16 验证器接口 (16 个信号)
 */
interface IGroth16Verifier16 {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[16] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title ZKRWARegistry Multi-Platform
 * @dev 支持多平台的 RWA 身份注册合约
 * 
 * 核心功能：
 * 1. 支持三个平台：PropertyFy (12信号), RealT (12信号), RealestateIO (16信号)
 * 2. 每个平台使用独立的验证器合约
 * 3. 用户可以在不同平台注册不同的身份证明
 */
contract ZKRWARegistryMultiPlatform is Ownable, ReentrancyGuard, Pausable {

    // ============ 状态变量 ============
    
    /// @dev 平台名称 => 验证器地址 (12信号验证器)
    mapping(string => IGroth16Verifier12) public verifiers12;
    
    /// @dev 平台名称 => 验证器地址 (16信号验证器)  
    mapping(string => IGroth16Verifier16) public verifiers16;
    
    /// @dev 平台名称 => 公共信号数量
    mapping(string => uint8) public platformSignalCounts;
    
    /// @dev 用户地址 => 平台名称 => 身份证明信息
    mapping(address => mapping(string => IdentityProof)) public platformIdentityProofs;
    
    /// @dev commitment => 是否已使用（防止重放攻击）
    mapping(bytes32 => bool) public usedCommitments;
    
    /// @dev nullifier => 是否已使用（防止双花）
    mapping(bytes32 => bool) public usedNullifiers;
    
    /// @dev 注册统计
    uint256 public totalRegistrations;
    uint256 public activeUsers;
    
    // ============ 结构体 ============
    
    /**
     * @dev 身份证明信息
     */
    struct IdentityProof {
        bytes32 commitment;         
        bytes32 nullifierHash;     
        uint256 timestamp;          
        uint256 expiresAt;          
        string provider;            
        bool isActive;              
        bool isRevoked;             
    }
    
    // ============ 事件 ============
    
    event IdentityRegistered(
        address indexed user,
        string indexed platform,
        bytes32 indexed commitment,
        bytes32 nullifierHash,
        string provider,
        uint256 expiresAt
    );
    
    event IdentityRevoked(
        address indexed user,
        string indexed platform,
        bytes32 indexed commitment,
        uint256 timestamp
    );
    
    event PlatformVerifierSet(
        string indexed platform,
        address indexed verifier,
        uint8 signalCount
    );
    
    // ============ 构造函数 ============
    
    constructor(
        address _propertyfyVerifier,
        address _realtVerifier,
        address _realestateVerifier
    ) Ownable(msg.sender) {
        require(_propertyfyVerifier != address(0), "Invalid PropertyFy verifier");
        require(_realtVerifier != address(0), "Invalid RealT verifier");
        require(_realestateVerifier != address(0), "Invalid Realestate verifier");
        
        // PropertyFy 验证器 (12信号)
        verifiers12["propertyfy"] = IGroth16Verifier12(_propertyfyVerifier);
        platformSignalCounts["propertyfy"] = 12;
        
        // RealT 验证器 (12信号)
        verifiers12["realt"] = IGroth16Verifier12(_realtVerifier);
        platformSignalCounts["realt"] = 12;
        
        // RealestateIO 验证器 (16信号)
        verifiers16["realestate"] = IGroth16Verifier16(_realestateVerifier);
        platformSignalCounts["realestate"] = 16;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice 注册或更新用户在特定平台的身份证明
     * @param platform 平台名称 ("propertyfy", "realt", "realestate")
     * @param proofA ZK 证明部分 A
     * @param proofB ZK 证明部分 B
     * @param proofC ZK 证明部分 C
     * @param pubSignals 公共信号数组 (12或16个元素)
     * @param provider KYC 提供商标识
     * @param expiresAt 凭证过期时间
     */
    function registerIdentity(
        string calldata platform,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[] calldata pubSignals,
        string calldata provider,
        uint256 expiresAt
    ) external nonReentrant whenNotPaused {
        // 验证并保存身份证明
        _validateAndRegister(platform, proofA, proofB, proofC, pubSignals, provider, expiresAt);
    }
    
    /**
     * @dev 内部函数：验证并注册身份
     */
    function _validateAndRegister(
        string calldata platform,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[] calldata pubSignals,
        string calldata provider,
        uint256 expiresAt
    ) internal {
        // 基本验证
        require(expiresAt > block.timestamp, "Invalid expiration time");
        require(bytes(provider).length > 0, "Provider cannot be empty");
        require(platformSignalCounts[platform] > 0, "Platform not supported");
        require(pubSignals.length == platformSignalCounts[platform], "Invalid signal count");
        
        // 提取并验证信号
        bytes32 commitment = bytes32(pubSignals[0]);
        bytes32 nullifierHash = bytes32(pubSignals[1]);
        
        require(pubSignals[2] == 1, "Not compliant");
        require(!usedCommitments[commitment], "Commitment already used");
        require(!usedNullifiers[nullifierHash], "Nullifier already used");
        
        // 验证地址和时间戳
        uint256 walletIndex = platformSignalCounts[platform] == 12 ? 10 : 14;
        uint256 timestampIndex = walletIndex + 1;
        
        require(address(uint160(pubSignals[walletIndex])) == msg.sender, "Address mismatch");
        require(pubSignals[timestampIndex] <= block.timestamp + 300, "Timestamp too far");
        
        if (block.timestamp >= 300) {
            require(pubSignals[timestampIndex] >= block.timestamp - 300, "Timestamp too old");
        }
        
        // 验证 ZK 证明
        require(
            _verifyProofByPlatform(platform, proofA, proofB, proofC, pubSignals, platformSignalCounts[platform]),
            "Invalid ZK proof"
        );
        
        // 保存
        _saveIdentityProof(platform, commitment, nullifierHash, provider, expiresAt);
    }
    
    /**
     * @dev 内部函数：保存身份证明
     */
    function _saveIdentityProof(
        string calldata platform,
        bytes32 commitment,
        bytes32 nullifierHash,
        string calldata provider,
        uint256 expiresAt
    ) internal {
        bool isNewUser = !platformIdentityProofs[msg.sender][platform].isActive;
        
        if (!isNewUser) {
            emit IdentityRevoked(msg.sender, platform, platformIdentityProofs[msg.sender][platform].commitment, block.timestamp);
        } else {
            totalRegistrations++;
            activeUsers++;
        }
        
        platformIdentityProofs[msg.sender][platform] = IdentityProof({
            commitment: commitment,
            nullifierHash: nullifierHash,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            provider: provider,
            isActive: true,
            isRevoked: false
        });
        
        usedCommitments[commitment] = true;
        usedNullifiers[nullifierHash] = true;
        
        emit IdentityRegistered(msg.sender, platform, commitment, nullifierHash, provider, expiresAt);
    }
    
    /**
     * @notice 检查用户在特定平台是否有有效身份
     */
    function hasValidIdentity(address user, string calldata platform) external view returns (bool) {
        IdentityProof memory proof = platformIdentityProofs[user][platform];
        return proof.isActive 
            && !proof.isRevoked 
            && block.timestamp <= proof.expiresAt;
    }
    
    /**
     * @notice 向后兼容：检查用户是否有任意平台的有效身份
     */
    function hasValidIdentity(address user) external view returns (bool) {
        // 检查三个主要平台
        string[3] memory platforms = ["propertyfy", "realt", "realestate"];
        
        for (uint i = 0; i < platforms.length; i++) {
            IdentityProof memory proof = platformIdentityProofs[user][platforms[i]];
            if (proof.isActive && !proof.isRevoked && block.timestamp <= proof.expiresAt) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @notice 检查用户是否满足平台要求
     */
    function isPlatformCompliant(address user, string calldata platform) 
        external 
        view 
        returns (bool) 
    {
        IdentityProof memory proof = platformIdentityProofs[user][platform];
        
        if (!proof.isActive || proof.isRevoked) {
            return false;
        }
        
        if (block.timestamp > proof.expiresAt) {
            return false;
        }
        
        return true;
    }
    
    // ============ 内部函数 ============
    
    /**
     * @dev 内部函数：根据平台验证证明
     */
    function _verifyProofByPlatform(
        string calldata platform,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[] calldata pubSignals,
        uint8 expectedSignals
    ) internal view returns (bool) {
        if (expectedSignals == 12) {
            uint256[12] memory signals12;
            for (uint i = 0; i < 12; i++) {
                signals12[i] = pubSignals[i];
            }
            return verifiers12[platform].verifyProof(proofA, proofB, proofC, signals12);
        } else {
            uint256[16] memory signals16;
            for (uint i = 0; i < 16; i++) {
                signals16[i] = pubSignals[i];
            }
            return verifiers16[platform].verifyProof(proofA, proofB, proofC, signals16);
        }
    }
    
    // ============ 管理功能 ============
    
    /**
     * @notice Owner 设置平台验证器
     */
    function setPlatformVerifier(
        string calldata platform,
        address verifierAddress,
        uint8 signalCount
    ) external onlyOwner {
        require(verifierAddress != address(0), "Invalid verifier address");
        require(signalCount == 12 || signalCount == 16, "Invalid signal count");
        
        if (signalCount == 12) {
            verifiers12[platform] = IGroth16Verifier12(verifierAddress);
        } else {
            verifiers16[platform] = IGroth16Verifier16(verifierAddress);
        }
        
        platformSignalCounts[platform] = signalCount;
        
        emit PlatformVerifierSet(platform, verifierAddress, signalCount);
    }
    
    /**
     * @notice 撤销用户在特定平台的身份
     */
    function revokeIdentity(address user, string calldata platform) 
        external 
        onlyOwner 
    {
        require(platformIdentityProofs[user][platform].isActive, "Identity not found");
        
        platformIdentityProofs[user][platform].isActive = false;
        platformIdentityProofs[user][platform].isRevoked = true;
        activeUsers--;
        
        emit IdentityRevoked(user, platform, platformIdentityProofs[user][platform].commitment, block.timestamp);
    }
    
    /**
     * @notice 用户主动撤销自己在特定平台的身份
     */
    function selfRevokeIdentity(string calldata platform) external {
        require(platformIdentityProofs[msg.sender][platform].isActive, "Identity not found");
        
        platformIdentityProofs[msg.sender][platform].isActive = false;
        platformIdentityProofs[msg.sender][platform].isRevoked = true;
        activeUsers--;
        
        emit IdentityRevoked(msg.sender, platform, platformIdentityProofs[msg.sender][platform].commitment, block.timestamp);
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
    
    /**
     * @notice 获取统计信息
     */
    function getStats() external view returns (uint256 total, uint256 active) {
        return (totalRegistrations, activeUsers);
    }
}

