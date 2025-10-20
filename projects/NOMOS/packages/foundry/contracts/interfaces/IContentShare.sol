// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title 内容分享合约接口
 * @notice 定义内容分享功能的标准接口
 */
interface IContentShare {
    // 内容结构体 - 只存储链上必要的支付信息
    struct Content {
        uint256 id; // 内容ID
        address creator; // 创作者地址
        string title; // 简短标题
        uint256 price; // 价格
    }

    // 事件
    event ContentCreated(uint256 indexed contentId, address indexed creator, uint256 price);

    event ContentUpdated(uint256 indexed contentId, uint256 price);

    event ContentPurchased(
        uint256 indexed contentId,
        address indexed buyer,
        address indexed creator,
        uint256 pricePaid,
        uint8 userGrade,
        uint256 discountApplied
    );

    event RevenueDistributed(
        uint256 indexed contentId,
        address indexed creator,
        uint256 creatorAmount,
        uint256 platformAmount,
        uint256 treasuryAmount
    );

    event WhitelistUserAdded(address indexed user);
    event WhitelistUserRemoved(address indexed user);
    event RevenueShareUpdated(uint256 creatorShare, uint256 platformShare, uint256 treasuryShare);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event RevenueWithdrawn(address indexed recipient, uint256 amount, string type_);

    // 函数
    function createContent(string calldata _title, uint256 _price) external returns (uint256);

    function updateContent(uint256 _contentId, string calldata _title, uint256 _price) external;

    function purchaseContent(uint256 _contentId) external;

    function updateGradeDiscount(uint8 _grade, uint256 _discount) external;

    function withdrawCreatorRevenue() external;

    function withdrawPlatformRevenue() external;

    function updateTreasury(address _newTreasury) external;

    // 查询函数

    function getContent(uint256 _contentId) external view returns (Content memory);

    function getCreatorRevenue(address _user) external view returns (uint256);

    function getPlatformRevenue() external view returns (uint256);

    function calculateActualPrice(uint256 _contentId, address _user) external view returns (uint256);
}
