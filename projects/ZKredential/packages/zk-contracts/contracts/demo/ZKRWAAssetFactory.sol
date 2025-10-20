// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ZKRWATokenERC3643.sol";
import "../interfaces/IZKRWARegistry.sol";

/**
 * @title ZKRWAAssetFactory
 * @dev 用于创建和管理RWA资产代币的工厂合约
 */
contract ZKRWAAssetFactory is Ownable, ReentrancyGuard, Pausable {
    
    // ============ 状态变量 ============
    
    IZKRWARegistry public immutable zkRegistry;
    address public immutable identityRegistryAdapter;
    address public immutable complianceAdapter;
    
    /// @dev 已部署的资产列表
    address[] public deployedAssets;
    
    /// @dev 资产地址 => 资产信息
    mapping(address => AssetMetadata) public assetMetadata;
    
    /// @dev 创建者地址 => 创建的资产列表
    mapping(address => address[]) public creatorAssets;
    
    /// @dev 平台名称 => 资产列表
    mapping(string => address[]) public platformAssets;
    
    /// @dev 资产创建费用 (wei)
    uint256 public creationFee = 0.01 ether;
    
    /// @dev 最小投资额限制
    uint256 public minInvestmentLimit = 100; // 100 USD
    
    /// @dev 最大供应量限制
    uint256 public maxSupplyLimit = 1000000 * 10**18; // 1M tokens
    
    // ============ 结构体 ============
    
    struct AssetMetadata {
        address creator;
        string platform;
        uint256 createdAt;
        bool isActive;
        uint256 totalRaised;
        uint256 investorCount;
    }
    
    struct AssetCreationParams {
        string name;
        string symbol;
        string description;
        uint256 totalValue;
        uint256 minInvestment;
        uint256 maxSupply;
        string platformName;
    }
    
    // ============ 事件 ============
    
    event AssetCreated(
        address indexed asset,
        address indexed creator,
        string name,
        string symbol,
        string platform,
        uint256 totalValue
    );
    
    event AssetStatusChanged(address indexed asset, bool isActive);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    
    // ============ 修饰符 ============
    
    modifier onlyVerifiedCreator() {
        require(zkRegistry.hasValidIdentity(msg.sender), "Creator not verified");
        _;
    }
    
    modifier validAsset(address asset) {
        require(assetMetadata[asset].creator != address(0), "Asset not found");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _zkRegistry,
        address _identityRegistryAdapter,
        address _complianceAdapter
    ) Ownable(msg.sender) {
        require(_zkRegistry != address(0), "Invalid ZK registry");
        require(_identityRegistryAdapter != address(0), "Invalid identity adapter");
        require(_complianceAdapter != address(0), "Invalid compliance adapter");
        
        zkRegistry = IZKRWARegistry(_zkRegistry);
        identityRegistryAdapter = _identityRegistryAdapter;
        complianceAdapter = _complianceAdapter;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev 创建新的RWA资产代币
     */
    function createAsset(AssetCreationParams calldata params) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyVerifiedCreator 
        returns (address) {
        
        // 验证创建费用
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // 验证参数
        require(bytes(params.name).length > 0, "Invalid name");
        require(bytes(params.symbol).length > 0, "Invalid symbol");
        require(bytes(params.description).length > 0, "Invalid description");
        require(bytes(params.platformName).length > 0, "Invalid platform name");
        require(params.totalValue > 0, "Invalid total value");
        require(params.minInvestment >= minInvestmentLimit, "Min investment too low");
        require(params.maxSupply > 0 && params.maxSupply <= maxSupplyLimit, "Invalid max supply");
        
        // 检查创建者是否符合平台要求
        require(
            zkRegistry.isPlatformCompliant(msg.sender, params.platformName),
            "Creator not compliant with platform"
        );
        
        // 创建资产信息结构体
        ZKRWATokenERC3643.AssetInfo memory assetInfo = ZKRWATokenERC3643.AssetInfo({
            name: params.description,
            description: params.description,
            totalValue: params.totalValue,
            minInvestment: params.minInvestment,
            maxSupply: params.maxSupply,
            platformName: params.platformName,
            isActive: true
        });
        
        // 部署新的代币合约
        ZKRWATokenERC3643 newAsset = new ZKRWATokenERC3643(
            params.name,
            params.symbol,
            identityRegistryAdapter,
            complianceAdapter,
            address(zkRegistry),
            assetInfo
        );
        
        address assetAddress = address(newAsset);
        
        // 记录资产元数据
        assetMetadata[assetAddress] = AssetMetadata({
            creator: msg.sender,
            platform: params.platformName,
            createdAt: block.timestamp,
            isActive: true,
            totalRaised: 0,
            investorCount: 0
        });
        
        // 添加到各种列表
        deployedAssets.push(assetAddress);
        creatorAssets[msg.sender].push(assetAddress);
        platformAssets[params.platformName].push(assetAddress);
        
        emit AssetCreated(
            assetAddress,
            msg.sender,
            params.name,
            params.symbol,
            params.platformName,
            params.totalValue
        );
        
        return assetAddress;
    }
    
    /**
     * @dev 更新资产状态
     */
    function setAssetStatus(address asset, bool isActive) 
        external 
        validAsset(asset) {
        
        AssetMetadata storage metadata = assetMetadata[asset];
        require(
            msg.sender == metadata.creator || msg.sender == owner(),
            "Not authorized"
        );
        
        metadata.isActive = isActive;
        
        // 同时更新代币合约的状态
        ZKRWATokenERC3643(asset).setAssetActive(isActive);
        
        emit AssetStatusChanged(asset, isActive);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取所有已部署的资产
     */
    function getAllAssets() external view returns (address[] memory) {
        return deployedAssets;
    }
    
    /**
     * @dev 获取活跃资产列表
     */
    function getActiveAssets() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // 计算活跃资产数量
        for (uint256 i = 0; i < deployedAssets.length; i++) {
            if (assetMetadata[deployedAssets[i]].isActive) {
                activeCount++;
            }
        }
        
        // 构建活跃资产数组
        address[] memory activeAssets = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < deployedAssets.length; i++) {
            if (assetMetadata[deployedAssets[i]].isActive) {
                activeAssets[index] = deployedAssets[i];
                index++;
            }
        }
        
        return activeAssets;
    }
    
    /**
     * @dev 获取创建者的资产列表
     */
    function getCreatorAssets(address creator) external view returns (address[] memory) {
        return creatorAssets[creator];
    }
    
    /**
     * @dev 获取平台的资产列表
     */
    function getPlatformAssets(string calldata platform) external view returns (address[] memory) {
        return platformAssets[platform];
    }
    
    /**
     * @dev 获取资产详细信息
     */
    function getAssetDetails(address asset) external view returns (
        AssetMetadata memory metadata,
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 maxSupply,
        uint256 totalInvestors,
        uint256 totalRaised
    ) {
        require(assetMetadata[asset].creator != address(0), "Asset not found");
        
        ZKRWATokenERC3643 token = ZKRWATokenERC3643(asset);
        
        (uint256 investors, uint256 raised, uint256 supply, uint256 maxSup) = token.getInvestmentStats();
        
        return (
            assetMetadata[asset],
            token.name(),
            token.symbol(),
            supply,
            maxSup,
            investors,
            raised
        );
    }
    
    /**
     * @dev 获取统计信息
     */
    function getFactoryStats() external view returns (
        uint256 totalAssets,
        uint256 activeAssets,
        uint256 totalCreators,
        uint256 totalValueLocked
    ) {
        uint256 activeCount = 0;
        uint256 tvl = 0;
        
        for (uint256 i = 0; i < deployedAssets.length; i++) {
            if (assetMetadata[deployedAssets[i]].isActive) {
                activeCount++;
            }
            
            // 计算TVL (这里简化处理，实际应该查询每个资产的当前价值)
            ZKRWATokenERC3643 token = ZKRWATokenERC3643(deployedAssets[i]);
            (, uint256 raised,,) = token.getInvestmentStats();
            tvl += raised;
        }
        
        // 计算创建者数量（简化处理，实际应该去重）
        uint256 creatorCount = 0;
        for (uint256 i = 0; i < deployedAssets.length; i++) {
            if (assetMetadata[deployedAssets[i]].creator != address(0)) {
                creatorCount++;
            }
        }
        
        return (deployedAssets.length, activeCount, creatorCount, tvl);
    }
    
    // ============ 管理功能 ============
    
    /**
     * @dev 设置创建费用
     */
    function setCreationFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = _fee;
        emit CreationFeeUpdated(oldFee, _fee);
    }
    
    /**
     * @dev 设置最小投资额限制
     */
    function setMinInvestmentLimit(uint256 _limit) external onlyOwner {
        minInvestmentLimit = _limit;
    }
    
    /**
     * @dev 设置最大供应量限制
     */
    function setMaxSupplyLimit(uint256 _limit) external onlyOwner {
        maxSupplyLimit = _limit;
    }
    
    /**
     * @dev 提取手续费
     */
    function withdrawFees(address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        recipient.transfer(balance);
        emit FeesWithdrawn(recipient, balance);
    }
    
    /**
     * @dev 暂停工厂
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复工厂
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急停止所有资产
     */
    function emergencyStopAllAssets() external onlyOwner {
        for (uint256 i = 0; i < deployedAssets.length; i++) {
            address asset = deployedAssets[i];
            if (assetMetadata[asset].isActive) {
                assetMetadata[asset].isActive = false;
                ZKRWATokenERC3643(asset).setAssetActive(false);
                emit AssetStatusChanged(asset, false);
            }
        }
    }
}
