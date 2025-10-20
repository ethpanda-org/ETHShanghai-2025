// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IERC3643.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/ICompliance.sol";
import "../interfaces/IZKRWARegistry.sol";

/**
 * @title ZKRWATokenERC3643
 * @dev ERC-3643兼容的RWA代币，集成ZK-KYC验证
 */
contract ZKRWATokenERC3643 is ERC20, IERC3643, Ownable, ReentrancyGuard, Pausable {
    
    // ============ 状态变量 ============
    
    IIdentityRegistry private _identityRegistry;
    ICompliance private _compliance;
    IZKRWARegistry public zkRegistry;
    
    /// @dev 冻结地址映射
    mapping(address => bool) private _frozenAddresses;
    
    /// @dev 资产信息
    struct AssetInfo {
        string name;            // 资产名称
        string description;     // 资产描述
        uint256 totalValue;     // 总价值 (USD)
        uint256 minInvestment;  // 最小投资额
        uint256 maxSupply;      // 最大供应量
        string platformName;    // 平台名称
        bool isActive;          // 是否激活
    }
    
    AssetInfo public assetInfo;
    
    /// @dev 投资统计
    mapping(address => uint256) public userInvestments;
    uint256 public totalInvestors;
    uint256 public totalRaised;
    
    // ============ 事件 ============
    
    event Investment(address indexed investor, uint256 amount, uint256 tokens);
    event AssetInfoUpdated(string name, string description, uint256 totalValue);
    
    // ============ 修饰符 ============
    
    modifier onlyVerified(address addr) {
        require(_identityRegistry.isVerified(addr), "Address not verified");
        _;
    }
    
    modifier notFrozen(address addr) {
        require(!_frozenAddresses[addr], "Address is frozen");
        _;
    }
    
    modifier canTransferTokens(address from, address to, uint256 amount) {
        require(canTransfer(from, to, amount), "Transfer not allowed");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        string memory name,
        string memory symbol,
        address identityRegistryAddr,
        address complianceAddr,
        address zkRegistryAddr,
        AssetInfo memory _assetInfo
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(identityRegistryAddr != address(0), "Invalid identity registry");
        require(complianceAddr != address(0), "Invalid compliance");
        require(zkRegistryAddr != address(0), "Invalid ZK registry");
        require(bytes(_assetInfo.name).length > 0, "Invalid asset name");
        require(_assetInfo.totalValue > 0, "Invalid total value");
        require(_assetInfo.maxSupply > 0, "Invalid max supply");
        
        _identityRegistry = IIdentityRegistry(identityRegistryAddr);
        _compliance = ICompliance(complianceAddr);
        zkRegistry = IZKRWARegistry(zkRegistryAddr);
        assetInfo = _assetInfo;
    }
    
    // ============ ERC-3643 核心实现 ============
    
    /**
     * @dev 获取身份注册表地址
     */
    function identityRegistry() external view override returns (address) {
        return address(_identityRegistry);
    }
    
    /**
     * @dev 获取合规模块地址
     */
    function compliance() external view override returns (address) {
        return address(_compliance);
    }
    
    /**
     * @dev 检查转账是否被允许
     */
    function canTransfer(address from, address to, uint256 amount) 
        public view override returns (bool) {
        // 检查地址是否被冻结
        if (_frozenAddresses[from] || _frozenAddresses[to]) {
            return false;
        }
        
        // 检查身份验证
        if (!_identityRegistry.isVerified(from) || !_identityRegistry.isVerified(to)) {
            return false;
        }
        
        // 检查合规性
        if (!_compliance.canTransfer(from, to, amount)) {
            return false;
        }
        
        // 检查余额
        if (balanceOf(from) < amount) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev 重写转账函数，添加合规检查
     */
    function transfer(address to, uint256 amount) 
        public override 
        whenNotPaused 
        canTransferTokens(msg.sender, to, amount) 
        returns (bool) {
        
        bool success = super.transfer(to, amount);
        if (success) {
            _compliance.transferred(msg.sender, to, amount);
        }
        return success;
    }
    
    /**
     * @dev 重写授权转账函数，添加合规检查
     */
    function transferFrom(address from, address to, uint256 amount) 
        public override 
        whenNotPaused 
        canTransferTokens(from, to, amount) 
        returns (bool) {
        
        bool success = super.transferFrom(from, to, amount);
        if (success) {
            _compliance.transferred(from, to, amount);
        }
        return success;
    }
    
    // ============ 地址冻结管理 ============
    
    function isFrozen(address addr) external view override returns (bool) {
        return _frozenAddresses[addr];
    }
    
    function freezeAddress(address addr) external override onlyOwner {
        require(addr != address(0), "Cannot freeze zero address");
        _frozenAddresses[addr] = true;
        emit AddressFrozen(addr, true);
    }
    
    function unfreezeAddress(address addr) external override onlyOwner {
        _frozenAddresses[addr] = false;
        emit AddressFrozen(addr, false);
    }
    
    function batchFreezeAddresses(address[] memory addresses) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] != address(0)) {
                _frozenAddresses[addresses[i]] = true;
                emit AddressFrozen(addresses[i], true);
            }
        }
    }
    
    function batchUnfreezeAddresses(address[] memory addresses) external override onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            _frozenAddresses[addresses[i]] = false;
            emit AddressFrozen(addresses[i], false);
        }
    }
    
    // ============ 强制转账 ============
    
    function forcedTransfer(address from, address to, uint256 amount) 
        external override onlyOwner returns (bool) {
        require(from != address(0) && to != address(0), "Invalid addresses");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _transfer(from, to, amount);
        _compliance.transferred(from, to, amount);
        
        return true;
    }
    
    // ============ 投资功能 ============
    
    /**
     * @dev 投资购买代币
     * @param amount 投资金额 (USD)
     */
    function invest(uint256 amount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyVerified(msg.sender) 
        notFrozen(msg.sender) {
        
        require(amount >= assetInfo.minInvestment, "Below minimum investment");
        require(assetInfo.isActive, "Asset not active");
        
        // 检查平台合规性
        require(
            zkRegistry.isPlatformCompliant(msg.sender, assetInfo.platformName),
            "Not compliant with platform requirements"
        );
        
        // 计算代币数量 (1 USD = 1 token for simplicity)
        uint256 tokens = amount;
        require(totalSupply() + tokens <= assetInfo.maxSupply, "Exceeds max supply");
        
        // 记录投资
        if (userInvestments[msg.sender] == 0) {
            totalInvestors++;
        }
        userInvestments[msg.sender] += amount;
        totalRaised += amount;
        
        // 铸造代币
        _mint(msg.sender, tokens);
        _compliance.created(msg.sender, tokens);
        
        emit Investment(msg.sender, amount, tokens);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 更新身份注册表
     */
    function updateIdentityRegistry(address _newIdentityRegistry) external onlyOwner {
        require(_newIdentityRegistry != address(0), "Invalid address");
        _identityRegistry = IIdentityRegistry(_newIdentityRegistry);
        emit IdentityRegistryAdded(_newIdentityRegistry);
    }
    
    /**
     * @dev 更新合规模块
     */
    function updateCompliance(address _newCompliance) external onlyOwner {
        require(_newCompliance != address(0), "Invalid address");
        _compliance = ICompliance(_newCompliance);
        emit ComplianceAdded(_newCompliance);
    }
    
    /**
     * @dev 更新资产信息
     */
    function updateAssetInfo(
        string memory _name,
        string memory _description,
        uint256 _totalValue
    ) external onlyOwner {
        require(bytes(_name).length > 0, "Invalid name");
        require(_totalValue > 0, "Invalid total value");
        
        assetInfo.name = _name;
        assetInfo.description = _description;
        assetInfo.totalValue = _totalValue;
        
        emit AssetInfoUpdated(_name, _description, _totalValue);
    }
    
    /**
     * @dev 激活/停用资产
     */
    function setAssetActive(bool _isActive) external onlyOwner {
        assetInfo.isActive = _isActive;
    }
    
    /**
     * @dev 铸造代币（仅供测试使用）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= assetInfo.maxSupply, "Exceeds max supply");
        
        _mint(to, amount);
        _compliance.created(to, amount);
    }
    
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
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取投资统计
     */
    function getInvestmentStats() external view returns (
        uint256 _totalInvestors,
        uint256 _totalRaised,
        uint256 _currentSupply,
        uint256 _maxSupply
    ) {
        return (totalInvestors, totalRaised, totalSupply(), assetInfo.maxSupply);
    }
    
    /**
     * @dev 获取用户投资信息
     */
    function getUserInvestment(address user) external view returns (
        uint256 investment,
        uint256 tokens,
        bool isVerified,
        bool isAddressFrozen
    ) {
        return (
            userInvestments[user],
            balanceOf(user),
            _identityRegistry.isVerified(user),
            _frozenAddresses[user]
        );
    }
}
