// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PublicGoodsFund
 * @author AetherPay Team
 * @notice 将外汇价差自动转化为以太坊公共物品融资
 * @dev 每笔交易的价差（AI 预言机汇率 vs 实际执行汇率）自动进入捐赠池
 */
contract PublicGoodsFund is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct DonationRound {
        uint256 roundId;
        uint256 totalDonated;      // 本轮总捐赠额
        uint256 startTime;
        uint256 endTime;
        address[] recipients;      // GitCoin 轮次合约地址
        uint256[] allocations;     // 分配比例（basis points）
        bool distributed;
    }

    struct Contributor {
        address user;
        uint256 totalContributed;  // 累计贡献
        uint256 lastContributionTime;
        bool isVerified;           // 是否为认证商家
    }

    struct PublicGood {
        string name;               // e.g. "Geth Development"
        address recipient;         // ETH 客户端团队地址
        uint256 totalReceived;
        bool isActive;
    }

    // ============ State Variables ============

    // 捐赠轮次
    mapping(uint256 => DonationRound) public donationRounds;
    uint256 public currentRoundId;
    uint256 public roundDuration = 30 days; // 月度捐赠

    // 贡献者追踪
    mapping(address => Contributor) public contributors;
    address[] public contributorList;

    // 公共物品项目
    mapping(uint256 => PublicGood) public publicGoods;
    uint256 public publicGoodsCount;

    // 累计统计
    uint256 public totalLifetimeDonations;
    uint256 public totalTransactions;

    // 支持的代币
    mapping(address => bool) public supportedTokens;

    // 价差累积池
    mapping(address => uint256) public spreadPool; // token => amount

    // ============ Events ============

    event SpreadContributed(
        address indexed contributor,
        address indexed token,
        uint256 aiRate,
        uint256 executionRate,
        uint256 spreadAmount,
        uint256 timestamp
    );

    event RoundCreated(
        uint256 indexed roundId,
        uint256 startTime,
        uint256 endTime,
        address[] recipients
    );

    event DonationDistributed(
        uint256 indexed roundId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event PublicGoodAdded(
        uint256 indexed goodId,
        string name,
        address recipient
    );

    event ContributorBadgeAwarded(
        address indexed contributor,
        string badgeType,
        uint256 totalContributed
    );

    // ============ Constructor ============

    constructor() {
        _createNewRound();
    }

    // ============ Core Functions ============

    /**
     * @notice 🆕 贡献平台费到公共物品基金
     * @param contributor 贡献者地址（支付用户）
     * @param token 代币地址
     * @param amount 费用金额（platform fee donation）
     * @return feeAmount 实际贡献金额
     */
    function contributeFee(
        address contributor,
        address token,
        uint256 amount
    ) external nonReentrant returns (uint256 feeAmount) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be positive");

        // 转入费用到本合约
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // 累积到当前轮次
        spreadPool[token] += amount;
        donationRounds[currentRoundId].totalDonated += amount;

        // 更新贡献者信息
        if (contributors[contributor].totalContributed == 0) {
            contributorList.push(contributor);
        }
        contributors[contributor].totalContributed += amount;
        contributors[contributor].lastContributionTime = block.timestamp;

        // 更新全局统计
        totalLifetimeDonations += amount;
        totalTransactions++;

        // 发放贡献徽章
        _awardBadgeIfEligible(contributor);

        emit SpreadContributed(
            contributor,
            token,
            0, // aiRate (N/A for fee contributions)
            0, // executionRate (N/A for fee contributions)
            amount,
            block.timestamp
        );

        return amount;
    }

    /**
     * @notice 计算并记录价差捐赠
     * @param contributor 贡献者地址（商家）
     * @param token 代币地址
     * @param aiRate AI 预言机推荐汇率（8 decimals）
     * @param executionRate 实际执行汇率（8 decimals）
     * @param tradeAmount 交易金额
     */
    function contributeSpread(
        address contributor,
        address token,
        uint256 aiRate,
        uint256 executionRate,
        uint256 tradeAmount
    ) external nonReentrant returns (uint256 spreadAmount) {
        require(supportedTokens[token], "Token not supported");
        require(executionRate >= aiRate, "Invalid rate comparison");

        // 计算价差（实际汇率 - AI 汇率）* 交易金额
        uint256 spreadBps = ((executionRate - aiRate) * 10000) / aiRate;
        spreadAmount = (tradeAmount * spreadBps) / 10000;

        // 转入价差到本合约
        IERC20(token).safeTransferFrom(msg.sender, address(this), spreadAmount);

        // 累积到当前轮次
        spreadPool[token] += spreadAmount;
        donationRounds[currentRoundId].totalDonated += spreadAmount;

        // 更新贡献者信息
        if (contributors[contributor].totalContributed == 0) {
            contributorList.push(contributor);
        }
        contributors[contributor].totalContributed += spreadAmount;
        contributors[contributor].lastContributionTime = block.timestamp;

        // 更新全局统计
        totalLifetimeDonations += spreadAmount;
        totalTransactions++;

        // 发放贡献徽章
        _awardBadgeIfEligible(contributor);

        emit SpreadContributed(
            contributor,
            token,
            aiRate,
            executionRate,
            spreadAmount,
            block.timestamp
        );

        return spreadAmount;
    }

    /**
     * @notice 分配当前轮次捐赠
     * @dev 只有 owner 可调用，月度执行
     */
    function distributeCurrentRound() external onlyOwner nonReentrant {
        DonationRound storage round = donationRounds[currentRoundId];
        require(block.timestamp >= round.endTime, "Round not ended");
        require(!round.distributed, "Already distributed");
        require(round.recipients.length > 0, "No recipients");

        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < round.allocations.length; i++) {
            totalAllocation += round.allocations[i];
        }
        require(totalAllocation == 10000, "Allocations must sum to 100%");

        // 遍历所有支持的代币进行分配
        address[] memory tokens = _getSupportedTokensList();

        for (uint256 t = 0; t < tokens.length; t++) {
            address token = tokens[t];
            uint256 poolAmount = spreadPool[token];

            if (poolAmount == 0) continue;

            // 按比例分配给各接收方
            for (uint256 i = 0; i < round.recipients.length; i++) {
                uint256 amount = (poolAmount * round.allocations[i]) / 10000;

                if (amount > 0) {
                    IERC20(token).safeTransfer(round.recipients[i], amount);

                    emit DonationDistributed(
                        currentRoundId,
                        round.recipients[i],
                        amount,
                        block.timestamp
                    );
                }
            }

            // 清空池子
            spreadPool[token] = 0;
        }

        round.distributed = true;

        // 创建新轮次
        _createNewRound();
    }

    /**
     * @notice 创建新的捐赠轮次
     */
    function _createNewRound() internal {
        currentRoundId++;

        DonationRound storage newRound = donationRounds[currentRoundId];
        newRound.roundId = currentRoundId;
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + roundDuration;
        newRound.distributed = false;

        emit RoundCreated(
            currentRoundId,
            newRound.startTime,
            newRound.endTime,
            new address[](0)
        );
    }

    /**
     * @notice 设置当前轮次的接收方和分配比例
     * @param recipients 接收方地址列表（GitCoin Matching Pool、EF Grants 等）
     * @param allocations 分配比例（basis points，总和 10000）
     */
    function setRoundRecipients(
        address[] memory recipients,
        uint256[] memory allocations
    ) external onlyOwner {
        require(recipients.length == allocations.length, "Length mismatch");
        require(!donationRounds[currentRoundId].distributed, "Round already distributed");

        donationRounds[currentRoundId].recipients = recipients;
        donationRounds[currentRoundId].allocations = allocations;
    }

    /**
     * @notice 添加公共物品项目
     */
    function addPublicGood(
        string memory name,
        address recipient
    ) external onlyOwner returns (uint256 goodId) {
        goodId = publicGoodsCount++;

        publicGoods[goodId] = PublicGood({
            name: name,
            recipient: recipient,
            totalReceived: 0,
            isActive: true
        });

        emit PublicGoodAdded(goodId, name, recipient);
    }

    /**
     * @notice 发放贡献者徽章
     */
    function _awardBadgeIfEligible(address contributor) internal {
        uint256 total = contributors[contributor].totalContributed;

        // Bronze: $100+
        if (total >= 100 * 1e6 && total < 500 * 1e6) {
            emit ContributorBadgeAwarded(contributor, "Bronze Supporter", total);
        }
        // Silver: $500+
        else if (total >= 500 * 1e6 && total < 2000 * 1e6) {
            emit ContributorBadgeAwarded(contributor, "Silver Supporter", total);
        }
        // Gold: $2000+
        else if (total >= 2000 * 1e6) {
            emit ContributorBadgeAwarded(contributor, "Gold Supporter", total);
        }
    }

    // ============ Admin Functions ============

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    function setRoundDuration(uint256 _duration) external onlyOwner {
        roundDuration = _duration;
    }

    // ============ View Functions ============

    function getContributorInfo(address user) external view returns (
        uint256 totalContributed,
        uint256 lastContributionTime,
        string memory badgeLevel
    ) {
        Contributor memory c = contributors[user];
        totalContributed = c.totalContributed;
        lastContributionTime = c.lastContributionTime;

        if (totalContributed >= 2000 * 1e6) {
            badgeLevel = "Gold";
        } else if (totalContributed >= 500 * 1e6) {
            badgeLevel = "Silver";
        } else if (totalContributed >= 100 * 1e6) {
            badgeLevel = "Bronze";
        } else {
            badgeLevel = "None";
        }
    }

    function getCurrentRoundInfo() external view returns (
        uint256 roundId,
        uint256 totalDonated,
        uint256 startTime,
        uint256 endTime,
        bool distributed
    ) {
        DonationRound memory round = donationRounds[currentRoundId];
        return (
            round.roundId,
            round.totalDonated,
            round.startTime,
            round.endTime,
            round.distributed
        );
    }

    function getTotalContributors() external view returns (uint256) {
        return contributorList.length;
    }

    function _getSupportedTokensList() internal view returns (address[] memory) {
        // 简化实现：返回预定义的代币列表
        address[] memory tokens = new address[](2);
        // 这里应该从 mapping 中动态获取，暂时硬编码
        return tokens;
    }
}
