// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PublicGoodsFundV2
 * @notice 修复版：正确接收和记录来自 PaymentGatewayV2 的捐款
 */
contract PublicGoodsFundV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    // 授权的支付网关（可以发送捐款）
    mapping(address => bool) public authorizedGateways;
    address[] public gatewayList;

    // 贡献者追踪
    mapping(address => uint256) public contributors; // address => total contributed
    address[] public contributorList;

    // 累计统计
    uint256 public totalLifetimeDonations;
    uint256 public totalTransactions;

    // 支持的代币
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    // 代币余额
    mapping(address => uint256) public tokenBalances;

    // ============ Events ============

    event DonationReceived(
        address indexed contributor,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event GatewayAuthorized(address indexed gateway);
    event GatewayRevoked(address indexed gateway);
    event TokenAdded(address indexed token);
    event FundsWithdrawn(address indexed token, uint256 amount, address to);

    // ============ Modifiers ============

    modifier onlyAuthorizedGateway() {
        require(authorizedGateways[msg.sender], "Not authorized gateway");
        _;
    }

    // ============ Constructor ============

    constructor() {}

    // ============ Core Functions ============

    /**
     * @notice 接收来自 PaymentGatewayV2 的捐款
     * @param contributor 贡献者地址（商家或用户）
     * @param token 代币地址
     * @param amount 捐款金额
     */
    function receiveDonation(
        address contributor,
        address token,
        uint256 amount
    ) external onlyAuthorizedGateway nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be > 0");

        // 从调用者（PaymentGateway）接收代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // 更新代币余额
        tokenBalances[token] += amount;

        // 更新贡献者信息
        if (contributors[contributor] == 0) {
            contributorList.push(contributor);
        }
        contributors[contributor] += amount;

        // 更新全局统计
        totalLifetimeDonations += amount;
        totalTransactions++;

        emit DonationReceived(contributor, token, amount, block.timestamp);
    }

    /**
     * @notice 接收价差捐赠（用于跨币种交易的汇率价差）
     * @param contributor 贡献者地址
     * @param token 代币地址
     * @param aiRate AI预测汇率（8位小数）
     * @param executionRate 实际执行汇率（8位小数）
     * @param tradeAmount 交易金额
     */
    function contributeSpread(
        address contributor,
        address token,
        uint256 aiRate,
        uint256 executionRate,
        uint256 tradeAmount
    ) external onlyAuthorizedGateway nonReentrant returns (uint256) {
        require(supportedTokens[token], "Token not supported");
        require(tradeAmount > 0, "Trade amount must be > 0");
        require(aiRate > 0 && executionRate > 0, "Invalid rates");

        // 🆕 真实价差计算
        // 只有当实际汇率优于AI预测汇率时，才捐赠价差
        uint256 donationAmount = 0;

        if (executionRate > aiRate) {
            // 计算价差比例（基点，1 bp = 0.01%）
            // spreadBps = (executionRate - aiRate) * 10000 / aiRate
            uint256 spreadBps = ((executionRate - aiRate) * 10000) / aiRate;

            // 设置上限为100 bps (1%)，防止异常大的价差
            uint256 maxSpreadBps = 100;
            uint256 cappedSpreadBps = spreadBps > maxSpreadBps ? maxSpreadBps : spreadBps;

            // 计算捐赠金额
            donationAmount = (tradeAmount * cappedSpreadBps) / 10000;
        }

        if (donationAmount > 0) {
            // 从调用者接收代币
            IERC20(token).safeTransferFrom(msg.sender, address(this), donationAmount);

            // 更新统计
            tokenBalances[token] += donationAmount;

            if (contributors[contributor] == 0) {
                contributorList.push(contributor);
            }
            contributors[contributor] += donationAmount;

            totalLifetimeDonations += donationAmount;
            totalTransactions++;

            emit DonationReceived(contributor, token, donationAmount, block.timestamp);
        }

        return donationAmount;
    }

    /**
     * @notice 接收平台费捐赠（专门用于处理来自 PaymentGateway 的平台费分成）
     * @param contributor 贡献者地址（支付用户）
     * @param token 代币地址
     * @param feeAmount 平台费捐赠金额
     */
    function contributeFee(
        address contributor,
        address token,
        uint256 feeAmount
    ) external onlyAuthorizedGateway nonReentrant returns (uint256) {
        require(supportedTokens[token], "Token not supported");
        require(feeAmount > 0, "Fee amount must be > 0");

        // 从调用者（PaymentGateway）接收代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), feeAmount);

        // 更新代币余额
        tokenBalances[token] += feeAmount;

        // 更新贡献者信息
        if (contributors[contributor] == 0) {
            contributorList.push(contributor);
        }
        contributors[contributor] += feeAmount;

        // 更新全局统计
        totalLifetimeDonations += feeAmount;
        totalTransactions++;

        emit DonationReceived(contributor, token, feeAmount, block.timestamp);

        return feeAmount;
    }

    // ============ Admin Functions ============

    /**
     * @notice 授权支付网关
     */
    function addAuthorizedGateway(address gateway) external onlyOwner {
        require(gateway != address(0), "Invalid gateway");
        require(!authorizedGateways[gateway], "Already authorized");

        authorizedGateways[gateway] = true;
        gatewayList.push(gateway);

        emit GatewayAuthorized(gateway);
    }

    /**
     * @notice 撤销支付网关授权
     */
    function removeAuthorizedGateway(address gateway) external onlyOwner {
        require(authorizedGateways[gateway], "Not authorized");

        authorizedGateways[gateway] = false;

        // 从列表中移除
        for (uint i = 0; i < gatewayList.length; i++) {
            if (gatewayList[i] == gateway) {
                gatewayList[i] = gatewayList[gatewayList.length - 1];
                gatewayList.pop();
                break;
            }
        }

        emit GatewayRevoked(gateway);
    }

    /**
     * @notice 添加支持的代币
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already supported");

        supportedTokens[token] = true;
        tokenList.push(token);

        emit TokenAdded(token);
    }

    /**
     * @notice 提取捐款到指定地址（用于分配给公共物品项目）
     */
    function withdrawTo(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        require(tokenBalances[token] >= amount, "Insufficient balance");
        require(recipient != address(0), "Invalid recipient");

        tokenBalances[token] -= amount;
        IERC20(token).safeTransfer(recipient, amount);

        emit FundsWithdrawn(token, amount, recipient);
    }

    // ============ View Functions ============

    /**
     * @notice 获取贡献者总数
     */
    function getTotalContributors() external view returns (uint256) {
        return contributorList.length;
    }

    /**
     * @notice 获取授权的网关列表
     */
    function getAuthorizedGateways() external view returns (address[] memory) {
        return gatewayList;
    }

    /**
     * @notice 获取支持的代币列表
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @notice 获取贡献者信息
     */
    function getContributorInfo(address contributor) external view returns (
        uint256 totalContributed,
        string memory level
    ) {
        totalContributed = contributors[contributor];

        if (totalContributed >= 2000 * 1e6) {
            level = "Gold";
        } else if (totalContributed >= 500 * 1e6) {
            level = "Silver";
        } else if (totalContributed >= 100 * 1e6) {
            level = "Bronze";
        } else {
            level = "None";
        }
    }
}