// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IZKRWARegistry.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/ICompliance.sol";

contract ZKToERC3643Adapter is IIdentityRegistry, ICompliance {
    IZKRWARegistry public immutable zkRegistry;
    string public platformName;
    
    constructor(address _zkRegistry, string memory _platformName) {
        require(_zkRegistry != address(0), "Invalid registry address");
        require(bytes(_platformName).length > 0, "Invalid platform name");
        
        zkRegistry = IZKRWARegistry(_zkRegistry);
        platformName = _platformName;
    }
    
    // IIdentityRegistry 实现
    function isVerified(address user) external view returns (bool) {
        return zkRegistry.hasValidIdentity(user);
    }
    
    function identity(address user) external view returns (address) {
        return zkRegistry.hasValidIdentity(user) ? user : address(0);
    }
    
    function investorCountry(address user) external view returns (uint16) {
        // 检查用户是否有效
        if (!zkRegistry.hasValidIdentity(user)) {
            return 0;
        }
        
        // 默认返回美国代码，实际应用中可以从平台要求或证明中提取
        return 840; // ISO 3166-1 numeric code for United States
    }
    
    function issuersRegistry() external view returns (address) {
        return address(zkRegistry);
    }
    
    // ICompliance 实现
    function canTransfer(address from, address to, uint256) external view returns (bool) {
        return zkRegistry.hasValidIdentity(from) && 
               zkRegistry.hasValidIdentity(to) &&
               zkRegistry.isPlatformCompliant(from, platformName) &&
               zkRegistry.isPlatformCompliant(to, platformName);
    }
    
    function transferred(address, address, uint256) external {
        // 转账后处理逻辑（如果需要）
    }
    
    function created(address, uint256) external {
        // 代币创建后处理逻辑（如果需要）
    }
    
    function destroyed(address, uint256) external {
        // 代币销毁后处理逻辑（如果需要）
    }
    
    // ============ 辅助功能 ============
    
    /**
     * @dev 获取平台名称
     */
    function getPlatformName() external view returns (string memory) {
        return platformName;
    }
    
    /**
     * @dev 批量检查用户合规性
     */
    function batchCheckCompliance(address[] calldata users) 
        external view returns (bool[] memory) {
        bool[] memory results = new bool[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = zkRegistry.hasValidIdentity(users[i]) &&
                        zkRegistry.isPlatformCompliant(users[i], platformName);
        }
        
        return results;
    }
}