// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Groth16Verifier.sol";

/**
 * @title WealthProofInstance
 * @notice 钱包池实例合约 - 每个用户独立的验资实例
 * @dev 保存钱包池、余额快照，提供证明验证接口
 */
contract WealthProofInstance {
    // ========== 状态变量 ==========
    
    /// @notice 钱包池（32 个地址，不可变）
    address[32] public walletPool;
    
    /// @notice 实例创建者（Bob_proxy）
    address public immutable owner;
    
    /// @notice Groth16 验证器合约
    Groth16Verifier public immutable verifier;
    
    /// @notice 快照结构
    struct Snapshot {
        uint256 blockNumber;   // 快照区块号
        uint256 timestamp;     // 快照时间戳
        uint256[32] balances;  // 32 个地址的余额
        bool exists;           // 快照是否存在
    }
    
    /// @notice 最新快照（只保留一个）
    Snapshot public latestSnapshot;
    
    // ========== 事件 ==========
    
    /// @notice 快照创建事件
    event SnapshotCreated(
        uint256 indexed blockNumber,
        uint256 timestamp,
        uint256 totalBalance
    );
    
    /// @notice 证明验证事件
    event ProofVerified(
        address indexed verifier,
        uint256 threshold,
        bool result,
        uint256 timestamp
    );
    
    // ========== 构造函数 ==========
    
    /**
     * @notice 构造函数 - 初始化钱包池并创建初始快照
     * @param _walletPool 32 个钱包地址
     * @param _verifier Groth16 验证器地址
     * @param _owner 实例创建者
     */
    constructor(
        address[32] memory _walletPool,
        address _verifier,
        address _owner
    ) {
        walletPool = _walletPool;
        verifier = Groth16Verifier(_verifier);
        owner = _owner;
        
        // 自动创建初始快照
        _createSnapshot();
    }
    
    // ========== 核心功能 ==========
    
    /**
     * @notice 手动创建/更新快照
     * @dev 只有 owner 可以调用
     */
    function createSnapshot() external {
        require(msg.sender == owner, "Only owner can create snapshot");
        _createSnapshot();
    }
    
    /**
     * @notice 验证 ZK 证明（view 函数，免费）
     * @param proof ZK 证明数据
     * @param threshold 阈值
     * @return result 验证结果
     */
    function verifyProof(
        bytes calldata proof,
        uint256 threshold
    ) public view returns (bool result) {
        // 检查快照存在
        require(latestSnapshot.exists, "No snapshot available");
        
        // 解析证明数据
        // proof 格式：pA (2 个 uint256) + pB (4 个 uint256) + pC (2 个 uint256)
        require(proof.length == 256, "Invalid proof length"); // 8 * 32 = 256 bytes
        
        uint256[8] memory proofData;
        for (uint256 i = 0; i < 8; i++) {
            proofData[i] = abi.decode(proof[i*32:(i+1)*32], (uint256));
        }
        
        // 构建公开输入
        // TODO: 这里需要根据实际的电路公开输入来构建
        // 公开输入：msghash[4], addresses[32], balances[32], threshold
        uint256[] memory publicInputs = _buildPublicInputs(threshold);
        
        // 调用 Groth16 验证器
        // 这是一个简化版本，实际需要根据 verifier 的接口调整
        // result = verifier.verifyProof(
        //     [proofData[0], proofData[1]],  // pA
        //     [[proofData[2], proofData[3]], [proofData[4], proofData[5]]], // pB
        //     [proofData[6], proofData[7]],  // pC
        //     publicInputs
        // );
        
        // 暂时返回 true 用于开发测试
        // TODO: 集成实际的 Groth16 验证逻辑
        return true;
    }
    
    // ========== 查询函数 ==========
    
    /**
     * @notice 获取钱包池中某个地址
     * @param index 索引（0-31）
     * @return address 钱包地址
     */
    function getWalletAddress(uint256 index) external view returns (address) {
        require(index < 32, "Index out of bounds");
        return walletPool[index];
    }
    
    /**
     * @notice 获取完整的钱包池
     * @return pool 32 个钱包地址
     */
    function getWalletPool() external view returns (address[32] memory) {
        return walletPool;
    }
    
    /**
     * @notice 获取最新快照
     * @return snapshot 快照数据
     */
    function getLatestSnapshot() external view returns (Snapshot memory) {
        return latestSnapshot;
    }
    
    /**
     * @notice 获取快照中某个地址的余额
     * @param index 索引（0-31）
     * @return balance 余额
     */
    function getBalance(uint256 index) external view returns (uint256) {
        require(index < 32, "Index out of bounds");
        require(latestSnapshot.exists, "No snapshot available");
        return latestSnapshot.balances[index];
    }
    
    // ========== 内部辅助函数 ==========
    
    /**
     * @notice 内部函数 - 创建快照
     * @dev 读取钱包池中所有地址的当前余额
     */
    function _createSnapshot() internal {
        uint256[32] memory balances;
        uint256 totalBalance = 0;
        
        // 读取 32 个地址的余额
        for (uint256 i = 0; i < 32; i++) {
            balances[i] = walletPool[i].balance;
            totalBalance += balances[i];
        }
        
        // 更新快照
        latestSnapshot = Snapshot({
            blockNumber: block.number,
            timestamp: block.timestamp,
            balances: balances,
            exists: true
        });
        
        // 发出事件
        emit SnapshotCreated(
            block.number,
            block.timestamp,
            totalBalance
        );
    }
    
    /**
     * @notice 构建公开输入数组
     * @param threshold 阈值
     * @return publicInputs 公开输入数组
     */
    function _buildPublicInputs(
        uint256 threshold
    ) internal view returns (uint256[] memory publicInputs) {
        // TODO: 根据实际的电路公开输入格式构建
        // 公开输入：msghash[4], addresses[32], balances[32], threshold
        
        // 暂时返回空数组
        publicInputs = new uint256[](0);
        
        return publicInputs;
    }
}

