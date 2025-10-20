// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
 * @dev RWA Token 接口
 */
interface IRWAToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title ComplianceGateway
 * @dev 完全按照您描述的模式实现
 * 
 * 核心功能：
 * 1. verifyAndExecute() - 一步完成验证和执行
 * 2. 根据平台选择验证器
 * 3. 防重放攻击
 * 4. 记录审计日志（不暴露身份）
 * 
 * 适用场景：
 * - RWA 项目即插即用
 * - 用户提交证明立即获得代币
 * - 完全匿名操作
 */
contract ComplianceGateway is Ownable, ReentrancyGuard {
    
    // ============ 枚举 ============
    
    enum Action {
        MINT_RWA_TOKEN,
        TRANSFER_RWA_TOKEN
    }
    
    // ============ 状态变量 ============
    
    /// @dev 平台名称 => 12信号验证器
    mapping(string => IGroth16Verifier12) public verifiers12;
    
    /// @dev 平台名称 => 16信号验证器
    mapping(string => IGroth16Verifier16) public verifiers16;
    
    /// @dev 平台名称 => 公共信号数量
    mapping(string => uint8) public platformSignalCounts;
    
    /// @dev 证明哈希 => 是否已使用（防重放）
    mapping(bytes32 => bool) public usedProofs;
    
    /// @dev RWA Token 合约地址
    address public rwaTokenAddress;
    
    // ============ 事件 ============
    
    event AuditLog(
        bytes32 indexed proofHash,
        uint256 timestamp,
        Action targetAction,
        address indexed user,
        uint256 amount
    );
    
    event VerifierSet(
        string indexed platform,
        address indexed verifier,
        uint8 signalCount
    );
    
    // ============ 构造函数 ============
    
    constructor(
        address _propertyfyVerifier,
        address _realtVerifier,
        address _realestateVerifier,
        address _rwaToken
    ) Ownable(msg.sender) {
        require(_rwaToken != address(0), "Invalid RWA token");
        
        // 设置验证器
        verifiers12["propertyfy"] = IGroth16Verifier12(_propertyfyVerifier);
        platformSignalCounts["propertyfy"] = 12;
        
        verifiers12["realt"] = IGroth16Verifier12(_realtVerifier);
        platformSignalCounts["realt"] = 12;
        
        verifiers16["realestate"] = IGroth16Verifier16(_realestateVerifier);
        platformSignalCounts["realestate"] = 16;
        
        rwaTokenAddress = _rwaToken;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice Verify ZK proof and execute action
     * @param platform Platform name ("propertyfy", "realt", "realestate")
     * @param proofA ZK proof component A
     * @param proofB ZK proof component B  
     * @param proofC ZK proof component C
     * @param pubSignals Public signals array
     * @param targetAction Action to execute (MINT or TRANSFER)
     * @param amount Token amount
     */
    function verifyAndExecute(
        string calldata platform,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[] calldata pubSignals,
        Action targetAction,
        uint256 amount
    ) external nonReentrant {
        // Select and validate verifier
        uint8 expectedSignals = platformSignalCounts[platform];
        require(expectedSignals > 0, "Platform not supported");
        require(pubSignals.length == expectedSignals, "Invalid signal count");
        
        // Verify ZK proof
        bool isValid = _verifyProof(platform, proofA, proofB, proofC, pubSignals, expectedSignals);
        require(isValid, "Proof verification failed");
        
        // Check compliance status
        require(pubSignals[2] == 1, "Not compliant");
        
        // Prevent replay attacks
        bytes32 proofHash = keccak256(abi.encodePacked(proofA, proofB, proofC, pubSignals));
        require(!usedProofs[proofHash], "Proof already used");
        usedProofs[proofHash] = true;
        
        // Execute target action
        if (targetAction == Action.MINT_RWA_TOKEN) {
            IRWAToken(rwaTokenAddress).mint(msg.sender, amount);
        }
        
        // Record audit log
        emit AuditLog(
            proofHash,
            block.timestamp,
            targetAction,
            msg.sender,
            amount
        );
    }
    
    /**
     * @dev 内部函数：根据平台验证证明
     */
    function _verifyProof(
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
    
    function setRWAToken(address _rwaToken) external onlyOwner {
        require(_rwaToken != address(0), "Invalid address");
        rwaTokenAddress = _rwaToken;
    }
    
    function setVerifier(
        string calldata platform,
        address verifier,
        uint8 signalCount
    ) external onlyOwner {
        require(verifier != address(0), "Invalid verifier");
        require(signalCount == 12 || signalCount == 16, "Invalid signal count");
        
        if (signalCount == 12) {
            verifiers12[platform] = IGroth16Verifier12(verifier);
        } else {
            verifiers16[platform] = IGroth16Verifier16(verifier);
        }
        
        platformSignalCounts[platform] = signalCount;
        
        emit VerifierSet(platform, verifier, signalCount);
    }
}

