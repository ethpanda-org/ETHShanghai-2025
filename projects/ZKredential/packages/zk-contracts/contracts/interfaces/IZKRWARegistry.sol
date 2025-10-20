// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IZKRWARegistry
 * @dev ZK-RWA注册表接口（基于现有的ZKRWARegistry合约）
 */
interface IZKRWARegistry {
    
    struct IdentityProof {
        bytes32 commitment;
        bytes32 nullifierHash;
        uint256 timestamp;
        uint256 expiresAt;
        string provider;
        bool isActive;
        bool isRevoked;
    }
    
    struct PlatformRequirements {
        uint8 minAge;
        uint16 allowedCountry;
        uint256 minAssets;
        bool isActive;
    }
    
    // ============ 核心功能 ============
    function hasValidIdentity(address user) external view returns (bool);
    function isPlatformCompliant(address user, string memory platform) external view returns (bool);
    function identityProofs(address user) external view returns (IdentityProof memory);
    function getPlatformRequirements(string memory platform) external view returns (PlatformRequirements memory);
    
    // ============ 身份管理 ============
    function registerIdentity(
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[8] calldata pubSignals,
        string calldata provider,
        uint256 expiresAt
    ) external;
    
    function revokeIdentity(address user) external;
    function selfRevokeIdentity() external;
    
    // ============ 平台管理 ============
    function setPlatformRequirements(
        string calldata platform,
        uint8 minAge,
        uint16 allowedCountry,
        uint256 minAssets
    ) external;
    
    // ============ 查询功能 ============
    function getStats() external view returns (uint256 total, uint256 active);
    function batchCheckIdentities(address[] calldata users) external view returns (bool[] memory);
    
    // ============ 管理功能 ============
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}