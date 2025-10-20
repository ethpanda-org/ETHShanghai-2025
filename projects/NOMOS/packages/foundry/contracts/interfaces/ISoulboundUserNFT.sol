// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISoulboundUserNFT 接口
 * @notice 定义用户NFT合约的接口，用于查询用户等级
 */
interface ISoulboundUserNFT {
    // 用户等级枚举
    enum UserGrade {
        Poor, // 新手游民 (0)
        Good, // 资深游民 (1)
        Excellent // 顶级游民 (2)

    }

    /**
     * @notice 检查用户是否已铸造NFT
     * @param user 用户地址
     * @return 是否已铸造NFT
     */
    function hasUserMintedNFT(address user) external view returns (bool);

    /**
     * @notice 获取用户等级
     * @param userAddress 用户地址
     * @return 用户等级
     */
    function getUserGrade(address userAddress) external view returns (UserGrade);

    /**
     * @notice 获取用户等级（字符串形式）
     * @param userAddress 用户地址
     * @return 用户等级字符串
     */
    function getUserGradeString(address userAddress) external view returns (string memory);

    /**
     * @notice 更新用户等级（仅所有者）
     * @param userAddress 用户地址
     * @param newGrade 新等级
     */
    function updateUserGrade(address userAddress, UserGrade newGrade) external;
}
