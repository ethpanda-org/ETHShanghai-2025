// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./WealthProofInstance.sol";
import "./Groth16Verifier.sol";

/**
 * @title WealthProofRegistry
 * @notice 主注册合约 - 工厂模式管理所有钱包池实例
 * @dev 使用工厂模式创建和管理用户的钱包池实例
 */
contract WealthProofRegistry {
    // ========== 状态变量 ==========
    
    /// @notice Groth16 验证器合约（共享）
    Groth16Verifier public immutable verifier;
    
    /// @notice 用户地址 => 该用户创建的所有实例地址数组
    mapping(address => address[]) public userInstances;
    
    /// @notice 所有实例的数组（用于遍历）
    address[] public allInstances;
    
    /// @notice 验证记录结构
    struct VerificationRecord {
        address instance;       // 实例地址
        address verifier;       // 验证者地址
        uint256 threshold;      // 阈值
        bool result;            // 验证结果
        uint256 timestamp;      // 验证时间
    }
    
    /// @notice 验证历史记录
    VerificationRecord[] public verifications;
    
    // ========== 事件 ==========
    
    /// @notice 实例创建事件
    event InstanceCreated(
        address indexed creator,
        address indexed instance,
        address[32] walletPool,
        uint256 timestamp
    );
    
    /// @notice 证明验证事件
    event ProofVerified(
        address indexed instance,
        address indexed verifier,
        uint256 threshold,
        bool result,
        uint256 timestamp
    );
    
    // ========== 构造函数 ==========
    
    constructor() {
        // 部署 Groth16 验证器（所有实例共享）
        verifier = new Groth16Verifier();
    }
    
    // ========== 核心功能 ==========
    
    /**
     * @notice 创建一个新的钱包池实例
     * @param walletPool 32 个钱包地址（31 个公开地址 + 1 个自己的地址）
     * @return instance 新创建的实例合约地址
     */
    function createProofInstance(
        address[32] calldata walletPool
    ) external returns (address instance) {
        // 验证输入
        require(_validateWalletPool(walletPool), "Invalid wallet pool");
        
        // 部署新的实例合约
        WealthProofInstance newInstance = new WealthProofInstance(
            walletPool,
            address(verifier),
            msg.sender
        );
        
        instance = address(newInstance);
        
        // 记录实例
        userInstances[msg.sender].push(instance);
        allInstances.push(instance);
        
        // 发出事件
        emit InstanceCreated(
            msg.sender,
            instance,
            walletPool,
            block.timestamp
        );
        
        return instance;
    }
    
    /**
     * @notice 验证证明（记录到历史）
     * @param instance 实例合约地址
     * @param proof ZK 证明数据
     * @param threshold 阈值
     * @return result 验证结果
     */
    function verifyAndRecord(
        address instance,
        bytes calldata proof,
        uint256 threshold
    ) external returns (bool result) {
        // 验证实例存在
        require(_isValidInstance(instance), "Instance not found");
        
        // 调用实例合约验证
        WealthProofInstance proofInstance = WealthProofInstance(instance);
        result = proofInstance.verifyProof(proof, threshold);
        
        // 记录验证历史
        verifications.push(VerificationRecord({
            instance: instance,
            verifier: msg.sender,
            threshold: threshold,
            result: result,
            timestamp: block.timestamp
        }));
        
        // 发出事件
        emit ProofVerified(
            instance,
            msg.sender,
            threshold,
            result,
            block.timestamp
        );
        
        return result;
    }
    
    // ========== 查询函数 ==========
    
    /**
     * @notice 获取用户创建的所有实例
     * @param user 用户地址
     * @return instances 实例地址数组
     */
    function getUserInstances(address user) external view returns (address[] memory) {
        return userInstances[user];
    }
    
    /**
     * @notice 获取所有实例
     * @return instances 所有实例地址数组
     */
    function getAllInstances() external view returns (address[] memory) {
        return allInstances;
    }
    
    /**
     * @notice 获取验证历史记录数量
     * @return count 验证记录数量
     */
    function getVerificationCount() external view returns (uint256) {
        return verifications.length;
    }
    
    /**
     * @notice 获取特定实例的验证历史
     * @param instance 实例地址
     * @return records 验证记录数组
     */
    function getInstanceVerifications(
        address instance
    ) external view returns (VerificationRecord[] memory records) {
        // 计算该实例的验证记录数量
        uint256 count = 0;
        for (uint256 i = 0; i < verifications.length; i++) {
            if (verifications[i].instance == instance) {
                count++;
            }
        }
        
        // 构建结果数组
        records = new VerificationRecord[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < verifications.length; i++) {
            if (verifications[i].instance == instance) {
                records[index] = verifications[i];
                index++;
            }
        }
        
        return records;
    }
    
    // ========== 内部辅助函数 ==========
    
    /**
     * @notice 验证钱包池是否有效
     * @param walletPool 钱包池地址数组
     * @return valid 是否有效
     */
    function _validateWalletPool(
        address[32] calldata walletPool
    ) internal pure returns (bool) {
        // 检查是否有重复地址
        for (uint256 i = 0; i < 32; i++) {
            require(walletPool[i] != address(0), "Zero address not allowed");
            for (uint256 j = i + 1; j < 32; j++) {
                if (walletPool[i] == walletPool[j]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * @notice 检查实例是否存在
     * @param instance 实例地址
     * @return exists 是否存在
     */
    function _isValidInstance(address instance) internal view returns (bool) {
        for (uint256 i = 0; i < allInstances.length; i++) {
            if (allInstances[i] == instance) {
                return true;
            }
        }
        return false;
    }
}

