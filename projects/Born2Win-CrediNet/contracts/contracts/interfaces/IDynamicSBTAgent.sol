// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDynamicSBTAgent
 * @notice DynamicSBTAgent 合约的接口定义
 * @dev 供 CrediNetSBT 合约调用，实现动态元数据生成
 */
interface IDynamicSBTAgent {
    
    /// @dev 五维信用评分结构
    struct CreditScore {
        uint16 keystone;
        uint16 ability;
        uint16 wealth;
        uint16 health;
        uint16 behavior;
        uint32 lastUpdate;
        uint32 updateCount;
    }

    /// @dev 稀有度等级
    enum Rarity {
        COMMON,
        RARE,
        EPIC,
        LEGENDARY
    }

    // ========== 核心功能 ==========

    /**
     * @notice 注册SBT（在铸造时由SBT合约调用）
     * @param user 用户地址
     * @param tokenId Token ID
     */
    function registerSBT(address user, uint256 tokenId) external;

    /**
     * @notice 生成动态的SBT元数据
     * @param user 用户地址
     * @param tokenId Token ID
     * @return Base64编码的JSON元数据URI
     */
    function generateMetadata(address user, uint256 tokenId) external view returns (string memory);

    /**
     * @notice 更新用户信用评分
     * @param user 用户地址
     * @param keystone 基石分数 (0-1000)
     * @param ability 能力分数 (0-1000)
     * @param wealth 财富分数 (0-1000)
     * @param health 健康分数 (0-1000)
     * @param behavior 行为分数 (0-1000)
     */
    function updateCreditScore(
        address user,
        uint16 keystone,
        uint16 ability,
        uint16 wealth,
        uint16 health,
        uint16 behavior
    ) external;

    /**
     * @notice 批量更新用户信用评分
     */
    function batchUpdateCreditScores(
        address[] calldata users,
        uint16[] calldata keystones,
        uint16[] calldata abilities,
        uint16[] calldata wealths,
        uint16[] calldata healths,
        uint16[] calldata behaviors
    ) external;

    /**
     * @notice 计算用户的加权总分
     * @param user 用户地址
     * @return 加权总分 (0-1000)
     */
    function calculateTotalScore(address user) external view returns (uint16);

    /**
     * @notice 根据总分获取稀有度等级
     * @param totalScore 总分
     * @return 稀有度等级
     */
    function getRarity(uint16 totalScore) external pure returns (Rarity);

    /**
     * @notice 获取用户完整的信用信息
     * @param user 用户地址
     * @return score 五维评分
     * @return totalScore 加权总分
     * @return rarity 稀有度等级
     * @return tokenId Token ID
     */
    function getUserCreditInfo(address user) 
        external 
        view 
        returns (
            CreditScore memory score,
            uint16 totalScore,
            Rarity rarity,
            uint256 tokenId
        );

    // ========== 查询函数 ==========

    /**
     * @notice 获取用户的Token ID
     */
    function userTokenIds(address user) external view returns (uint256);

    /**
     * @notice 获取Token的所有者
     */
    function tokenOwners(uint256 tokenId) external view returns (address);

    /**
     * @notice 获取用户的信用评分
     */
    function userScores(address user) external view returns (CreditScore memory);

    // ========== 事件 ==========

    event ScoreUpdated(
        address indexed user,
        uint256 indexed tokenId,
        uint16 keystone,
        uint16 ability,
        uint16 wealth,
        uint16 health,
        uint16 behavior,
        uint16 totalScore
    );

    event SBTMetadataUpdated(
        uint256 indexed tokenId,
        string newMetadataURI,
        Rarity rarity
    );

    event AutoUpdateTriggered(
        address indexed user,
        uint256 indexed tokenId,
        string reason
    );
}

