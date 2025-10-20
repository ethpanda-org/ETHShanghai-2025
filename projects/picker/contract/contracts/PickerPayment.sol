// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// 继承必要的合约
contract PickerPayment is AccessControl, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Address for address payable;

    // 角色定义
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // 资金分配比例
    uint256 public constant DEV_SHARE_PERCENT = 95;
    uint256 public constant FEE_PERCENT = 5;
    uint256 public constant PERCENT_DENOMINATOR = 100;

    // Picker数据结构
    struct Picker {
        bytes16 pickerId;
        bytes16 devUserId;
        address devWalletAddress;
    }

    // 数据存储
    mapping(bytes16 => Picker) public pickers; // pickerId => Picker
    mapping(address => bytes16) public walletToPickerId; // 快速根据钱包查PickerId
    EnumerableSet.AddressSet private operatorAddresses; // 操作员地址集合（需迭代）
    bytes16[] private allPickerIds; // 使用数组存储所有pickerId用于迭代

    // 事件定义
    event PickerRegistered(bytes16 indexed pickerId, address indexed wallet);
    event PickerRemoved(bytes16 indexed pickerId);
    event PaymentProcessed(bytes16 indexed pickerId, uint256 amount);
    event FundsWithdrawn(address indexed deployer, uint256 amount);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);

    // 初始化合约
    constructor() {
        // 合约创建者自动获得DEFAULT_ADMIN_ROLE（合约发行者角色）
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    // 错误定义
    error ZeroAddressNotAllowed();
    error PickerAlreadyExists();
    error PickerNotFound();
    error InvalidPickerData();
    error InsufficientBalance();
    error TransferFailed();
    error AddressAlreadyOperator();
    error AddressNotOperator();

    /**
     * @dev 授权地址为操作员
     * 只有合约发行者（DEFAULT_ADMIN_ROLE）可以调用
     */
    function grantOperatorRole(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(operator != address(0), "Operator address cannot be zero");
        require(!operatorAddresses.contains(operator), "Address is already an operator");
        
        _grantRole(OPERATOR_ROLE, operator);
        operatorAddresses.add(operator);
        emit OperatorAdded(operator);
    }

    /**
     * @dev 取消操作员权限
     * 只有合约发行者（DEFAULT_ADMIN_ROLE）可以调用
     */
    function revokeOperatorRole(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(operator != address(0), "Operator address cannot be zero");
        require(operatorAddresses.contains(operator), "Address is not an operator");
        
        _revokeRole(OPERATOR_ROLE, operator);
        operatorAddresses.remove(operator);
        emit OperatorRemoved(operator);
    }

    /**
     * @dev 注册新的Picker信息
     * 操作员（OPERATOR_ROLE）和合约发行者（DEFAULT_ADMIN_ROLE）可以调用
     */
    function registerPicker(
        bytes16 pickerId,
        bytes16 devUserId,
        address devWalletAddress
    ) external {
        // 检查调用者权限：操作员或合约发行者
        require(hasRole(OPERATOR_ROLE, _msgSender()) || hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
                "Caller is not an operator or contract deployer");
        
        // 参数验证
        if (devWalletAddress == address(0)) revert ZeroAddressNotAllowed();
        if (pickerId == bytes16(0) || devUserId == bytes16(0)) revert InvalidPickerData();
        if (pickers[pickerId].pickerId != bytes16(0)) revert PickerAlreadyExists();
        if (walletToPickerId[devWalletAddress] != bytes16(0)) revert PickerAlreadyExists();

        // 存储数据
        pickers[pickerId] = Picker({
            pickerId: pickerId,
            devUserId: devUserId,
            devWalletAddress: devWalletAddress
        });
        walletToPickerId[devWalletAddress] = pickerId;
        allPickerIds.push(pickerId);

        emit PickerRegistered(pickerId, devWalletAddress);
    }

    /**
     * @dev 删除Picker信息
     * 操作员（OPERATOR_ROLE）和合约发行者（DEFAULT_ADMIN_ROLE）可以调用
     */
    function removePicker(bytes16 pickerId) external {
        // 检查调用者权限：操作员或合约发行者
        require(hasRole(OPERATOR_ROLE, _msgSender()) || hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
                "Caller is not an operator or contract deployer");
        
        Picker storage picker = pickers[pickerId];
        if (picker.pickerId == bytes16(0)) revert PickerNotFound();

        // 清理映射
        delete walletToPickerId[picker.devWalletAddress];
        delete pickers[pickerId];
        // 从数组中删除pickerId
        for (uint256 i = 0; i < allPickerIds.length; i++) {
            if (allPickerIds[i] == pickerId) {
                allPickerIds[i] = allPickerIds[allPickerIds.length - 1];
                allPickerIds.pop();
                break;
            }
        }

        emit PickerRemoved(pickerId);
    }

    /**
     * @dev 支付函数，校验Picker信息并分配资金
     * 按照比例 95% 直接转移给开发者的钱包地址
     * 按照比例剩余 5% 存储在合约中
     */
    function pay(
        bytes16 pickerId,
        bytes16 devUserId,
        address devWalletAddress
    ) external payable nonReentrant {
        // 验证Picker信息
        Picker storage picker = pickers[pickerId];
        if (picker.pickerId == bytes16(0)) revert PickerNotFound();
        if (picker.devUserId != devUserId || picker.devWalletAddress != devWalletAddress) revert InvalidPickerData();

        // 计算分配金额
        uint256 amount = msg.value;
        uint256 devShare = amount * DEV_SHARE_PERCENT / PERCENT_DENOMINATOR;

        // 转账给开发者
        (bool success, ) = payable(devWalletAddress).call{value: devShare}("");
        if (!success) revert TransferFailed();

        emit PaymentProcessed(pickerId, amount);
    }

    /**
     * @dev 提取合约余额
     * 仅合约发行者（DEFAULT_ADMIN_ROLE）可调用
     */
    function withdrawFunds(address payable recipient) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance();

        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(_msgSender(), balance);
    }

    /**
     * @dev 查询Picker信息
     * 所有人都可以根据传入的钱包地址查询Picker数据
     */
    function queryPickerByWallet(address wallet) external view returns (bytes16, bytes16) {
        bytes16 pickerId = walletToPickerId[wallet];
        if (pickerId == bytes16(0)) {
            return (bytes16(0), bytes16(0));
        }
        
        Picker storage picker = pickers[pickerId];
        return (picker.pickerId, picker.devUserId);
    }

    /**
     * @dev 查询所有Picker列表
     * 只有合约发行者（DEFAULT_ADMIN_ROLE）可调用
     */
    function getAllPickers() external view onlyRole(DEFAULT_ADMIN_ROLE) returns (Picker[] memory) {
        uint256 pickerCount = allPickerIds.length;
        Picker[] memory result = new Picker[](pickerCount);
        
        for (uint256 i = 0; i < pickerCount; i++) {
            bytes16 pickerId = allPickerIds[i];
            result[i] = pickers[pickerId];
        }
        
        return result;
    }

    /**
     * @dev 查询所有操作员地址列表
     * 只有合约发行者（DEFAULT_ADMIN_ROLE）可调用
     */
    function getAllOperators() external view onlyRole(DEFAULT_ADMIN_ROLE) returns (address[] memory) {
        uint256 operatorCount = operatorAddresses.length();
        address[] memory operators = new address[](operatorCount);
        
        for (uint256 i = 0; i < operatorCount; i++) {
            operators[i] = operatorAddresses.at(i);
        }
        
        return operators;
    }

    /**
     * @dev 检查某个钱包地址是否为操作员
     * 所有人都可以查询
     */
    function isOperator(address account) external view returns (bool) {
        return operatorAddresses.contains(account);
    }

    // 防止合约接收以太币（除非通过pay函数）
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
}