// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DynamicSBTAgent
 * @notice Agent系统，根据五维信用评分动态更新SBT的元数据和形象
 * @dev 实现自动化的信用评分计算和SBT更新机制
 */
contract DynamicSBTAgent is AccessControl {
    using Strings for uint256;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // 五维信用评分结构
    struct CreditScore {
        uint16 keystone; // 基石维度 (0-1000)
        uint16 ability; // 能力维度 (0-1000)
        uint16 wealth; // 财富维度 (0-1000)
        uint16 health; // 健康维度 (0-1000)
        uint16 behavior; // 行为维度 (0-1000)
        uint32 lastUpdate; // 上次更新时间
        uint32 updateCount; // 更新次数
    }

    // 稀有度等级
    enum Rarity {
        COMMON, // 普通 (0-699)
        RARE, // 稀有 (700-799)
        EPIC, // 史诗 (800-899)
        LEGENDARY // 传说 (900-1000)
    }

    // 用户信用评分存储
    mapping(address => CreditScore) public userScores;

    // SBT Token ID 到地址的映射
    mapping(uint256 => address) public tokenOwners;

    // 地址到 Token ID 的映射
    mapping(address => uint256) public userTokenIds;

    // 权重配置（总和 = 100）
    uint8 public constant WEIGHT_KEYSTONE = 25;
    uint8 public constant WEIGHT_ABILITY = 30;
    uint8 public constant WEIGHT_WEALTH = 20;
    uint8 public constant WEIGHT_HEALTH = 15;
    uint8 public constant WEIGHT_BEHAVIOR = 10;

    // 事件
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

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    /**
     * @notice 更新用户的五维信用评分（由预言机调用）
     */
    function updateCreditScore(
        address user,
        uint16 keystone,
        uint16 ability,
        uint16 wealth,
        uint16 health,
        uint16 behavior
    ) external onlyRole(ORACLE_ROLE) {
        require(user != address(0), "Invalid user address");
        require(
            keystone <= 1000 &&
                ability <= 1000 &&
                wealth <= 1000 &&
                health <= 1000 &&
                behavior <= 1000,
            "Score out of range"
        );

        CreditScore storage score = userScores[user];
        score.keystone = keystone;
        score.ability = ability;
        score.wealth = wealth;
        score.health = health;
        score.behavior = behavior;
        score.lastUpdate = uint32(block.timestamp);
        score.updateCount++;

        uint16 totalScore = calculateTotalScore(user);
        uint256 tokenId = userTokenIds[user];

        emit ScoreUpdated(
            user,
            tokenId,
            keystone,
            ability,
            wealth,
            health,
            behavior,
            totalScore
        );

        // 自动触发SBT元数据更新
        if (tokenId > 0) {
            _triggerMetadataUpdate(user, tokenId, totalScore);
        }
    }

    /**
     * @notice 批量更新用户信用评分（Gas优化版本）
     */
    function batchUpdateCreditScores(
        address[] calldata users,
        uint16[] calldata keystones,
        uint16[] calldata abilities,
        uint16[] calldata wealths,
        uint16[] calldata healths,
        uint16[] calldata behaviors
    ) external onlyRole(ORACLE_ROLE) {
        require(users.length == keystones.length, "Length mismatch");
        require(users.length == abilities.length, "Length mismatch");
        require(users.length == wealths.length, "Length mismatch");
        require(users.length == healths.length, "Length mismatch");
        require(users.length == behaviors.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            require(user != address(0), "Invalid user address");

            CreditScore storage score = userScores[user];
            score.keystone = keystones[i];
            score.ability = abilities[i];
            score.wealth = wealths[i];
            score.health = healths[i];
            score.behavior = behaviors[i];
            score.lastUpdate = uint32(block.timestamp);
            score.updateCount++;

            uint16 totalScore = calculateTotalScore(user);
            uint256 tokenId = userTokenIds[user];

            emit ScoreUpdated(
                user,
                tokenId,
                keystones[i],
                abilities[i],
                wealths[i],
                healths[i],
                behaviors[i],
                totalScore
            );

            if (tokenId > 0) {
                _triggerMetadataUpdate(user, tokenId, totalScore);
            }
        }
    }

    /**
     * @notice 计算加权总分
     */
    function calculateTotalScore(address user) public view returns (uint16) {
        CreditScore memory score = userScores[user];

        uint32 weighted = uint32(score.keystone) *
            WEIGHT_KEYSTONE +
            uint32(score.ability) *
            WEIGHT_ABILITY +
            uint32(score.wealth) *
            WEIGHT_WEALTH +
            uint32(score.health) *
            WEIGHT_HEALTH +
            uint32(score.behavior) *
            WEIGHT_BEHAVIOR;

        return uint16(weighted / 100);
    }

    /**
     * @notice 根据总分获取稀有度等级
     */
    function getRarity(uint16 totalScore) public pure returns (Rarity) {
        if (totalScore >= 900) return Rarity.LEGENDARY;
        if (totalScore >= 800) return Rarity.EPIC;
        if (totalScore >= 700) return Rarity.RARE;
        return Rarity.COMMON;
    }

    /**
     * @notice 获取稀有度名称
     */
    function getRarityName(Rarity rarity) public pure returns (string memory) {
        if (rarity == Rarity.LEGENDARY) return "LEGENDARY";
        if (rarity == Rarity.EPIC) return "EPIC";
        if (rarity == Rarity.RARE) return "RARE";
        return "COMMON";
    }

    /**
     * @notice 生成动态的SBT元数据（链上生成）
     */
    function generateMetadata(
        address user,
        uint256 tokenId
    ) public view returns (string memory) {
        CreditScore memory score = userScores[user];
        uint16 totalScore = calculateTotalScore(user);
        Rarity rarity = getRarity(totalScore);

        // 构建JSON属性
        string memory attributes = string(
            abi.encodePacked(
                "[",
                _buildAttribute(
                    "C-Score",
                    uint256(totalScore).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute(
                    "Keystone",
                    uint256(score.keystone).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute(
                    "Ability",
                    uint256(score.ability).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute(
                    "Wealth",
                    uint256(score.wealth).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute(
                    "Health",
                    uint256(score.health).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute(
                    "Behavior",
                    uint256(score.behavior).toString(),
                    "number",
                    false
                ),
                ",",
                _buildAttribute("Rarity", getRarityName(rarity), "", true),
                ",",
                _buildAttribute(
                    "Updates",
                    uint256(score.updateCount).toString(),
                    "number",
                    false
                ),
                "]"
            )
        );

        // 根据稀有度选择图片
        string memory imageUrl = _getImageUrl(rarity);

        // 构建完整的JSON
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name": "CrediNet Badge #',
                tokenId.toString(),
                '",',
                '"description": "Dynamic Soulbound Token powered by CrediNet Five-Dimensional Credit System",',
                '"image": "',
                imageUrl,
                '",',
                '"attributes": ',
                attributes,
                "}"
            )
        );

        // Base64编码
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    /**
     * @notice 注册SBT（在铸造时由SBT合约调用）
     */
    function registerSBT(
        address user,
        uint256 tokenId
    ) external onlyRole(UPDATER_ROLE) {
        require(userTokenIds[user] == 0, "User already has SBT");
        tokenOwners[tokenId] = user;
        userTokenIds[user] = tokenId;

        // 初始化默认评分（如果尚未初始化）
        if (userScores[user].lastUpdate == 0) {
            userScores[user] = CreditScore({
                keystone: 500,
                ability: 500,
                wealth: 500,
                health: 500,
                behavior: 500,
                lastUpdate: uint32(block.timestamp),
                updateCount: 0
            });
        }
    }

    /**
     * @notice 手动触发元数据更新（用于测试或特殊情况）
     */
    function manualUpdateMetadata(
        address user
    ) external onlyRole(UPDATER_ROLE) {
        uint256 tokenId = userTokenIds[user];
        require(tokenId > 0, "User has no SBT");

        uint16 totalScore = calculateTotalScore(user);
        _triggerMetadataUpdate(user, tokenId, totalScore);

        emit AutoUpdateTriggered(user, tokenId, "Manual update");
    }

    /**
     * @notice 获取用户完整的信用信息
     */
    function getUserCreditInfo(
        address user
    )
        external
        view
        returns (
            CreditScore memory score,
            uint16 totalScore,
            Rarity rarity,
            uint256 tokenId
        )
    {
        score = userScores[user];
        totalScore = calculateTotalScore(user);
        rarity = getRarity(totalScore);
        tokenId = userTokenIds[user];
    }

    // ========== 内部函数 ==========

    function _triggerMetadataUpdate(
        address user,
        uint256 tokenId,
        uint16 totalScore
    ) internal {
        Rarity rarity = getRarity(totalScore);
        string memory metadataURI = generateMetadata(user, tokenId);

        emit SBTMetadataUpdated(tokenId, metadataURI, rarity);
    }

    function _buildAttribute(
        string memory traitType,
        string memory value,
        string memory displayType,
        bool wrapValueWithQuotes
    ) internal pure returns (string memory) {
        string memory formattedValue = wrapValueWithQuotes
            ? string(abi.encodePacked('"', value, '"'))
            : value;

        if (bytes(displayType).length > 0) {
            return
                string(
                    abi.encodePacked(
                        '{"trait_type":"',
                        traitType,
                        '","value":',
                        formattedValue,
                        ',"display_type":"',
                        displayType,
                        '"}'
                    )
                );
        }

        return
            string(
                abi.encodePacked(
                    '{"trait_type":"',
                    traitType,
                    '","value":',
                    formattedValue,
                    "}"
                )
            );
    }

    function _getImageUrl(Rarity rarity) internal pure returns (string memory) {
        // TODO: 替换为实际的 IPFS 图片链接
        if (rarity == Rarity.LEGENDARY) return "ipfs://QmLEGENDARY/badge.svg";
        if (rarity == Rarity.EPIC) return "ipfs://QmEPIC/badge.svg";
        if (rarity == Rarity.RARE) return "ipfs://QmRARE/badge.svg";
        return "ipfs://QmCOMMON/badge.svg";
    }
}
