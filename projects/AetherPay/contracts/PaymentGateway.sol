// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFXPool.sol";
import "./FXRouter.sol";

/**
 * @title PaymentGateway
 * @author AetherPay Team
 * @notice Cross-border payment gateway for merchants
 * @dev Integrates with FXRouter and AetherOracle for optimal exchange rates
 */
contract PaymentGateway is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_FEE_RATE = 1000; // 10%
    uint256 private constant DEFAULT_FEE_RATE = 30; // 0.3%
    uint256 private constant ORDER_EXPIRY_TIME = 30 minutes;

    // ============ Enums ============

    enum OrderStatus {
        PENDING,      // Awaiting payment
        PAID,         // Payment received
        PROCESSING,   // Converting tokens
        COMPLETED,    // Order completed
        CANCELLED,    // Order cancelled
        EXPIRED       // Order expired
    }

    // ============ Structs ============

    struct Merchant {
        address wallet;
        string businessName;
        uint256 totalOrders;
        uint256 totalVolume;
        uint256 pendingBalance;
        mapping(address => uint256) balances; // token => amount
        uint256 feeRate;      // Fee rate in basis points
        bool isActive;
        uint256 registeredAt;
    }

    struct Order {
        string orderId;
        address merchant;
        address payer;
        uint256 orderAmount;       // Amount in settlement currency
        address paymentToken;      // Token customer pays with
        address settlementToken;   // Token merchant receives
        uint256 paidAmount;        // Actual amount paid by customer
        uint256 receivedAmount;    // Amount merchant will receive
        uint256 exchangeRate;      // Rate used (8 decimals)
        uint256 platformFee;       // Platform fee charged
        uint256 merchantFee;       // Merchant fee charged
        uint256 createdAt;
        uint256 paidAt;
        uint256 expiryTime;
        OrderStatus status;
    }

    // ============ State Variables ============

    mapping(address => Merchant) public merchants;
    mapping(string => Order) public orders;
    mapping(address => bool) public supportedTokens;

    FXRouter public fxRouter;
    address public treasuryAddress;
    address public donationAddress;
    uint256 public platformFeeRate; // Platform fee in basis points
    uint256 public donationPercentage; // Percentage of fees to donate (in basis points)

    uint256 public totalOrdersCount;
    uint256 public totalVolumeUSD;

    // ============ Events ============

    event MerchantRegistered(address indexed merchant, string businessName, uint256 timestamp);
    event MerchantStatusUpdated(address indexed merchant, bool isActive);
    event OrderCreated(
        string indexed orderId,
        address indexed merchant,
        uint256 orderAmount,
        address paymentToken,
        address settlementToken
    );
    event PaymentReceived(
        string indexed orderId,
        address indexed payer,
        uint256 amount,
        address token
    );
    event OrderCompleted(
        string indexed orderId,
        address indexed merchant,
        uint256 receivedAmount,
        uint256 platformFee
    );
    event OrderCancelled(string indexed orderId, string reason);
    event MerchantWithdrawal(address indexed merchant, address token, uint256 amount);
    event DonationProcessed(address indexed recipient, uint256 amount);

    // ============ Modifiers ============

    modifier onlyActiveMerchant() {
        require(merchants[msg.sender].isActive, "Not an active merchant");
        _;
    }

    modifier onlyPendingOrder(string memory orderId) {
        require(orders[orderId].status == OrderStatus.PENDING, "Order not pending");
        require(block.timestamp < orders[orderId].expiryTime, "Order expired");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _fxRouter,
        address _treasuryAddress,
        address _donationAddress
    ) {
        require(_fxRouter != address(0), "Invalid router");
        require(_treasuryAddress != address(0), "Invalid treasury");
        require(_donationAddress != address(0), "Invalid donation");

        fxRouter = FXRouter(_fxRouter);
        treasuryAddress = _treasuryAddress;
        donationAddress = _donationAddress;
        platformFeeRate = DEFAULT_FEE_RATE;
        donationPercentage = 500; // 5% of fees go to donations
    }

    // ============ Merchant Functions ============

    /**
     * @notice Register as a merchant
     * @param businessName Name of the business
     */
    function registerMerchant(string memory businessName) external {
        require(bytes(businessName).length > 0, "Invalid business name");
        require(merchants[msg.sender].wallet == address(0), "Already registered");

        Merchant storage merchant = merchants[msg.sender];
        merchant.wallet = msg.sender;
        merchant.businessName = businessName;
        merchant.feeRate = DEFAULT_FEE_RATE;
        merchant.isActive = true;
        merchant.registeredAt = block.timestamp;

        emit MerchantRegistered(msg.sender, businessName, block.timestamp);
    }

    /**
     * @notice Update merchant status (admin only)
     * @param merchant Merchant address
     * @param isActive New status
     */
    function updateMerchantStatus(address merchant, bool isActive) external onlyOwner {
        require(merchants[merchant].wallet != address(0), "Merchant not found");
        merchants[merchant].isActive = isActive;

        emit MerchantStatusUpdated(merchant, isActive);
    }

    /**
     * @notice Set merchant fee rate (admin only)
     * @param merchant Merchant address
     * @param feeRate Fee rate in basis points
     */
    function setMerchantFeeRate(address merchant, uint256 feeRate) external onlyOwner {
        require(merchants[merchant].wallet != address(0), "Merchant not found");
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        merchants[merchant].feeRate = feeRate;
    }

    /**
     * @notice Get merchant information
     * @param merchant Merchant address
     */
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
     * @notice Create a new order
     * @param orderId Unique order identifier
     * @param orderAmount Amount in settlement currency
     * @param paymentToken Token to accept for payment
     * @param settlementToken Token to settle to merchant
     */
    function createOrder(
        string memory orderId,
        uint256 orderAmount,
        address paymentToken,
        address settlementToken
    ) external onlyActiveMerchant returns (bool) {
        require(bytes(orderId).length > 0, "Invalid order ID");
        require(orders[orderId].merchant == address(0), "Order ID exists");
        require(orderAmount > 0, "Invalid amount");
        require(supportedTokens[paymentToken], "Payment token not supported");
        require(supportedTokens[settlementToken], "Settlement token not supported");

        Order storage order = orders[orderId];
        order.orderId = orderId;
        order.merchant = msg.sender;
        order.orderAmount = orderAmount;
        order.paymentToken = paymentToken;
        order.settlementToken = settlementToken;
        order.createdAt = block.timestamp;
        order.expiryTime = block.timestamp + ORDER_EXPIRY_TIME;
        order.status = OrderStatus.PENDING;

        emit OrderCreated(orderId, msg.sender, orderAmount, paymentToken, settlementToken);
        return true;
    }

    /**
     * @notice Process payment for an order
     * @param orderId Order identifier
     * @param paymentAmount Amount being paid
     */
    function processPayment(
        string memory orderId,
        uint256 paymentAmount
    ) external nonReentrant whenNotPaused onlyPendingOrder(orderId) returns (bool) {
        Order storage order = orders[orderId];
        require(paymentAmount > 0, "Invalid payment amount");

        // Transfer payment token from payer to contract
        IERC20(order.paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            paymentAmount
        );

        order.payer = msg.sender;
        order.paidAmount = paymentAmount;
        order.paidAt = block.timestamp;
        order.status = OrderStatus.PAID;

        emit PaymentReceived(orderId, msg.sender, paymentAmount, order.paymentToken);

        // Execute the swap and settlement
        _executePayment(orderId);

        return true;
    }

    /**
     * @notice Execute payment conversion and settlement
     * @param orderId Order identifier
     */
    function _executePayment(string memory orderId) internal {
        Order storage order = orders[orderId];
        order.status = OrderStatus.PROCESSING;

        uint256 amountAfterFees;
        uint256 totalFees;

        // If payment token is same as settlement token, no swap needed
        if (order.paymentToken == order.settlementToken) {
            order.exchangeRate = 1e8; // 1:1

            // Calculate fees
            totalFees = _calculateFees(order.paidAmount, order.merchant);
            amountAfterFees = order.paidAmount - totalFees;

            order.receivedAmount = amountAfterFees;
        } else {
            // Need to swap via FXRouter
            // Reset approval first (safety best practice)
            IERC20(order.paymentToken).safeApprove(address(fxRouter), 0);
            IERC20(order.paymentToken).safeApprove(address(fxRouter), order.paidAmount);

            // Calculate minimum amount out (with 1% slippage tolerance)
            uint256 minAmountOut = (order.orderAmount * 99) / 100;

            FXRouter.SwapParams memory swapParams = FXRouter.SwapParams({
                tokenIn: order.paymentToken,
                tokenOut: order.settlementToken,
                amountIn: order.paidAmount,
                minAmountOut: minAmountOut,
                recipient: address(this),
                deadline: block.timestamp + 300,
                userData: ""
            });

            uint256 amountOut = fxRouter.swapExactTokensForTokens(swapParams);

            // Reset approval after swap (security best practice)
            IERC20(order.paymentToken).safeApprove(address(fxRouter), 0);

            // Calculate exchange rate (8 decimals)
            order.exchangeRate = (amountOut * 1e8) / order.paidAmount;

            // Calculate fees on output amount
            totalFees = _calculateFees(amountOut, order.merchant);
            amountAfterFees = amountOut - totalFees;

            order.receivedAmount = amountAfterFees;
        }

        // Split fees
        order.platformFee = (totalFees * platformFeeRate) / (platformFeeRate + merchants[order.merchant].feeRate);
        order.merchantFee = totalFees - order.platformFee;

        // Credit merchant balance
        merchants[order.merchant].balances[order.settlementToken] += amountAfterFees;
        merchants[order.merchant].pendingBalance += amountAfterFees;
        merchants[order.merchant].totalOrders++;
        merchants[order.merchant].totalVolume += order.orderAmount;

        // Update global stats
        totalOrdersCount++;
        totalVolumeUSD += order.orderAmount;

        // Process donation from platform fees
        _processDonation(order.platformFee, order.settlementToken);

        order.status = OrderStatus.COMPLETED;

        emit OrderCompleted(orderId, order.merchant, amountAfterFees, order.platformFee);
    }

    /**
     * @notice Calculate total fees for an order
     * @param amount Payment amount
     * @param merchant Merchant address
     */
    function _calculateFees(uint256 amount, address merchant) internal view returns (uint256) {
        uint256 platformFee = (amount * platformFeeRate) / BASIS_POINTS;
        uint256 merchantFee = (amount * merchants[merchant].feeRate) / BASIS_POINTS;
        return platformFee + merchantFee;
    }

    /**
     * @notice Cancel an order
     * @param orderId Order identifier
     */
    function cancelOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.merchant || msg.sender == owner(),
            "Not authorized"
        );
        require(
            order.status == OrderStatus.PENDING,
            "Cannot cancel"
        );

        order.status = OrderStatus.CANCELLED;
        emit OrderCancelled(orderId, "Cancelled by merchant");
    }

    /**
     * @notice Expire old pending orders (anyone can call)
     * @param orderId Order identifier
     */
    function expireOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");
        require(block.timestamp >= order.expiryTime, "Order not expired");

        order.status = OrderStatus.EXPIRED;
        emit OrderCancelled(orderId, "Order expired");
    }

    /**
     * @notice Get order details
     * @param orderId Order identifier
     */
    function getOrder(string memory orderId) external view returns (
        address merchant,
        address payer,
        uint256 orderAmount,
        uint256 paidAmount,
        uint256 receivedAmount,
        OrderStatus status,
        uint256 createdAt,
        uint256 expiryTime
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
            order.expiryTime
        );
    }

    // ============ Withdrawal Functions ============

    /**
     * @notice Withdraw merchant balance
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
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

    /**
     * @notice Get merchant balance for a token
     * @param merchant Merchant address
     * @param token Token address
     */
    function getMerchantBalance(address merchant, address token) external view returns (uint256) {
        return merchants[merchant].balances[token];
    }

    // ============ Donation Functions ============

    /**
     * @notice Process donation from platform fees
     * @param feeAmount Fee amount
     * @param token Token address
     */
    function _processDonation(uint256 feeAmount, address token) internal {
        uint256 donationAmount = (feeAmount * donationPercentage) / BASIS_POINTS;

        if (donationAmount > 0) {
            IERC20(token).safeTransfer(donationAddress, donationAmount);
            emit DonationProcessed(donationAddress, donationAmount);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Add supported token
     * @param token Token address
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    /**
     * @notice Remove supported token
     * @param token Token address
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @notice Set platform fee rate
     * @param feeRate Fee rate in basis points
     */
    function setPlatformFeeRate(uint256 feeRate) external onlyOwner {
        require(feeRate <= MAX_FEE_RATE, "Fee rate too high");
        platformFeeRate = feeRate;
    }

    /**
     * @notice Set donation percentage
     * @param percentage Percentage in basis points
     */
    function setDonationPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= BASIS_POINTS, "Invalid percentage");
        donationPercentage = percentage;
    }

    /**
     * @notice Update FXRouter address
     * @param _fxRouter New router address
     */
    function updateFXRouter(address _fxRouter) external onlyOwner {
        require(_fxRouter != address(0), "Invalid router");
        fxRouter = FXRouter(_fxRouter);
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function updateTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasuryAddress = _treasury;
    }

    /**
     * @notice Update donation address
     * @param _donation New donation address
     */
    function updateDonationAddress(address _donation) external onlyOwner {
        require(_donation != address(0), "Invalid donation");
        donationAddress = _donation;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (admin only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(treasuryAddress, amount);
    }
}