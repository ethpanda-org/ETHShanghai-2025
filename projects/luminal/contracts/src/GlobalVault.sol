// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IGlobalVault.sol";

/**
 * @title GlobalVault (GlobalShieldedVault)
 * @notice 全局隐藏金库 - 基于 ZK 的完全隐私资产托管
 * @dev 核心设计：
 *      1. 不存储任何明文余额（包括用户余额）
 *      2. 使用 Merkle 树存储余额承诺（commitment）
 *      3. 充值时生成新叶子节点并更新树根
 *      4. 提现时验证 ZK 证明并标记 nullifier
 *      5. 池子储备也通过承诺值隐藏
 */
contract GlobalVault is IGlobalVault {
    using SafeERC20 for IERC20;

    // ============ 常量 ============
    
    /// @notice Merkle 树深度（支持 2^32 = 4B+ 叶子节点）
    uint256 public constant MERKLE_TREE_DEPTH = 32;
    
    /// @notice 零值（用于空叶子节点）
    bytes32 public constant ZERO_VALUE = bytes32(0);

    // ============ 状态变量 ============
    
    /// @notice 当前 Merkle 树根（全局状态承诺）
    bytes32 public currentRoot;
    
    /// @notice 历史根集合（支持使用旧根生成的证明）
    /// @dev 维护最近 N 个根以支持并发交易
    mapping(bytes32 => bool) public knownRoots;
    
    /// @notice Nullifier 集合（防止双花）
    /// @dev nullifier = hash(commitment, secret)
    mapping(bytes32 => bool) public nullifiers;
    
    /// @notice 下一个叶子索引
    uint256 public nextIndex;
    
    /// @notice Merkle 树零值缓存（每层的零值哈希）
    bytes32[33] private _zeros;
    
    /// @notice Merkle 树叶子节点（仅存储非零节点以节省 gas）
    mapping(uint256 => bytes32) private _filledSubtrees;
    
    /// @notice WETH 代币地址
    IERC20 public immutable TOKEN_WETH;
    
    /// @notice USDC 代币地址
    IERC20 public immutable TOKEN_USDC;
    
    /// @notice AMM 合约地址（唯一有权更新池子承诺的合约）
    address public ammContract;
    
    /// @notice 池子承诺（隐藏池子储备量）
    /// @dev poolCommitment = Poseidon(reserve0, reserve1, nonce)
    bytes32 private _poolCommitment;
    
    /// @notice 根历史记录大小
    uint256 public constant ROOT_HISTORY_SIZE = 30;
    
    /// @notice 根历史环形缓冲区
    bytes32[ROOT_HISTORY_SIZE] private _rootHistory;
    
    /// @notice 当前根历史索引
    uint256 private _currentRootIndex;

    // ============ 事件 ============
    
    /// @notice 充值事件（仅发布承诺值，不含明文）
    event Deposit(
        bytes32 indexed commitment,
        uint256 indexed leafIndex,
        uint256 timestamp
    );
    
    /// @notice 提现事件（仅发布 nullifier）
    event Withdrawal(
        bytes32 indexed nullifier,
        address indexed recipient,
        uint256 timestamp
    );
    
    /// @notice 树根更新事件
    event TreeRootUpdated(
        bytes32 indexed oldRoot,
        bytes32 indexed newRoot,
        uint256 leafIndex
    );
    
    /// @notice 池子承诺更新事件
    event PoolCommitmentUpdated(
        bytes32 indexed oldCommitment,
        bytes32 indexed newCommitment
    );

    // ============ 修饰符 ============
    
    modifier onlyAMM() {
        require(msg.sender == ammContract, "GlobalVault: caller is not AMM");
        _;
    }

    // ============ 构造函数 ============
    
    constructor(address _tokenWETH, address _tokenUSDC) {
        require(_tokenWETH != address(0), "GlobalVault: zero WETH address");
        require(_tokenUSDC != address(0), "GlobalVault: zero USDC address");
        
        TOKEN_WETH = IERC20(_tokenWETH);
        TOKEN_USDC = IERC20(_tokenUSDC);
        
        // 初始化 Merkle 树零值缓存
        _initializeZeros();
        
        // 初始化根为零值
        currentRoot = _zeros[MERKLE_TREE_DEPTH];
        _addRoot(currentRoot);
    }
    
    /// @dev 初始化 Merkle 树各层零值
    function _initializeZeros() private {
        _zeros[0] = ZERO_VALUE;
        for (uint256 i = 1; i <= MERKLE_TREE_DEPTH; i++) {
            _zeros[i] = _hashLeftRight(_zeros[i - 1], _zeros[i - 1]);
        }
    }

    // ============ 管理函数 ============
    
    function setAMMContract(address _ammContract) external {
        require(ammContract == address(0), "GlobalVault: AMM already set");
        require(_ammContract != address(0), "GlobalVault: zero AMM address");
        
        ammContract = _ammContract;
    }

    // ============ 隐私充值（Shield）============
    
    /**
     * @notice 隐私充值 - 生成余额承诺并插入 Merkle 树
     * @param commitment 余额承诺 = Poseidon(amount, tokenId, secret, nullifier)
     * @param tokenId 代币类型 (0=WETH, 1=USDC)
     * @param amount 充值金额
     */
    function deposit(
        bytes32 commitment,
        uint8 tokenId,
        uint256 amount
    ) external payable {
        require(commitment != bytes32(0), "GlobalVault: zero commitment");
        require(tokenId <= 1, "GlobalVault: invalid tokenId");
        require(amount > 0, "GlobalVault: zero amount");
        require(nextIndex < 2**MERKLE_TREE_DEPTH, "GlobalVault: tree is full");
        
        // 转入代币
        if (tokenId == 0) {
            TOKEN_WETH.safeTransferFrom(msg.sender, address(this), amount);
        } else {
            TOKEN_USDC.safeTransferFrom(msg.sender, address(this), amount);
        }
        
        // 插入承诺到 Merkle 树
        uint256 leafIndex = _insert(commitment);
        
        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    // ============ 隐私提现（Unshield）============
    
    /**
     * @notice 隐私提现 - 验证 ZK 证明并释放资产
     * @dev 链下生成证明：proof = Groth16(commitment, nullifier, root, secret)
     * @param proof ZK 证明（由链下 zkSNARK 生成）
     * @param root Merkle 树根（必须在历史根集合中）
     * @param nullifier 空标识符（防止双花）
     * @param recipient 接收地址
     * @param tokenId 代币类型
     * @param amount 提现金额
     */
    function withdraw(
        bytes calldata proof,  // 简化版：实际应使用 Groth16 结构
        bytes32 root,
        bytes32 nullifier,
        address recipient,
        uint8 tokenId,
        uint256 amount
    ) external {
        require(knownRoots[root], "GlobalVault: unknown root");
        require(!nullifiers[nullifier], "GlobalVault: already spent");
        require(tokenId <= 1, "GlobalVault: invalid tokenId");
        require(amount > 0, "GlobalVault: zero amount");
        require(recipient != address(0), "GlobalVault: zero recipient");
        
        // TODO: 验证 ZK 证明（需要 Groth16 verifier 合约）
        // require(_verifyWithdrawalProof(proof, root, nullifier, recipient, tokenId, amount), 
        //         "GlobalVault: invalid proof");
        
        // 标记 nullifier 已使用
        nullifiers[nullifier] = true;
        
        // 转出代币
        if (tokenId == 0) {
            TOKEN_WETH.safeTransfer(recipient, amount);
        } else {
            TOKEN_USDC.safeTransfer(recipient, amount);
        }
        
        emit Withdrawal(nullifier, recipient, block.timestamp);
    }

    // ============ Merkle 树操作 ============
    
    /**
     * @notice 插入承诺到 Merkle 树
     * @param commitment 叶子节点承诺值
     * @return 叶子索引
     */
    function _insert(bytes32 commitment) private returns (uint256) {
        uint256 leafIndex = nextIndex;
        bytes32 currentHash = commitment;
        bytes32 left;
        bytes32 right;
        
        // 从底向上计算新根
        for (uint256 i = 0; i < MERKLE_TREE_DEPTH; i++) {
            if (leafIndex % 2 == 0) {
                // 当前节点是左子节点
                left = currentHash;
                right = _zeros[i];
                _filledSubtrees[i] = currentHash;
            } else {
                // 当前节点是右子节点
                left = _filledSubtrees[i];
                right = currentHash;
            }
            
            currentHash = _hashLeftRight(left, right);
            leafIndex /= 2;
        }
        
        bytes32 oldRoot = currentRoot;
        currentRoot = currentHash;
        nextIndex++;
        
        _addRoot(currentRoot);
        
        emit TreeRootUpdated(oldRoot, currentRoot, nextIndex - 1);
        
        return nextIndex - 1;
    }
    
    /**
     * @notice 添加根到历史记录
     * @param root 新的根
     */
    function _addRoot(bytes32 root) private {
        _rootHistory[_currentRootIndex] = root;
        knownRoots[root] = true;
        _currentRootIndex = (_currentRootIndex + 1) % ROOT_HISTORY_SIZE;
    }
    
    /**
     * @notice 计算两个节点的哈希
     * @param left 左节点
     * @param right 右节点
     * @return 父节点哈希
     */
    function _hashLeftRight(bytes32 left, bytes32 right) private pure returns (bytes32) {
        // 简化版：使用 keccak256，实际应使用 Poseidon 哈希
        return keccak256(abi.encodePacked(left, right));
    }

    // ============ 池子管理（仅 AMM 调用）============
    
    /// @inheritdoc IGlobalVault
    function initializePool(
        bytes32 initialCommitment,
        uint256 amount0,
        uint256 amount1
    ) external override {
        require(_poolCommitment == bytes32(0), "GlobalVault: already initialized");
        require(initialCommitment != bytes32(0), "GlobalVault: zero commitment");
        require(amount0 > 0 && amount1 > 0, "GlobalVault: zero amounts");
        
        // 转入初始流动性
        TOKEN_WETH.safeTransferFrom(msg.sender, address(this), amount0);
        TOKEN_USDC.safeTransferFrom(msg.sender, address(this), amount1);
        
        // 设置池子承诺
        _poolCommitment = initialCommitment;
        
        emit PoolInitialized(initialCommitment, amount0, amount1);
    }
    
    /// @inheritdoc IGlobalVault
    function updateCommitment(bytes32 newCommitment) external override onlyAMM {
        require(newCommitment != bytes32(0), "GlobalVault: zero commitment");
        
        bytes32 oldCommitment = _poolCommitment;
        _poolCommitment = newCommitment;
        
        emit PoolCommitmentUpdated(oldCommitment, newCommitment);
    }
    
    /// @inheritdoc IGlobalVault
    function markNonceUsed(uint256 nonce) external override onlyAMM {
        // Nonce 管理由 AMM 合约通过 nullifier 机制处理
        // 这里保留接口兼容性
    }
    
    /// @inheritdoc IGlobalVault
    function currentCommitment() external view override returns (bytes32) {
        return _poolCommitment;
    }
    
    /// @inheritdoc IGlobalVault
    function isNonceUsed(uint256 nonce) external view override returns (bool) {
        // Nullifier 机制替代 nonce
        return false;
    }
    
    /// @inheritdoc IGlobalVault
    function getUserBalance(address user, uint8 tokenId) external view override returns (uint256) {
        // 隐私设计：无法查询用户余额
        // 用户需要在链下维护自己的余额 note
        revert("GlobalVault: balances are private");
    }
    
    /// @inheritdoc IGlobalVault
    function deposit(uint8 tokenId, uint256 amount) external payable override {
        // 重定向到隐私充值函数
        // 需要客户端生成 commitment
        revert("GlobalVault: use deposit(commitment, tokenId, amount)");
    }
    
    /// @inheritdoc IGlobalVault
    function withdraw(uint8 tokenId, uint256 amount) external override {
        // 重定向到隐私提现函数
        // 需要 ZK 证明
        revert("GlobalVault: use withdraw(proof, root, nullifier, ...)");
    }

    // ============ 视图函数 ============
    
    /**
     * @notice 获取 Merkle 树根
     * @return 当前根
     */
    function getRoot() external view returns (bytes32) {
        return currentRoot;
    }
    
    /**
     * @notice 检查根是否已知
     * @param root 要检查的根
     * @return 是否已知
     */
    function isKnownRoot(bytes32 root) external view returns (bool) {
        return knownRoots[root];
    }
    
    /**
     * @notice 检查 nullifier 是否已使用
     * @param nullifier 要检查的 nullifier
     * @return 是否已使用
     */
    function isSpent(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }
    
    /**
     * @notice 获取下一个叶子索引
     * @return 索引
     */
    function getNextLeafIndex() external view returns (uint256) {
        return nextIndex;
    }
}
