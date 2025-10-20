// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title DeadManSwitchRegistry
 * @notice EIP-7702 Dead Man's Switch 状态存储合约
 * @dev 独立存储所有 DMS 配置,配合 DeleGator 使用
 */
contract DeadManSwitchRegistry {

    // ============ 数据结构 ============

    struct SwitchConfig {
        address owner;              // EOA 地址
        address beneficiary;        // 受益人地址
        uint256 heartbeatInterval;  // 心跳间隔 (秒)
        uint256 challengePeriod;    // 挑战期 (秒)
        uint256 lastCheckIn;        // 上次心跳时间
        uint256 claimReadyAt;       // 可最终继承时间 (0 = 未发起)
        bool isActive;              // 配置是否启用
    }

    // ============ 状态变量 ============

    /// @notice owner地址 => SwitchConfig
    mapping(address => SwitchConfig) public switches;

    /// @notice beneficiary地址 => owner地址列表
    mapping(address => address[]) public beneficiaryToOwners;

    // ============ 事件 ============

    event SwitchCreated(
        address indexed owner,
        address indexed beneficiary,
        uint256 heartbeatInterval,
        uint256 challengePeriod
    );

    event CheckIn(
        address indexed owner,
        uint256 timestamp
    );

    event ClaimStarted(
        address indexed owner,
        address indexed beneficiary,
        uint256 claimReadyAt
    );

    event ClaimCancelled(
        address indexed owner,
        uint256 timestamp
    );

    event ClaimFinalized(
        address indexed owner,
        address indexed beneficiary,
        uint256 timestamp
    );

    event SwitchDeactivated(
        address indexed owner,
        uint256 timestamp
    );

    // ============ 修饰符 ============

    modifier onlyOwner(address owner) {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyBeneficiary(address owner) {
        require(msg.sender == switches[owner].beneficiary, "NOT_BENEFICIARY");
        _;
    }

    // ============ 核心函数 ============

    /**
     * @notice 创建 Dead Man's Switch 配置
     * @param beneficiary 受益人地址
     * @param heartbeatInterval 心跳间隔(秒)
     * @param challengePeriod 挑战期(秒)
     */
    function createSwitch(
        address beneficiary,
        uint256 heartbeatInterval,
        uint256 challengePeriod
    ) external {
        require(beneficiary != address(0), "ZERO_BENEFICIARY");
        require(beneficiary != msg.sender, "SELF_BENEFICIARY");
        require(heartbeatInterval > 0, "ZERO_INTERVAL");
        require(!switches[msg.sender].isActive, "ALREADY_EXISTS");

        switches[msg.sender] = SwitchConfig({
            owner: msg.sender,
            beneficiary: beneficiary,
            heartbeatInterval: heartbeatInterval,
            challengePeriod: challengePeriod,
            lastCheckIn: block.timestamp,
            claimReadyAt: 0,
            isActive: true
        });

        beneficiaryToOwners[beneficiary].push(msg.sender);

        emit SwitchCreated(msg.sender, beneficiary, heartbeatInterval, challengePeriod);
    }

    /**
     * @notice Owner 心跳签到
     */
    function checkIn() external {
        SwitchConfig storage config = switches[msg.sender];
        require(config.isActive, "NOT_ACTIVE");

        config.lastCheckIn = block.timestamp;
        config.claimReadyAt = 0; // 取消任何进行中的claim

        emit CheckIn(msg.sender, block.timestamp);
    }

    /**
     * @notice 受益人发起继承流程
     * @param owner Owner地址
     */
    function startClaim(address owner) external onlyBeneficiary(owner) {
        SwitchConfig storage config = switches[owner];
        require(config.isActive, "NOT_ACTIVE");
        require(config.claimReadyAt == 0, "CLAIM_IN_PROGRESS");
        require(
            block.timestamp > config.lastCheckIn + config.heartbeatInterval,
            "NOT_EXPIRED"
        );

        config.claimReadyAt = block.timestamp + config.challengePeriod;

        emit ClaimStarted(owner, msg.sender, config.claimReadyAt);
    }

    /**
     * @notice Owner 取消继承流程
     */
    function cancelClaim() external {
        SwitchConfig storage config = switches[msg.sender];
        require(config.isActive, "NOT_ACTIVE");
        require(config.claimReadyAt != 0, "NO_CLAIM");

        config.claimReadyAt = 0;
        config.lastCheckIn = block.timestamp;

        emit ClaimCancelled(msg.sender, block.timestamp);
    }

    /**
     * @notice 标记继承已完成 (由 AssetExecutor 调用)
     * @param owner Owner地址
     */
    function markFinalized(address owner) external {
        SwitchConfig storage config = switches[owner];
        require(config.isActive, "NOT_ACTIVE");
        require(config.claimReadyAt != 0, "NO_CLAIM");
        require(block.timestamp >= config.claimReadyAt, "CHALLENGE_PERIOD");

        emit ClaimFinalized(owner, config.beneficiary, block.timestamp);

        // 继承完成后禁用配置
        config.isActive = false;
    }

    /**
     * @notice Owner 手动禁用配置
     */
    function deactivate() external {
        SwitchConfig storage config = switches[msg.sender];
        require(config.isActive, "NOT_ACTIVE");

        config.isActive = false;

        emit SwitchDeactivated(msg.sender, block.timestamp);
    }

    // ============ 查询函数 ============

    /**
     * @notice 检查是否可以最终继承
     * @param owner Owner地址
     */
    function canFinalize(address owner) external view returns (bool) {
        SwitchConfig memory config = switches[owner];
        return config.isActive
            && config.claimReadyAt != 0
            && block.timestamp >= config.claimReadyAt;
    }

    /**
     * @notice 检查是否已过期
     * @param owner Owner地址
     */
    function isExpired(address owner) external view returns (bool) {
        SwitchConfig memory config = switches[owner];
        return config.isActive
            && block.timestamp > config.lastCheckIn + config.heartbeatInterval;
    }

    /**
     * @notice 获取距离过期的剩余时间
     * @param owner Owner地址
     */
    function timeUntilExpiry(address owner) external view returns (uint256) {
        SwitchConfig memory config = switches[owner];
        if (!config.isActive) return 0;

        uint256 expiryTime = config.lastCheckIn + config.heartbeatInterval;
        if (block.timestamp >= expiryTime) return 0;

        return expiryTime - block.timestamp;
    }

    /**
     * @notice 获取距离继承的剩余时间
     * @param owner Owner地址
     */
    function timeUntilClaim(address owner) external view returns (uint256) {
        SwitchConfig memory config = switches[owner];
        if (!config.isActive || config.claimReadyAt == 0) return 0;
        if (block.timestamp >= config.claimReadyAt) return 0;

        return config.claimReadyAt - block.timestamp;
    }

    /**
     * @notice 获取完整状态
     * @param owner Owner地址
     */
    function getStatus(address owner) external view returns (
        address beneficiary,
        uint256 lastCheckIn,
        uint256 heartbeatInterval,
        uint256 challengePeriod,
        uint256 claimReadyAt,
        bool isActive,
        bool canClaim
    ) {
        SwitchConfig memory config = switches[owner];
        bool _canClaim = config.isActive
            && config.claimReadyAt != 0
            && block.timestamp >= config.claimReadyAt;

        return (
            config.beneficiary,
            config.lastCheckIn,
            config.heartbeatInterval,
            config.challengePeriod,
            config.claimReadyAt,
            config.isActive,
            _canClaim
        );
    }

    /**
     * @notice 获取受益人管理的所有owner列表
     * @param beneficiary 受益人地址
     */
    function getOwnersByBeneficiary(address beneficiary)
        external
        view
        returns (address[] memory)
    {
        return beneficiaryToOwners[beneficiary];
    }
}
