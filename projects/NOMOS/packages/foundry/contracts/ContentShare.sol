// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISoulboundUserNFT.sol";

/**
 * @title 内容分享合约
 * @notice 允许用户分享付费内容，支持白名单折扣和收益分配
 * @dev 集成用户NFT系统，提供内容创作和分享功能
 */
contract ContentShare is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 内容结构体 - 只存储链上必要的支付信息
    struct Content {
        uint256 id; // 内容ID
        address creator; // 创作者地址
        string title; // 简短标题
        uint256 price; // 价格
    }

    // 自定义错误
    error ContentShare_ContentNotFound(uint256 contentId);
    error ContentShare_InsufficientPayment(uint256 required, uint256 provided);
    error ContentShare_OnlyCreator(uint256 contentId);
    error ContentShare_NoRevenueToWithdraw();

    // 常量
    uint256 public constant BASIS_POINTS = 10000; // 100%

    // 等级折扣映射 (基于用户NFT等级)
    mapping(uint8 => uint256) public gradeDiscounts;

    // 平台代币
    IERC20 public immutable taskToken;

    // 用户NFT合约
    ISoulboundUserNFT public immutable userNFT;

    // 硬编码收益分配比例 (创作者90%, 平台10%)
    uint256 public constant CREATOR_SHARE = 9000; // 90%
    uint256 public constant PLATFORM_SHARE = 1000; // 10%

    // 存储 - 只保留必要的支付相关数据
    uint256 public contentCounter;
    mapping(uint256 => Content) public contents; // 只存储价格信息用于购买验证
    mapping(address => uint256) public creatorRevenue; // 用户收益（包括创作者和平台）

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
        uint256 indexed contentId, address indexed creator, uint256 creatorAmount, uint256 platformAmount
    );

    event GradeDiscountUpdated(uint8 grade, uint256 discount);
    event RevenueWithdrawn(address indexed recipient, uint256 amount, string type_);

    /**
     * @notice 构造函数
     * @param _taskToken 平台代币地址
     * @param _userNFT 用户NFT合约地址
     */
    constructor(IERC20 _taskToken, ISoulboundUserNFT _userNFT) Ownable(msg.sender) {
        taskToken = _taskToken;
        userNFT = _userNFT;

        // 初始化等级折扣
        // Poor (0): 无折扣
        gradeDiscounts[0] = 0;
        // Good (1): 10% 折扣
        gradeDiscounts[1] = 1000;
        // Excellent (2): 20% 折扣
        gradeDiscounts[2] = 2000;
    }

    /**
     * @notice 创建内容
     * @param _title 简短标题
     * @param _price 价格
     */
    function createContent(string calldata _title, uint256 _price) external returns (uint256) {
        // 检查用户是否拥有NFT
        require(userNFT.hasUserMintedNFT(msg.sender), "Must have user NFT");

        contentCounter++;
        uint256 contentId = contentCounter;

        contents[contentId] = Content({ id: contentId, creator: msg.sender, title: _title, price: _price });

        emit ContentCreated(contentId, msg.sender, _price);

        return contentId;
    }

    /**
     * @notice 更新内容
     * @param _contentId 内容ID
     * @param _title 新标题
     * @param _price 新价格
     */
    function updateContent(uint256 _contentId, string calldata _title, uint256 _price) external {
        Content storage content = contents[_contentId];

        if (content.id == 0) {
            revert ContentShare_ContentNotFound(_contentId);
        }

        if (content.creator != msg.sender) {
            revert ContentShare_OnlyCreator(_contentId);
        }

        content.title = _title;
        content.price = _price;

        emit ContentUpdated(_contentId, _price);
    }

    /**
     * @notice 购买内容
     * @param _contentId 内容ID
     */
    function purchaseContent(uint256 _contentId) external nonReentrant {
        Content memory content = contents[_contentId];

        if (content.id == 0) {
            revert ContentShare_ContentNotFound(_contentId);
        }

        // 检查用户是否拥有NFT
        require(userNFT.hasUserMintedNFT(msg.sender), "Must have user NFT");

        // 获取用户等级并计算实际支付价格
        uint8 userGrade = uint8(userNFT.getUserGrade(msg.sender));
        uint256 discount = gradeDiscounts[userGrade];
        uint256 actualPrice = content.price;

        if (discount > 0) {
            actualPrice = (content.price * (BASIS_POINTS - discount)) / BASIS_POINTS;
        }

        // 检查用户余额
        require(taskToken.balanceOf(msg.sender) >= actualPrice, "Insufficient balance");

        // 转移代币到合约
        taskToken.safeTransferFrom(msg.sender, address(this), actualPrice);

        // 分配收益
        _distributeRevenue(_contentId, actualPrice, content.creator);

        emit ContentPurchased(_contentId, msg.sender, content.creator, actualPrice, userGrade, discount);
    }

    /**
     * @notice 分配收益
     * @param _contentId 内容ID
     * @param _amount 收益金额
     * @param _creator 创作者地址
     */
    function _distributeRevenue(uint256 _contentId, uint256 _amount, address _creator) internal {
        uint256 creatorAmount = (_amount * CREATOR_SHARE) / BASIS_POINTS;
        uint256 platformAmount = (_amount * PLATFORM_SHARE) / BASIS_POINTS;

        // 记账模式：记录收益，不直接转账
        creatorRevenue[_creator] += creatorAmount;
        creatorRevenue[owner()] += platformAmount;

        emit RevenueDistributed(_contentId, _creator, creatorAmount, platformAmount);
    }

    /**
     * @notice 更新等级折扣
     * @param _grade 用户等级
     * @param _discount 折扣(基点)
     */
    function updateGradeDiscount(uint8 _grade, uint256 _discount) external onlyOwner {
        require(_discount <= 5000, "Discount cannot exceed 50%");
        gradeDiscounts[_grade] = _discount;
        emit GradeDiscountUpdated(_grade, _discount);
    }

    /**
     * @notice 提取用户收益（包括创作者和平台）
     */
    function withdrawRevenue() external nonReentrant {
        uint256 amount = creatorRevenue[msg.sender];
        if (amount == 0) {
            revert ContentShare_NoRevenueToWithdraw();
        }

        creatorRevenue[msg.sender] = 0;
        taskToken.safeTransfer(msg.sender, amount);

        emit RevenueWithdrawn(msg.sender, amount, "revenue");
    }

    /**
     * @notice 获取内容详情
     * @param _contentId 内容ID
     * @return 内容结构体
     */
    function getContent(uint256 _contentId) external view returns (Content memory) {
        return contents[_contentId];
    }

    /**
     * @notice 获取用户收益（包括创作者和平台）
     * @param _user 用户地址
     * @return 用户收益
     */
    function getRevenue(address _user) external view returns (uint256) {
        return creatorRevenue[_user];
    }
}
