// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/shared/interfaces/AggregatorV3Interface.sol";

/// @title ChainlinkRisk - 链上风险评估模块
/// @notice 集成 Chainlink 预言机获取 Chainanalysis 风险评估数据
/// @dev 提供地址风险评估和转账风险评估功能
contract ChainlinkRisk is Ownable {
    // 风险等级枚举
    enum RiskLevel {
        UNKNOWN,    // 0: 未知风险
        LOW,        // 1: 低风险
        MEDIUM,     // 2: 中等风险
        HIGH,       // 3: 高风险
        BLOCKED     // 4: 被阻止
    }

    // 风险评估数据结构
    struct RiskAssessment {
        RiskLevel level;          // 风险等级
        uint256 score;            // 风险评分 (0-1000, 越高越危险)
        uint256 lastUpdated;      // 最后更新时间
        string reason;            // 风险原因
        bool isBlacklisted;       // 是否在黑名单
    }

    // Chainlink 预言机配置
    struct ChainlinkConfig {
        address riskScoreAggregator;    // 风险评分预言机地址
        address blacklistAggregator;    // 黑名单检查预言机地址
        uint256 heartbeatInterval;      // 心跳间隔 (秒)
        uint256 stalenessThreshold;     // 过期阈值 (秒)
    }

    // 状态变量
    ChainlinkConfig public config;
    mapping(address => RiskAssessment) public riskAssessments;
    mapping(address => bool) public authorizedCallers;

    // 风险阈值配置
    uint256 public maxAllowedRiskScore = 500;      // 最大允许风险评分
    RiskLevel public maxAllowedRiskLevel = RiskLevel.MEDIUM; // 最大允许风险等级

    // 事件
    event RiskAssessmentUpdated(
        address indexed user,
        RiskLevel level,
        uint256 score,
        string reason
    );

    event ChainlinkConfigUpdated(
        address riskScoreAggregator,
        address blacklistAggregator,
        uint256 heartbeatInterval,
        uint256 stalenessThreshold
    );

    event RiskThresholdUpdated(
        uint256 maxAllowedRiskScore,
        RiskLevel maxAllowedRiskLevel
    );

    // 自定义错误
    error UnauthorizedCaller();
    error InvalidAddress();
    error StaleData(uint256 lastUpdate, uint256 threshold);
    error RiskAssessmentFailed(address user, string reason);
    error InvalidRiskThreshold();

    /// @notice 构造函数
    /// @param initialOwner 初始所有者地址
    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedCallers[initialOwner] = true;
    }

    // ========== 管理员功能 ==========

    /// @notice 配置 Chainlink 预言机
    /// @param riskScoreAggregator 风险评分预言机地址
    /// @param blacklistAggregator 黑名单检查预言机地址
    /// @param heartbeatInterval 心跳间隔
    /// @param stalenessThreshold 过期阈值
    function setChainlinkConfig(
        address riskScoreAggregator,
        address blacklistAggregator,
        uint256 heartbeatInterval,
        uint256 stalenessThreshold
    ) external onlyOwner {
        if (riskScoreAggregator == address(0) || blacklistAggregator == address(0)) {
            revert InvalidAddress();
        }

        config = ChainlinkConfig({
            riskScoreAggregator: riskScoreAggregator,
            blacklistAggregator: blacklistAggregator,
            heartbeatInterval: heartbeatInterval,
            stalenessThreshold: stalenessThreshold
        });

        emit ChainlinkConfigUpdated(
            riskScoreAggregator,
            blacklistAggregator,
            heartbeatInterval,
            stalenessThreshold
        );
    }

    /// @notice 设置风险阈值
    /// @param _maxAllowedRiskScore 最大允许风险评分
    /// @param _maxAllowedRiskLevel 最大允许风险等级
    function setRiskThreshold(
        uint256 _maxAllowedRiskScore,
        RiskLevel _maxAllowedRiskLevel
    ) external onlyOwner {
        if (_maxAllowedRiskScore > 1000) {
            revert InvalidRiskThreshold();
        }

        maxAllowedRiskScore = _maxAllowedRiskScore;
        maxAllowedRiskLevel = _maxAllowedRiskLevel;

        emit RiskThresholdUpdated(_maxAllowedRiskScore, _maxAllowedRiskLevel);
    }

    /// @notice 添加/移除授权调用者
    /// @param caller 调用者地址
    /// @param authorized 是否授权
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    // ========== Chainlink 数据更新 ==========

    /// @notice 更新用户风险评估 (仅授权调用者)
    /// @param user 用户地址
    /// @param level 风险等级
    /// @param score 风险评分
    /// @param reason 风险原因
    /// @param isBlacklisted 是否在黑名单
    function updateRiskAssessment(
        address user,
        RiskLevel level,
        uint256 score,
        string memory reason,
        bool isBlacklisted
    ) external {
        if (!authorizedCallers[msg.sender]) {
            revert UnauthorizedCaller();
        }

        riskAssessments[user] = RiskAssessment({
            level: level,
            score: score,
            lastUpdated: block.timestamp,
            reason: reason,
            isBlacklisted: isBlacklisted
        });

        emit RiskAssessmentUpdated(user, level, score, reason);
    }

    /// @notice 从 Chainlink 预言机获取风险评分
    /// @param user 用户地址
    /// @return score 风险评分
    function getRiskScoreFromChainlink(address user) external view returns (uint256 score) {
        if (config.riskScoreAggregator == address(0)) {
            return 0; // 默认低风险
        }

        try AggregatorV3Interface(config.riskScoreAggregator).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // 检查数据是否过期
            if (block.timestamp - updatedAt > config.stalenessThreshold) {
                revert StaleData(updatedAt, config.stalenessThreshold);
            }

            // Chainlink 返回的是 int256，需要转换为 uint256
            score = answer > 0 ? uint256(answer) : 0;
        } catch {
            score = 0; // 预言机调用失败，返回默认值
        }
    }

    /// @notice 从 Chainlink 预言机检查黑名单状态
    /// @param user 用户地址
    /// @return isBlacklisted 是否在黑名单
    function getBlacklistStatusFromChainlink(address user) external view returns (bool isBlacklisted) {
        if (config.blacklistAggregator == address(0)) {
            return false; // 默认不在黑名单
        }

        try AggregatorV3Interface(config.blacklistAggregator).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // 检查数据是否过期
            if (block.timestamp - updatedAt > config.stalenessThreshold) {
                revert StaleData(updatedAt, config.stalenessThreshold);
            }

            // 1 表示在黑名单，0 表示不在
            isBlacklisted = answer == 1;
        } catch {
            isBlacklisted = false; // 预言机调用失败，返回默认值
        }
    }

    // ========== 风险评估查询 ==========

    /// @notice 检查用户是否被允许交易
    /// @param user 用户地址
    /// @return allowed 是否允许
    /// @return reason 拒绝原因
    function isUserAllowed(address user) external view returns (bool allowed, string memory reason) {
        RiskAssessment memory assessment = riskAssessments[user];

        // 如果没有风险评估数据，使用默认策略
        if (assessment.lastUpdated == 0) {
            return (true, "No risk data available, allowing by default");
        }

        // 检查黑名单
        if (assessment.isBlacklisted) {
            return (false, "User is blacklisted");
        }

        // 检查风险等级
        if (assessment.level > maxAllowedRiskLevel) {
            return (false, "Risk level too high");
        }

        // 检查风险评分
        if (assessment.score > maxAllowedRiskScore) {
            return (false, "Risk score too high");
        }

        // 检查数据是否过期
        if (block.timestamp - assessment.lastUpdated > config.stalenessThreshold) {
            return (false, "Risk assessment data is stale");
        }

        return (true, "User is allowed");
    }

    /// @notice 检查转账是否被允许
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    /// @return allowed 是否允许
    /// @return reason 拒绝原因
    function isTransferAllowed(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        // 检查发送方
        (bool fromAllowed, string memory fromReason) = this.isUserAllowed(from);
        if (!fromAllowed) {
            return (false, string(abi.encodePacked("Sender not allowed: ", fromReason)));
        }

        // 检查接收方
        (bool toAllowed, string memory toReason) = this.isUserAllowed(to);
        if (!toAllowed) {
            return (false, string(abi.encodePacked("Recipient not allowed: ", toReason)));
        }

        // 高风险转账金额检查 (可选)
        if (amount > 1000000 * 10**18) { // 超过100万代币的转账
            RiskAssessment memory fromAssessment = riskAssessments[from];
            RiskAssessment memory toAssessment = riskAssessments[to];

            // 对于大额转账，要求更低的风险等级
            if (fromAssessment.level >= RiskLevel.MEDIUM || toAssessment.level >= RiskLevel.MEDIUM) {
                return (false, "High-value transfer requires lower risk level");
            }
        }

        return (true, "Transfer is allowed");
    }

    /// @notice 获取用户的风险评估
    /// @param user 用户地址
    /// @return assessment 风险评估数据
    function getRiskAssessment(address user) external view returns (RiskAssessment memory assessment) {
        assessment = riskAssessments[user];
    }

    /// @notice 批量获取用户风险评估
    /// @param users 用户地址数组
    /// @return assessments 风险评估数组
    function getBatchRiskAssessments(address[] memory users) external view returns (RiskAssessment[] memory assessments) {
        assessments = new RiskAssessment[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            assessments[i] = riskAssessments[users[i]];
        }
    }

    // ========== 应急功能 ==========

    /// @notice 紧急冻结用户 (仅所有者)
    /// @param user 用户地址
    /// @param reason 冻结原因
    function emergencyFreeze(address user, string memory reason) external onlyOwner {
        riskAssessments[user] = RiskAssessment({
            level: RiskLevel.BLOCKED,
            score: 1000,
            lastUpdated: block.timestamp,
            reason: reason,
            isBlacklisted: true
        });

        emit RiskAssessmentUpdated(user, RiskLevel.BLOCKED, 1000, reason);
    }

    /// @notice 清除用户风险评估 (仅所有者)
    /// @param user 用户地址
    function clearRiskAssessment(address user) external onlyOwner {
        delete riskAssessments[user];
        emit RiskAssessmentUpdated(user, RiskLevel.UNKNOWN, 0, "Assessment cleared");
    }
}