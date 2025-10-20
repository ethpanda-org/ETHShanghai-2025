// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StreamPayment
 * @dev 点对点支付可视化系统智能合约
 * @notice 管理主钱包到供应商的支付流向,记录所有交易历史
 */
contract StreamPayment is Ownable, ReentrancyGuard, Pausable {
    // ============ 结构体定义 ============
    
    struct Payment {
        uint256 id;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string category;
        PaymentStatus status;
    }
    
    struct Supplier {
        address wallet;
        string name;
        string brand;
        string category;
        uint256 totalReceived;
        uint256 profitMargin; // 基点表示 (1% = 100)
        bool isActive;
        uint256 registeredAt;
    }
    
    enum PaymentStatus { Pending, Completed, Cancelled }
    
    // ============ 状态变量 ============
    
    uint256 private _paymentIdCounter;
    uint256 private _totalPayments;
    uint256 private _totalAmount;
    
    mapping(uint256 => Payment) public payments;
    mapping(address => Supplier) public suppliers;
    mapping(address => uint256[]) private _userPayments;
    mapping(address => uint256[]) private _supplierPayments;
    
    address[] private _supplierAddresses;
    
    // ============ 事件定义 ============
    
    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string category
    );
    
    event PaymentCompleted(uint256 indexed paymentId);
    event PaymentCancelled(uint256 indexed paymentId);
    
    event SupplierRegistered(
        address indexed supplier,
        string name,
        string brand,
        string category
    );
    
    event SupplierUpdated(address indexed supplier);
    event SupplierDeactivated(address indexed supplier);
    
    // ============ 构造函数 ============
    
    constructor() Ownable(msg.sender) {
        _paymentIdCounter = 1;
    }
    
    // ============ 供应商管理函数 ============
    
    /**
     * @dev 注册新供应商
     * @param name 供应商名称
     * @param brand 品牌名称
     * @param category 业务类别
     * @param profitMargin 利润率(基点)
     */
    function registerSupplier(
        string memory name,
        string memory brand,
        string memory category,
        uint256 profitMargin
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(!suppliers[msg.sender].isActive, "Supplier already registered");
        require(profitMargin <= 10000, "Profit margin cannot exceed 100%");
        
        suppliers[msg.sender] = Supplier({
            wallet: msg.sender,
            name: name,
            brand: brand,
            category: category,
            totalReceived: 0,
            profitMargin: profitMargin,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        _supplierAddresses.push(msg.sender);
        
        emit SupplierRegistered(msg.sender, name, brand, category);
    }
    
    /**
     * @dev 更新供应商信息
     */
    function updateSupplier(
        string memory name,
        string memory brand,
        string memory category,
        uint256 profitMargin
    ) external {
        require(suppliers[msg.sender].isActive, "Supplier not registered");
        require(profitMargin <= 10000, "Profit margin cannot exceed 100%");
        
        Supplier storage supplier = suppliers[msg.sender];
        supplier.name = name;
        supplier.brand = brand;
        supplier.category = category;
        supplier.profitMargin = profitMargin;
        
        emit SupplierUpdated(msg.sender);
    }
    
    /**
     * @dev 停用供应商
     */
    function deactivateSupplier(address supplierAddress) external onlyOwner {
        require(suppliers[supplierAddress].isActive, "Supplier not active");
        suppliers[supplierAddress].isActive = false;
        emit SupplierDeactivated(supplierAddress);
    }
    
    // ============ 支付函数 ============
    
    /**
     * @dev 创建支付
     * @param to 接收方地址
     * @param category 支付类别
     */
    function createPayment(
        address to,
        string memory category
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(suppliers[to].isActive, "Recipient is not an active supplier");
        
        uint256 paymentId = _paymentIdCounter++;
        
        payments[paymentId] = Payment({
            id: paymentId,
            from: msg.sender,
            to: to,
            amount: msg.value,
            timestamp: block.timestamp,
            category: category,
            status: PaymentStatus.Pending
        });
        
        _userPayments[msg.sender].push(paymentId);
        _supplierPayments[to].push(paymentId);
        
        emit PaymentCreated(paymentId, msg.sender, to, msg.value, category);
        
        // 自动完成支付
        _completePayment(paymentId);
        
        return paymentId;
    }
    
    /**
     * @dev 完成支付(内部函数)
     */
    function _completePayment(uint256 paymentId) private {
        Payment storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        
        payment.status = PaymentStatus.Completed;
        
        // 更新供应商总收入
        suppliers[payment.to].totalReceived += payment.amount;
        
        // 更新全局统计
        _totalPayments++;
        _totalAmount += payment.amount;
        
        // 转账给供应商
        (bool success, ) = payment.to.call{value: payment.amount}("");
        require(success, "Transfer failed");
        
        emit PaymentCompleted(paymentId);
    }
    
    /**
     * @dev 取消支付(仅限owner)
     */
    function cancelPayment(uint256 paymentId) external onlyOwner {
        Payment storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        
        payment.status = PaymentStatus.Cancelled;
        
        emit PaymentCancelled(paymentId);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户的支付历史
     */
    function getUserPayments(address user) external view returns (Payment[] memory) {
        uint256[] memory paymentIds = _userPayments[user];
        Payment[] memory result = new Payment[](paymentIds.length);
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            result[i] = payments[paymentIds[i]];
        }
        
        return result;
    }
    
    /**
     * @dev 获取供应商收到的支付
     */
    function getSupplierPayments(address supplier) external view returns (Payment[] memory) {
        uint256[] memory paymentIds = _supplierPayments[supplier];
        Payment[] memory result = new Payment[](paymentIds.length);
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            result[i] = payments[paymentIds[i]];
        }
        
        return result;
    }
    
    /**
     * @dev 获取供应商信息
     */
    function getSupplierInfo(address supplier) external view returns (Supplier memory) {
        return suppliers[supplier];
    }
    
    /**
     * @dev 获取所有供应商地址
     */
    function getAllSuppliers() external view returns (address[] memory) {
        return _supplierAddresses;
    }
    
    /**
     * @dev 获取活跃供应商数量
     */
    function getActiveSupplierCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _supplierAddresses.length; i++) {
            if (suppliers[_supplierAddresses[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 获取总支付次数
     */
    function getTotalPayments() external view returns (uint256) {
        return _totalPayments;
    }
    
    /**
     * @dev 获取总支付金额
     */
    function getTotalAmount() external view returns (uint256) {
        return _totalAmount;
    }
    
    /**
     * @dev 获取单个支付详情
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }
    
    /**
     * @dev 获取最近的N笔支付
     */
    function getRecentPayments(uint256 count) external view returns (Payment[] memory) {
        uint256 total = _paymentIdCounter - 1;
        uint256 resultCount = count > total ? total : count;
        Payment[] memory result = new Payment[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = payments[total - i];
        }
        
        return result;
    }
    
    // ============ 管理函数 ============
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取(仅限owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ============ 接收ETH ============
    
    receive() external payable {}
    fallback() external payable {}
}

