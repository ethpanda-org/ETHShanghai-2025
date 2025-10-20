// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ICompliance.sol";
import "../ZKRWARegistry.sol";

/**
 * @title ZKComplianceModule
 * @dev ZK-based compliance module for ERC-3643 tokens
 * 
 * Features:
 * - Implements ICompliance interface
 * - Compatible with existing ERC-3643 RWA tokens
 * - No modification required to token contracts
 * 
 * Usage:
 * await rwaToken.setComplianceModule(zkComplianceModule.address)
 */
contract ZKComplianceModule is Ownable, ICompliance {
    
    // ============ 状态变量 ============
    
    /// @dev ZKRWARegistry 地址（可以是单平台或多平台版本）
    address public immutable zkRegistry;
    
    /// @dev ComplianceGateway 地址（可选，用于直接执行操作的模式）
    address public complianceGateway;
    
    /// @dev 默认平台名称（如果只服务一个平台）
    string public defaultPlatform;
    
    /// @dev 用户地址 => 他们注册的平台（支持用户在不同平台注册）
    mapping(address => string) public userPlatform;
    
    /// @dev 地址 => 是否已通过 ZK 验证
    mapping(address => bool) public verifiedAddresses;
    
    /// @dev 地址 => 验证过期时间
    mapping(address => uint256) public verificationExpiry;
    
    // ============ 事件 ============
    
    event UserVerified(address indexed user, string platform, uint256 expiresAt);
    event VerificationRevoked(address indexed user, string platform);
    
    // ============ 构造函数 ============
    
    constructor(
        address _zkRegistry,
        address _complianceGateway,
        string memory _defaultPlatform
    ) Ownable(msg.sender) {
        require(_zkRegistry != address(0), "Invalid registry");
        
        zkRegistry = _zkRegistry;
        complianceGateway = _complianceGateway;
        defaultPlatform = _defaultPlatform;
    }
    
    // ============ ICompliance 实现（ERC-3643 钩子）============
    
    /**
     * @notice Check if transfer is allowed (called by ERC-3643 tokens)
     * @dev Implements ICompliance interface
     */
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        // 铸造（from = 0）：只检查接收方
        if (from == address(0)) {
            return isVerified(to);
        }
        
        // 销毁（to = 0）：只检查发送方
        if (to == address(0)) {
            return isVerified(from);
        }
        
        // 普通转账：检查双方
        return isVerified(from) && isVerified(to);
    }
    
    /**
     * @notice 转账后处理（可选）
     */
    function transferred(address from, address to, uint256 amount) external override {
        // 可以记录转账审计日志
        // 但不记录用户真实身份
    }
    
    /**
     * @notice 代币创建后处理（可选）
     */
    function created(address to, uint256 amount) external override {
        // 可以记录铸造审计日志
    }
    
    /**
     * @notice 代币销毁后处理（可选）
     */
    function destroyed(address from, uint256 amount) external override {
        // 可以记录销毁审计日志
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice 检查地址是否已通过 ZK 验证
     */
    function isVerified(address user) public view returns (bool) {
        // 方式 1: 检查本地标记（由 ComplianceGateway 设置）
        if (verifiedAddresses[user] && block.timestamp <= verificationExpiry[user]) {
            return true;
        }
        
        // 方式 2: 查询 ZKRWARegistry（支持多平台）
        try ZKRWARegistry(zkRegistry).hasValidIdentity(user) returns (bool hasIdentity) {
            return hasIdentity;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice 标记用户为已验证（仅 ComplianceGateway 可调用）
     * @dev ComplianceGateway 在验证 ZK 证明后调用此函数
     */
    function markAsVerified(
        address user,
        string calldata platform,
        uint256 durationDays
    ) external {
        require(msg.sender == complianceGateway, "Only Gateway");
        require(user != address(0), "Invalid user");
        
        verifiedAddresses[user] = true;
        verificationExpiry[user] = block.timestamp + (durationDays * 1 days);
        userPlatform[user] = platform;
        
        emit UserVerified(user, platform, verificationExpiry[user]);
    }
    
    /**
     * @notice 撤销用户验证（仅 Owner 或 ComplianceGateway）
     */
    function revokeVerification(address user) external {
        require(
            msg.sender == owner() || msg.sender == complianceGateway,
            "Unauthorized"
        );
        
        string memory platform = userPlatform[user];
        verifiedAddresses[user] = false;
        verificationExpiry[user] = 0;
        
        emit VerificationRevoked(user, platform);
    }
    
    // ============ 管理功能 ============
    
    function setComplianceGateway(address _gateway) external onlyOwner {
        require(_gateway != address(0), "Invalid gateway");
        complianceGateway = _gateway;
    }
    
    function setDefaultPlatform(string calldata _platform) external onlyOwner {
        defaultPlatform = _platform;
    }
}

