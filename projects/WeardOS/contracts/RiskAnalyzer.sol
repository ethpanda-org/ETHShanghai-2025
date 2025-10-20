// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RiskAnalyzer
 * @dev 智能合约用于分析DeFi交易风险
 */
contract RiskAnalyzer is Ownable, ReentrancyGuard {
    
    struct RiskData {
        address contractAddress;
        uint256 riskScore;
        string riskLevel;
        uint256 timestamp;
        bool isBlacklisted;
    }
    
    struct PoolData {
        address poolAddress;
        uint256 liquidityScore;
        uint256 volumeScore;
        bool isVerified;
        uint256 lastUpdated;
    }
    
    // 风险数据映射
    mapping(address => RiskData) public contractRisks;
    mapping(address => PoolData) public poolData;
    mapping(address => bool) public blacklistedContracts;
    
    // 事件
    event RiskDataUpdated(address indexed contractAddress, uint256 riskScore, string riskLevel);
    event ContractBlacklisted(address indexed contractAddress);
    event PoolDataUpdated(address indexed poolAddress, uint256 liquidityScore, uint256 volumeScore);
    
    // 风险等级常量
    string constant LOW_RISK = "LOW";
    string constant MEDIUM_RISK = "MEDIUM";
    string constant HIGH_RISK = "HIGH";
    string constant CRITICAL_RISK = "CRITICAL";
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev 更新合约风险数据
     * @param _contractAddress 合约地址
     * @param _riskScore 风险分数 (0-100)
     */
     
    function updateRiskData(
        address _contractAddress,
        uint256 _riskScore
    ) external onlyOwner {
        require(_contractAddress != address(0), "Invalid contract address");
        require(_riskScore <= 100, "Risk score must be <= 100");
        
        string memory riskLevel = _getRiskLevel(_riskScore);
        
        contractRisks[_contractAddress] = RiskData({
            contractAddress: _contractAddress,
            riskScore: _riskScore,
            riskLevel: riskLevel,
            timestamp: block.timestamp,
            isBlacklisted: blacklistedContracts[_contractAddress]
        });
        
        emit RiskDataUpdated(_contractAddress, _riskScore, riskLevel);
    }
    
    /**
     * @dev 更新流动性池数据
     * @param _poolAddress 池子地址
     * @param _liquidityScore 流动性分数
     * @param _volumeScore 交易量分数
     * @param _isVerified 是否已验证
     */
    function updatePoolData(
        address _poolAddress,
        uint256 _liquidityScore,
        uint256 _volumeScore,
        bool _isVerified
    ) external onlyOwner {
        require(_poolAddress != address(0), "Invalid pool address");
        
        poolData[_poolAddress] = PoolData({
            poolAddress: _poolAddress,
            liquidityScore: _liquidityScore,
            volumeScore: _volumeScore,
            isVerified: _isVerified,
            lastUpdated: block.timestamp
        });
        
        emit PoolDataUpdated(_poolAddress, _liquidityScore, _volumeScore);
    }
    
    /**
     * @dev 将合约加入黑名单
     * @param _contractAddress 合约地址
     */
    function blacklistContract(address _contractAddress) external onlyOwner {
        require(_contractAddress != address(0), "Invalid contract address");
        
        blacklistedContracts[_contractAddress] = true;
        
        // 更新风险数据
        if (contractRisks[_contractAddress].contractAddress != address(0)) {
            contractRisks[_contractAddress].isBlacklisted = true;
            contractRisks[_contractAddress].riskScore = 100;
            contractRisks[_contractAddress].riskLevel = CRITICAL_RISK;
        }
        
        emit ContractBlacklisted(_contractAddress);
    }
    
    /**
     * @dev 获取合约风险数据
     * @param _contractAddress 合约地址
     * @return RiskData 风险数据结构
     */
    function getRiskData(address _contractAddress) external view returns (RiskData memory) {
        return contractRisks[_contractAddress];
    }
    
    /**
     * @dev 获取池子数据
     * @param _poolAddress 池子地址
     * @return PoolData 池子数据结构
     */
    function getPoolData(address _poolAddress) external view returns (PoolData memory) {
        return poolData[_poolAddress];
    }
    
    /**
     * @dev 批量获取风险数据
     * @param _addresses 地址数组
     * @return RiskData[] 风险数据数组
     */
    function getBatchRiskData(address[] calldata _addresses) external view returns (RiskData[] memory) {
        RiskData[] memory results = new RiskData[](_addresses.length);
        
        for (uint256 i = 0; i < _addresses.length; i++) {
            results[i] = contractRisks[_addresses[i]];
        }
        
        return results;
    }
    
    /**
     * @dev 根据风险分数确定风险等级
     * @param _riskScore 风险分数
     * @return string 风险等级
     */
    function _getRiskLevel(uint256 _riskScore) internal pure returns (string memory) {
        if (_riskScore >= 80) {
            return CRITICAL_RISK;
        } else if (_riskScore >= 60) {
            return HIGH_RISK;
        } else if (_riskScore >= 30) {
            return MEDIUM_RISK;
        } else {
            return LOW_RISK;
        }
    }
    
    /**
     * @dev 检查地址是否在黑名单中
     * @param _address 要检查的地址
     * @return bool 是否在黑名单中
     */
    function isBlacklisted(address _address) external view returns (bool) {
        return blacklistedContracts[_address];
    }
}