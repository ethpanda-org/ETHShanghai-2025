// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFXPool.sol";
import "./interfaces/IPublicGoodsFund.sol";
import {FXRouter} from "./FXRouter.sol";

// 🆕 AetherOracle Interface
interface IAetherOracle {
    function getLatestRate(string memory pair) external view returns (
        uint256 rate,
        uint256 confidence,
        uint256 timestamp,
        bool isValid
    );
}

/**
 * @title PaymentGatewayV2
 * @notice 改进版支付网关 - 支持订单管理 + 公益价差捐赠
 * @dev 新增订单索引、批量查询、分页功能、PublicGoodsFund集成
 */
contract PaymentGatewayV2 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_FEE_RATE = 1000;
    uint256 private constant DEFAULT_FEE_RATE = 20;  // 🆕 降低到 0.2% (更有竞争力)
    uint256 private constant STABLE_FEE_RATE = 10;  // 🆕 稳定币费率 0.1%
    uint256 private constant CRYPTO_FEE_RATE = 20;  // 🆕 加密货币费率 0.2%
    uint256 private constant ORDER_EXPIRY_TIME = 24 hours; // 🆕 延长到 24 小时（测试用）
    uint256 private constant MAX_BATCH_SIZE = 50; // 批量查询上限

    // ============ Enums ============
    enum OrderStatus {
        PENDING,
        PAID,
        PROCESSING,
        COMPLETED,
        CANCELLED,
        EXPIRED
    }

    // ============ Structs ============
    struct Merchant {
        address wallet;
        string businessName;
        uint256 totalOrders;
        uint256 totalVolume;
        uint256 pendingBalance;
        mapping(address => uint256) balances;
        uint256 feeRate;
        bool isActive;
        uint256 registeredAt;
    }

    struct Order {
        bytes32 orderId;           // ✅ 改用 bytes32 节省 Gas
        address merchant;
        address payer;
        uint256 orderAmount;
        address paymentToken;
        address settlementToken;
        uint256 paidAmount;
        uint256 receivedAmount;
        uint256 exchangeRate;
        uint256 platformFee;
        uint256 merchantFee;
        uint256 createdAt;
        uint256 paidAt;
        uint256 expiryTime;
        OrderStatus status;
        string metadataURI;        // 🆕 IPFS CID for order metadata (description, buyerEmail, etc.)
        bool allowPartialPayment;  // 🆕 是否允许部分支付
    }

    // 📊 订单查询优化结构
    struct OrderView {
        bytes32 orderId;
        string orderIdString;      // 前端展示用
        address merchant;
        address payer;
        uint256 orderAmount;
        address paymentToken;
        address settlementToken;
        uint256 paidAmount;
        uint256 receivedAmount;
        OrderStatus status;
        uint256 createdAt;
        uint256 paidAt;
        string metadataURI;        // 🆕 IPFS CID
    }

    // ============ State Variables ============

    mapping(address => Merchant) public merchants;
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => string) public orderIdStrings; // bytes32 => 原始字符串
    mapping(string => bytes32) public stringToBytes32OrderId; // ✅ 新增：字符串 => bytes32 映射

    // ✅ 新增：订单索引系统
    mapping(address => bytes32[]) public merchantOrderIds;                           // 商家所有订单
    mapping(address => mapping(OrderStatus => bytes32[])) public merchantOrdersByStatus; // 按状态分类
    mapping(address => uint256) public merchantOrderCount;                           // 订单总数（包含已删除）

    mapping(address => bool) public supportedTokens;

    FXRouter public fxRouter;
    address public treasuryAddress;
    address public donationAddress;
    uint256 public platformFeeRate;
    uint256 public donationPercentage;

    // 🆕 PublicGoodsFund & Oracle Integration
    IPublicGoodsFund public publicGoodsFund;
    IAetherOracle public aetherOracle;
    bool public enableSpreadDonation;  // 可开关的价差捐赠功能

    uint256 public totalOrdersCount;
    uint256 public totalVolumeUSD;

    // 🆕 Token symbol mapping for trading pairs
    mapping(address => string) public tokenSymbols;

    // 🆕 Stablecoin tracking for dynamic fee adjustment
    mapping(address => bool) public isStablecoin;

    // ============ Events ============

    event MerchantRegistered(address indexed merchant, string businessName, uint256 timestamp);
    event MerchantStatusUpdated(address indexed merchant, bool isActive);
    event OrderCreated(
        bytes32 indexed orderId,
        string orderIdString,
        address indexed merchant,
        address indexed designatedPayer,  // 🆕 指定买家地址
        uint256 orderAmount,
        address paymentToken,
        address settlementToken,
        string metadataURI        // 🆕 IPFS CID
    );
    event PaymentReceived(
        bytes32 indexed orderId,
        address indexed payer,
        uint256 amount,
        address token
    );
    event OrderCompleted(
        bytes32 indexed orderId,
        address indexed merchant,
        uint256 receivedAmount,
        uint256 platformFee
    );
    event OrderCancelled(bytes32 indexed orderId, string reason);
    event OrderRefunded(bytes32 indexed orderId, address indexed payer, uint256 amount); // 🆕 退款事件
    event MerchantWithdrawal(address indexed merchant, address token, uint256 amount);
    event DonationProcessed(address indexed recipient, uint256 amount);

    // 🆕 Spread Donation Events
    event SpreadDonated(
        bytes32 indexed orderId,
        address indexed merchant,
        uint256 spreadAmount,
        uint256 aiRate,
        uint256 executionRate
    );
    event PublicGoodsFundUpdated(address indexed oldFund, address indexed newFund);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // ============ Modifiers ============

    modifier onlyActiveMerchant() {
        require(merchants[msg.sender].isActive, "Not an active merchant");
        _;
    }

    modifier onlyPendingOrder(bytes32 orderId) {
        require(orders[orderId].status == OrderStatus.PENDING, "Order not pending");
        require(block.timestamp < orders[orderId].expiryTime, "Order expired");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _fxRouter,
        address _treasuryAddress,
        address _donationAddress,
        address _publicGoodsFund,  // 🆕 PublicGoodsFund contract address
        address _aetherOracle      // 🆕 AetherOracle contract address
    ) {
        require(_fxRouter != address(0), "Invalid router");
        require(_treasuryAddress != address(0), "Invalid treasury");
        require(_donationAddress != address(0), "Invalid donation");
        // Note: publicGoodsFund and aetherOracle can be zero initially and set later

        fxRouter = FXRouter(_fxRouter);
        treasuryAddress = _treasuryAddress;
        donationAddress = _donationAddress;
        platformFeeRate = DEFAULT_FEE_RATE;  // 🆕 0.2% 平台费
        donationPercentage = 500;  // 5% of platform fee goes to donation

        // 🆕 Initialize PublicGoodsFund and Oracle (可选)
        if (_publicGoodsFund != address(0)) {
            publicGoodsFund = IPublicGoodsFund(_publicGoodsFund);
            enableSpreadDonation = true;
        }
        if (_aetherOracle != address(0)) {
            aetherOracle = IAetherOracle(_aetherOracle);
        }
    }

    // ============ Merchant Functions ============

    function registerMerchant(string memory businessName) external {
        require(bytes(businessName).length > 0, "Invalid business name");
        require(merchants[msg.sender].wallet == address(0), "Already registered");

        Merchant storage merchant = merchants[msg.sender];
        merchant.wallet = msg.sender;
        merchant.businessName = businessName;
        merchant.feeRate = DEFAULT_FEE_RATE;  // 🆕 默认 0.2% 商家费率
        merchant.isActive = true;
        merchant.registeredAt = block.timestamp;

        emit MerchantRegistered(msg.sender, businessName, block.timestamp);
    }

    function getMerchantInfo(address merchant) external view returns (
        string memory businessName,
        uint256 totalOrders,
        uint256 totalVolume,
        uint256 pendingBalance,
        uint256 feeRate,
        bool isActive
    ) {
        Merchant storage m = merchants[merchant];
        return (
            m.businessName,
            m.totalOrders,
            m.totalVolume,
            m.pendingBalance,
            m.feeRate,
            m.isActive
        );
    }

    // ============ Order Functions ============

    /**
     * @notice ✅ 创建订单（改进版）
     * @param orderIdString 订单ID字符串
     * @param orderAmount 订单金额
     * @param paymentToken 支付代币地址
     * @param settlementToken 结算代币地址
     * @param metadataURI IPFS CID containing order metadata (description, buyerEmail, etc.)
     * @param allowPartialPayment 是否允许部分支付
     * @param designatedPayer 指定买家地址（address(0) 表示公开订单，任何人都可以支付）
     */
    function createOrder(
        string memory orderIdString,
        uint256 orderAmount,
        address paymentToken,
        address settlementToken,
        string memory metadataURI,
        bool allowPartialPayment,  // 🆕 部分支付标志
        address designatedPayer     // 🆕 指定买家地址
    ) external onlyActiveMerchant returns (bytes32) {
        require(bytes(orderIdString).length > 0, "Invalid order ID");
        require(orderAmount > 0, "Invalid amount");
        require(supportedTokens[paymentToken], "Payment token not supported");
        require(supportedTokens[settlementToken], "Settlement token not supported");

        // ✅ 检查订单字符串是否已被使用
        require(stringToBytes32OrderId[orderIdString] == bytes32(0), "Order ID string already used");

        // 转换为 bytes32
        bytes32 orderId = keccak256(abi.encodePacked(orderIdString, msg.sender, block.timestamp));
        require(orders[orderId].merchant == address(0), "Order ID exists");

        Order storage order = orders[orderId];
        order.orderId = orderId;
        order.merchant = msg.sender;
        order.payer = designatedPayer;  // 🆕 设置指定买家（address(0) 表示公开订单）
        order.orderAmount = orderAmount;
        order.paymentToken = paymentToken;
        order.settlementToken = settlementToken;
        order.createdAt = block.timestamp;
        order.expiryTime = block.timestamp + ORDER_EXPIRY_TIME;
        order.status = OrderStatus.PENDING;
        order.metadataURI = metadataURI;  // 🆕 Save IPFS CID
        order.allowPartialPayment = allowPartialPayment;  // 🆕 设置部分支付标志

        // 保存原始字符串和双向映射
        orderIdStrings[orderId] = orderIdString;
        stringToBytes32OrderId[orderIdString] = orderId; // ✅ 添加字符串到 bytes32 映射

        // ✅ 添加到索引
        merchantOrderIds[msg.sender].push(orderId);
        merchantOrdersByStatus[msg.sender][OrderStatus.PENDING].push(orderId);
        merchantOrderCount[msg.sender]++;

        emit OrderCreated(orderId, orderIdString, msg.sender, designatedPayer, orderAmount, paymentToken, settlementToken, metadataURI);
        return orderId;
    }

    /**
     * @notice ✅ 批量获取商家订单（分页）
     * @param merchant 商家地址
     * @param offset 起始索引
     * @param limit 每页数量（最大 50）
     */
    function getMerchantOrders(
        address merchant,
        uint256 offset,
        uint256 limit
    ) external view returns (OrderView[] memory) {
        require(limit > 0 && limit <= MAX_BATCH_SIZE, "Invalid limit");

        bytes32[] storage orderIds = merchantOrderIds[merchant];
        uint256 total = orderIds.length;

        if (offset >= total) {
            return new OrderView[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        OrderView[] memory result = new OrderView[](size);

        for (uint256 i = 0; i < size; i++) {
            bytes32 orderId = orderIds[offset + i];
            Order storage order = orders[orderId];

            result[i] = OrderView({
                orderId: orderId,
                orderIdString: orderIdStrings[orderId],
                merchant: order.merchant,
                payer: order.payer,
                orderAmount: order.orderAmount,
                paymentToken: order.paymentToken,
                settlementToken: order.settlementToken,
                paidAmount: order.paidAmount,
                receivedAmount: order.receivedAmount,
                status: order.status,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
                metadataURI: order.metadataURI  // 🆕 Include IPFS CID
            });
        }

        return result;
    }

    /**
     * @notice ✅ 按状态获取订单ID列表
     */
    function getMerchantOrdersByStatus(
        address merchant,
        OrderStatus status
    ) external view returns (bytes32[] memory) {
        return merchantOrdersByStatus[merchant][status];
    }

    /**
     * @notice ✅ 获取商家订单总数
     */
    function getMerchantOrderCount(address merchant) external view returns (uint256) {
        return merchantOrderIds[merchant].length;
    }

    /**
     * @notice ✅ 按状态统计订单数量
     */
    function getOrderCountByStatus(
        address merchant,
        OrderStatus status
    ) external view returns (uint256) {
        return merchantOrdersByStatus[merchant][status].length;
    }

    /**
     * @notice ✅ 获取单个订单详情
     */
    function getOrder(bytes32 orderId) external view returns (
        address merchant,
        address payer,
        uint256 orderAmount,
        uint256 paidAmount,
        uint256 receivedAmount,
        OrderStatus status,
        uint256 createdAt,
        uint256 expiryTime,
        string memory metadataURI  // 🆕 IPFS CID
    ) {
        Order storage order = orders[orderId];
        return (
            order.merchant,
            order.payer,
            order.orderAmount,
            order.paidAmount,
            order.receivedAmount,
            order.status,
            order.createdAt,
            order.expiryTime,
            order.metadataURI
        );
    }

    /**
     * @notice 🆕 获取订单元数据URI (IPFS CID)
     */
    function getOrderMetadataURI(bytes32 orderId) external view returns (string memory) {
        return orders[orderId].metadataURI;
    }

    /**
     * @notice ✅ 通过字符串查询订单（完整实现）
     */
    function getOrderByString(string memory orderIdString) external view returns (
        bytes32 orderId,
        address merchant,
        address payer,
        uint256 orderAmount,
        OrderStatus status
    ) {
        // 通过映射直接查询
        orderId = stringToBytes32OrderId[orderIdString];
        require(orderId != bytes32(0), "Order not found");

        Order storage order = orders[orderId];
        return (
            orderId,
            order.merchant,
            order.payer,
            order.orderAmount,
            order.status
        );
    }

    /**
     * @notice 🆕 通过字符串查询订单完整详情（用于支付页面）
     * @dev 返回支付页面所需的所有订单信息，包括 paymentToken 和 settlementToken
     */
    function getOrderDetailsByString(string memory orderIdString) external view returns (
        bytes32 orderId,
        address merchant,
        address payer,
        uint256 orderAmount,
        address paymentToken,
        address settlementToken,
        uint256 paidAmount,
        uint256 receivedAmount,
        OrderStatus status,
        uint256 createdAt,
        uint256 expiryTime,
        string memory metadataURI
    ) {
        // 通过映射直接查询
        orderId = stringToBytes32OrderId[orderIdString];
        require(orderId != bytes32(0), "Order not found");

        Order storage order = orders[orderId];
        return (
            orderId,
            order.merchant,
            order.payer,
            order.orderAmount,
            order.paymentToken,
            order.settlementToken,
            order.paidAmount,
            order.receivedAmount,
            order.status,
            order.createdAt,
            order.expiryTime,
            order.metadataURI
        );
    }

    /**
     * @notice ✅ 处理支付（更新索引 + 部分支付支持）
     */
    function processPayment(
        bytes32 orderId,
        uint256 paymentAmount
    ) external nonReentrant whenNotPaused onlyPendingOrder(orderId) returns (bool) {
        Order storage order = orders[orderId];
        require(paymentAmount > 0, "Invalid payment amount");

        // 🆕 部分支付逻辑
        if (order.allowPartialPayment) {
            require(order.paidAmount + paymentAmount <= order.orderAmount, "Payment exceeds order amount");
        } else {
            require(paymentAmount == order.orderAmount, "Must pay full amount");
        }

        // 🆕 验证买家权限
        if (order.payer != address(0)) {
            // 定向订单：只有指定买家可以支付
            require(msg.sender == order.payer, "Only designated payer can pay this order");
        }
        // 公开订单（order.payer == address(0)）：任何人都可以支付，第一个支付的人成为 payer

        IERC20(order.paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            paymentAmount
        );

        // 设置 payer（如果是公开订单）
        if (order.payer == address(0)) {
            order.payer = msg.sender;  // 第一个支付的人成为 payer
        }

        // 🆕 累积支付金额
        order.paidAmount += paymentAmount;

        // 仅首次支付记录paidAt
        if (order.paidAt == 0) {
            order.paidAt = block.timestamp;
        }

        emit PaymentReceived(orderId, msg.sender, paymentAmount, order.paymentToken);

        // 🆕 只有当支付金额达到订单金额时，才执行支付处理
        if (order.paidAmount >= order.orderAmount) {
            // ✅ 更新状态索引
            _removeFromStatusIndex(order.merchant, orderId, OrderStatus.PENDING);
            order.status = OrderStatus.PAID;
            _addToStatusIndex(order.merchant, orderId, OrderStatus.PAID);

            _executePayment(orderId);
        }
        // 否则保持PENDING状态，等待后续支付

        return true;
    }

    /**
     * @notice ✅ 取消订单（更新索引）
     */
    function cancelOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.merchant || msg.sender == owner(),
            "Not authorized"
        );
        require(
            order.status == OrderStatus.PENDING,
            "Cannot cancel"
        );

        // ✅ 更新状态索引
        _removeFromStatusIndex(order.merchant, orderId, OrderStatus.PENDING);
        order.status = OrderStatus.CANCELLED;
        _addToStatusIndex(order.merchant, orderId, OrderStatus.CANCELLED);

        emit OrderCancelled(orderId, "Cancelled by merchant");
    }

    /**
     * @notice 🆕 退款功能 - 商家或管理员可退款已支付/处理中的订单
     */
    function refundOrder(bytes32 orderId) external {
        Order storage order = orders[orderId];

        require(
            msg.sender == order.merchant || msg.sender == owner(),
            "Not authorized"
        );
        require(
            order.status == OrderStatus.PAID || order.status == OrderStatus.PROCESSING,
            "Cannot refund: order must be PAID or PROCESSING"
        );
        require(order.paidAmount > 0, "No payment to refund");
        require(order.payer != address(0), "No payer found");

        // 退还支付的Token给买家
        IERC20(order.paymentToken).safeTransfer(order.payer, order.paidAmount);

        // 更新状态索引
        _removeFromStatusIndex(order.merchant, orderId, order.status);
        order.status = OrderStatus.CANCELLED;
        _addToStatusIndex(order.merchant, orderId, OrderStatus.CANCELLED);

        emit OrderRefunded(orderId, order.payer, order.paidAmount);
        emit OrderCancelled(orderId, "Refunded by merchant");
    }

    // ============ Internal Helper Functions ============

    /**
     * @notice 从状态索引中移除订单
     */
    function _removeFromStatusIndex(
        address merchant,
        bytes32 orderId,
        OrderStatus status
    ) internal {
        bytes32[] storage statusOrders = merchantOrdersByStatus[merchant][status];
        uint256 length = statusOrders.length;

        for (uint256 i = 0; i < length; i++) {
            if (statusOrders[i] == orderId) {
                // 用最后一个元素替换当前元素
                statusOrders[i] = statusOrders[length - 1];
                statusOrders.pop();
                break;
            }
        }
    }

    /**
     * @notice 添加到状态索引
     */
    function _addToStatusIndex(
        address merchant,
        bytes32 orderId,
        OrderStatus status
    ) internal {
        merchantOrdersByStatus[merchant][status].push(orderId);
    }

    /**
     * @notice 执行支付（完整版 - 支持跨币种）
     */
    function _executePayment(bytes32 orderId) internal {
        Order storage order = orders[orderId];

        // ✅ 更新状态索引
        _removeFromStatusIndex(order.merchant, orderId, OrderStatus.PAID);
        order.status = OrderStatus.PROCESSING;
        _addToStatusIndex(order.merchant, orderId, OrderStatus.PROCESSING);

        uint256 amountAfterFees;
        uint256 totalFees;

        if (order.paymentToken == order.settlementToken) {
            // 同币种支付
            order.exchangeRate = 1e8;
            totalFees = _calculateFees(order.paidAmount, order.merchant, order.paymentToken, order.settlementToken);
            amountAfterFees = order.paidAmount - totalFees;
            order.receivedAmount = amountAfterFees;
        } else {
            // 跨币种支付 - 通过 FXRouter 兑换
            // 1. 授权 FXRouter 使用代币
            IERC20(order.paymentToken).approve(address(fxRouter), order.paidAmount);

            // 2. 构建 SwapParams
            // ⚠️ 修复MEV漏洞：设置最小输出保护
            // 计算最小接受金额：订单金额的95%作为保护底线
            uint256 minAcceptableAmount = (order.orderAmount * 95) / 100;

            FXRouter.SwapParams memory swapParams = FXRouter.SwapParams({
                tokenIn: order.paymentToken,
                tokenOut: order.settlementToken,
                amountIn: order.paidAmount,
                minAmountOut: minAcceptableAmount,  // ✅ 修复：至少95%保护，防止MEV攻击
                recipient: address(this),
                deadline: block.timestamp + 300,  // 5 分钟过期
                userData: ""
            });

            // 3. 执行兑换
            try fxRouter.swapExactTokensForTokens(swapParams) returns (uint256 swappedAmount) {
                // 兑换成功
                order.exchangeRate = (swappedAmount * 1e8) / order.paidAmount;
                totalFees = _calculateFees(swappedAmount, order.merchant, order.paymentToken, order.settlementToken);
                amountAfterFees = swappedAmount - totalFees;
                order.receivedAmount = amountAfterFees;

                // 🆕 调用 PublicGoodsFund 进行价差捐赠
                if (
                    enableSpreadDonation &&
                    address(publicGoodsFund) != address(0) &&
                    address(aetherOracle) != address(0)
                ) {
                    _processSpreadDonation(orderId, order);
                }
            } catch {
                // 兑换失败 - 回滚到 PAID 状态
                _removeFromStatusIndex(order.merchant, orderId, OrderStatus.PROCESSING);
                order.status = OrderStatus.PAID;
                _addToStatusIndex(order.merchant, orderId, OrderStatus.PAID);

                // 退款给支付者
                IERC20(order.paymentToken).safeTransfer(order.payer, order.paidAmount);

                revert("Cross-currency swap failed");
            }
        }

        order.platformFee = (totalFees * platformFeeRate) / (platformFeeRate + merchants[order.merchant].feeRate);
        order.merchantFee = totalFees - order.platformFee;

        merchants[order.merchant].balances[order.settlementToken] += amountAfterFees;
        merchants[order.merchant].pendingBalance += amountAfterFees;
        merchants[order.merchant].totalOrders++;
        merchants[order.merchant].totalVolume += order.orderAmount;

        totalOrdersCount++;
        totalVolumeUSD += order.orderAmount;

        // 🆕 传递完整的订单信息，而不是只传费用和代币
        _processDonation(order.platformFee, order.settlementToken, order.payer);

        // ✅ 更新状态索引
        _removeFromStatusIndex(order.merchant, orderId, OrderStatus.PROCESSING);
        order.status = OrderStatus.COMPLETED;
        _addToStatusIndex(order.merchant, orderId, OrderStatus.COMPLETED);

        emit OrderCompleted(orderId, order.merchant, amountAfterFees, order.platformFee);
    }

    /**
     * @notice 计算费用 - 🆕 动态费率版本
     * @dev 稳定币交易费率更低，提高竞争力
     * @param amount 交易金额
     * @param merchant 商家地址
     * @param paymentToken 支付代币
     * @param settlementToken 结算代币
     * @return 总费用
     */
    function _calculateFees(uint256 amount, address merchant, address paymentToken, address settlementToken) internal view returns (uint256) {
        // 动态确定费率（基于代币类型）
        uint256 effectivePlatformFee = platformFeeRate;
        uint256 effectiveMerchantFee = merchants[merchant].feeRate;

        // 如果是稳定币交易，使用优惠费率
        if (_isStablecoinPair(paymentToken, settlementToken)) {
            effectivePlatformFee = STABLE_FEE_RATE;  // 0.1%
            effectiveMerchantFee = STABLE_FEE_RATE;  // 0.1%
        }

        uint256 platformFee = (amount * effectivePlatformFee) / BASIS_POINTS;
        uint256 merchantFee = (amount * effectiveMerchantFee) / BASIS_POINTS;
        return platformFee + merchantFee;
    }

    /**
     * @notice 判断是否为稳定币交易对
     * @param tokenA 代币A地址
     * @param tokenB 代币B地址
     * @return 是否为稳定币对
     */
    function _isStablecoinPair(address tokenA, address tokenB) internal view returns (bool) {
        return isStablecoin[tokenA] || isStablecoin[tokenB];
    }

    /**
     * @notice 处理平台费捐赠 - 修复版：将捐款发送到 PublicGoodsFund
     * @dev 优先使用 PublicGoodsFund.contributeFee()，失败则降级到 donationAddress
     * @param feeAmount 平台费金额
     * @param token 代币地址
     * @param payer 支付者地址（贡献者）
     */
    function _processDonation(uint256 feeAmount, address token, address payer) internal {
        uint256 donationAmount = (feeAmount * donationPercentage) / BASIS_POINTS;
        if (donationAmount > 0) {
            // 优先尝试将捐款发送到 PublicGoodsFund 进行追踪
            if (address(publicGoodsFund) != address(0)) {
                // 先授权 PublicGoodsFund 合约
                IERC20(token).safeApprove(address(publicGoodsFund), 0);
                IERC20(token).safeApprove(address(publicGoodsFund), donationAmount);

                // 🆕 修复：使用订单的 payer 作为贡献者，而不是 tx.origin
                try publicGoodsFund.contributeFee(
                    payer,              // 使用订单中的支付者地址
                    token,              // 代币地址
                    donationAmount      // 平台费捐赠金额
                ) {
                    emit DonationProcessed(address(publicGoodsFund), donationAmount);
                } catch {
                    // 如果 PublicGoodsFund 调用失败，降级到原始地址
                    IERC20(token).safeTransfer(donationAddress, donationAmount);
                    emit DonationProcessed(donationAddress, donationAmount);
                }
            } else {
                // 如果没有设置 PublicGoodsFund，使用原始地址
                IERC20(token).safeTransfer(donationAddress, donationAmount);
                emit DonationProcessed(donationAddress, donationAmount);
            }
        }
    }

    /**
     * @notice 🆕 处理价差捐赠到 PublicGoodsFund
     * @dev 仅在跨币种支付时调用
     */
    function _processSpreadDonation(bytes32 orderId, Order storage order) internal {
        // 1. 获取交易对
        string memory tradingPair = _getTradingPair(order.paymentToken, order.settlementToken);

        // 2. 从预言机获取 AI 推荐汇率
        uint256 aiRate;
        bool isValid;

        try aetherOracle.getLatestRate(tradingPair) returns (
            uint256 _rate,
            uint256 /* confidence */,
            uint256 /* timestamp */,
            bool _isValid
        ) {
            aiRate = _rate;
            isValid = _isValid;
        } catch {
            // 预言机调用失败，跳过价差捐赠
            return;
        }

        // 3. 验证 AI 汇率是否有效
        if (!isValid || aiRate == 0) {
            return;  // AI 汇率无效，跳过价差捐赠
        }

        // 4. 计算价差并调用 PublicGoodsFund
        // 注意：只有当实际汇率 >= AI 汇率时才捐赠（商家获益部分）
        if (order.exchangeRate >= aiRate) {
            // 5. 计算价差金额
            uint256 spreadAmount = ((order.exchangeRate - aiRate) * order.receivedAmount) / (1e8);

            if (spreadAmount > 0 && spreadAmount <= order.receivedAmount / 100) {  // 限制价差不超过 1%
                // 6. 授权 PublicGoodsFund 使用代币
                IERC20(order.settlementToken).approve(address(publicGoodsFund), spreadAmount);

                // 7. 调用 contributeSpread
                try publicGoodsFund.contributeSpread(
                    order.merchant,
                    order.settlementToken,
                    aiRate,
                    order.exchangeRate,
                    order.receivedAmount
                ) returns (uint256 actualSpread) {
                    emit SpreadDonated(orderId, order.merchant, actualSpread, aiRate, order.exchangeRate);
                } catch {
                    // 价差捐赠失败，不影响主流程
                    // 可以记录日志或发出警告事件
                }
            }
        }
    }

    /**
     * @notice 🆕 获取交易对字符串（用于查询预言机）
     * @param tokenIn 输入代币地址
     * @param tokenOut 输出代币地址
     * @return 交易对字符串，如 "ETH/USDC"
     */
    function _getTradingPair(address tokenIn, address tokenOut) internal view returns (string memory) {
        string memory symbolIn = tokenSymbols[tokenIn];
        string memory symbolOut = tokenSymbols[tokenOut];

        // 如果 symbol 未设置，使用地址简写
        if (bytes(symbolIn).length == 0) {
            symbolIn = "UNKNOWN";
        }
        if (bytes(symbolOut).length == 0) {
            symbolOut = "UNKNOWN";
        }

        return string(abi.encodePacked(symbolIn, "/", symbolOut));
    }

    // ============ Withdrawal & Admin Functions ============
    // (保持不变，省略)

    function withdrawMerchantBalance(address token, uint256 amount)
        external
        onlyActiveMerchant
        nonReentrant
    {
        Merchant storage merchant = merchants[msg.sender];
        require(merchant.balances[token] >= amount, "Insufficient balance");

        merchant.balances[token] -= amount;
        merchant.pendingBalance -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit MerchantWithdrawal(msg.sender, token, amount);
    }

    function getMerchantBalance(address merchant, address token) external view returns (uint256) {
        return merchants[merchant].balances[token];
    }

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    function setPlatformFeeRate(uint256 feeRate) external onlyOwner {
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        platformFeeRate = feeRate;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // 🆕 PublicGoodsFund & Oracle Admin Functions

    /**
     * @notice 设置 PublicGoodsFund 合约地址
     */
    function setPublicGoodsFund(address _publicGoodsFund) external onlyOwner {
        require(_publicGoodsFund != address(0), "Invalid address");
        address oldFund = address(publicGoodsFund);
        publicGoodsFund = IPublicGoodsFund(_publicGoodsFund);
        emit PublicGoodsFundUpdated(oldFund, _publicGoodsFund);
    }

    /**
     * @notice 设置 AetherOracle 合约地址
     */
    function setAetherOracle(address _aetherOracle) external onlyOwner {
        require(_aetherOracle != address(0), "Invalid address");
        address oldOracle = address(aetherOracle);
        aetherOracle = IAetherOracle(_aetherOracle);
        emit OracleUpdated(oldOracle, _aetherOracle);
    }

    /**
     * @notice 开关价差捐赠功能
     */
    function setEnableSpreadDonation(bool _enable) external onlyOwner {
        enableSpreadDonation = _enable;
    }

    /**
     * @notice 设置代币符号（用于生成交易对）
     * @param token 代币地址
     * @param symbol 代币符号（如 "USDC", "USDT", "ETH"）
     */
    function setTokenSymbol(address token, string memory symbol) external onlyOwner {
        tokenSymbols[token] = symbol;
    }

    /**
     * @notice 批量设置代币符号
     */
    function setTokenSymbols(address[] memory tokens, string[] memory symbols) external onlyOwner {
        require(tokens.length == symbols.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenSymbols[tokens[i]] = symbols[i];
        }
    }

    /**
     * @notice 🆕 设置稳定币标记
     * @param token 代币地址
     * @param _isStable 是否为稳定币
     */
    function setStablecoin(address token, bool _isStable) external onlyOwner {
        isStablecoin[token] = _isStable;
    }

    /**
     * @notice 🆕 批量设置稳定币
     * @param tokens 代币地址数组
     * @param stableFlags 稳定币标记数组
     */
    function setStablecoins(address[] memory tokens, bool[] memory stableFlags) external onlyOwner {
        require(tokens.length == stableFlags.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            isStablecoin[tokens[i]] = stableFlags[i];
        }
    }

    /**
     * @notice 🆕 设置商家费率（支持动态调整）
     * @param merchant 商家地址
     * @param feeRate 新费率（基点）
     */
    function setMerchantFeeRate(address merchant, uint256 feeRate) external onlyOwner {
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        require(merchants[merchant].wallet != address(0), "Merchant not registered");
        merchants[merchant].feeRate = feeRate;
    }
}
