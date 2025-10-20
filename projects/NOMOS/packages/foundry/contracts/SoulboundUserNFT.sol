// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title Soulbound User NFT
 * @notice 灵魂绑定用户身份NFT，支持扫码铸造功能
 * @dev 基于ERC721标准，实现不可转移、不可销毁的灵魂NFT
 * @dev 用于用户身份认证和成就展示，一旦铸造就永久绑定到用户地址
 */
contract SoulboundUserNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // 等级枚举
    enum UserGrade {
        Poor, // 差 (0)
        Good, // 良 (1)
        Excellent // 优 (2)

    }

    /**
     * @notice 等级信息结构体
     */
    struct GradeInfo {
        string title;
        string color;
        string icon;
        string bgColor1;
        string bgColor2;
    }

    // 自定义错误
    error SoulboundNFT_UserAlreadyMinted();
    error SoulboundNFT_TransferNotAllowed();

    // 用户NFT元数据结构
    struct UserMetadata {
        uint256 tokenId; // NFT tokenId（不可修改）
        address userAddress; // 用户地址（不可修改）
        string username; // 用户名（不可修改）
        string email; // 用户邮箱（不可修改）
        UserGrade grade; // 用户等级（仅所有者可修改）
        uint256 createdAt; // 创建时间（不可修改）
    }

    // 灵魂NFT标识符
    string public constant SOULBOUND_TYPE = "Soulbound User Identity";
    uint256 public constant SOULBOUND_VERSION = 1;

    // 存储
    mapping(address => UserMetadata) public userMetadata; // 用户地址直接映射到元数据
    uint256 public totalSupply; // 总供应量

    // 事件
    event SoulboundNFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        string username,
        string email,
        string bio,
        string avatar,
        string[] skills,
        UserGrade grade
    );

    event UserProfileUpdated(address indexed user, uint256 indexed tokenId, string bio, string avatar, string[] skills);

    event UserGradeUpdated(address indexed user, uint256 indexed tokenId, UserGrade newGrade);

    /**
     * @notice 构造函数
     * @param name NFT名称
     * @param symbol NFT符号
     */
    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) { }

    /**
     * @notice 铸造用户NFT（任何人都可以铸造，但都是新手游民等级）
     * @param username 用户名
     * @param email 用户邮箱
     * @param bio 用户简介
     * @param avatar 头像URL
     * @param skills 用户技能
     */
    function mintUserNFT(
        string calldata username,
        string calldata email,
        string calldata bio,
        string calldata avatar,
        string[] calldata skills
    ) external {
        address userAddress = msg.sender;

        // 验证用户是否已经铸造过（检查元数据是否存在）
        if (userMetadata[userAddress].tokenId != 0) {
            revert SoulboundNFT_UserAlreadyMinted();
        }

        _executeMint(
            userAddress,
            username,
            email,
            bio,
            avatar,
            skills,
            UserGrade.Poor // 所有新铸造的NFT都是新手游民
        );
    }

    /**
     * @notice 执行NFT铸造
     */
    function _executeMint(
        address userAddress,
        string calldata username,
        string calldata email,
        string calldata bio,
        string calldata avatar,
        string[] calldata skills,
        UserGrade initialGrade
    ) internal {
        // 铸造NFT
        totalSupply++;
        uint256 tokenId = totalSupply;

        // 存储用户元数据（直接通过地址映射）
        userMetadata[userAddress] = UserMetadata({
            tokenId: tokenId,
            userAddress: userAddress,
            username: username,
            email: email,
            grade: initialGrade, // 使用传入的初始等级
            createdAt: block.timestamp
        });

        // 铸造NFT
        _safeMint(userAddress, tokenId);

        // 设置token URI
        string memory newTokenURI = _generateTokenURIByAddress(userAddress);
        _setTokenURI(tokenId, newTokenURI);

        emit SoulboundNFTMinted(userAddress, tokenId, username, email, bio, avatar, skills, initialGrade);
    }

    /**
     * @notice 重写transferFrom函数，禁止转移
     * @dev 灵魂NFT一旦铸造就无法转移，永久绑定到用户地址
     */
    function transferFrom(address, address, uint256) public override(ERC721, IERC721) {
        revert SoulboundNFT_TransferNotAllowed();
    }

    /**
     * @notice 重写safeTransferFrom函数，禁止转移
     * @dev 灵魂NFT一旦铸造就无法转移，永久绑定到用户地址
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public override(ERC721, IERC721) {
        revert SoulboundNFT_TransferNotAllowed();
    }

    /**
     * @notice 重写approve函数，禁止授权转移
     * @dev 灵魂NFT无法授权给其他地址转移
     */
    function approve(address, uint256) public override(ERC721, IERC721) {
        revert SoulboundNFT_TransferNotAllowed();
    }

    /**
     * @notice 重写setApprovalForAll函数，禁止授权转移
     * @dev 灵魂NFT无法授权给其他地址转移
     */
    function setApprovalForAll(address, bool) public override(ERC721, IERC721) {
        revert SoulboundNFT_TransferNotAllowed();
    }

    /**
     * @notice 更新用户资料（通过事件记录）
     * @param bio 新简介
     * @param avatar 新头像
     * @param skills 新技能列表
     */
    function updateUserProfile(string calldata bio, string calldata avatar, string[] calldata skills) external {
        UserMetadata memory metadata = userMetadata[msg.sender];
        require(metadata.tokenId > 0, "User has no NFT");

        // 通过事件记录更新，不存储到链上
        emit UserProfileUpdated(msg.sender, metadata.tokenId, bio, avatar, skills);
    }

    /**
     * @notice 更新用户等级（仅所有者）
     * @param userAddress 用户地址
     * @param newGrade 新等级
     */
    function updateUserGrade(address userAddress, UserGrade newGrade) external onlyOwner {
        UserMetadata storage metadata = userMetadata[userAddress];
        require(metadata.tokenId > 0, "User has no NFT");

        metadata.grade = newGrade;

        // 更新token URI
        string memory updatedTokenURI = _generateTokenURIByAddress(userAddress);
        _setTokenURI(metadata.tokenId, updatedTokenURI);

        emit UserGradeUpdated(userAddress, metadata.tokenId, newGrade);
    }

    /**
     * @notice 获取等级相关信息
     */
    function _getGradeInfo(UserGrade grade) internal pure returns (GradeInfo memory) {
        if (grade == UserGrade.Poor) {
            return GradeInfo({
                title: unicode"新手游民",
                color: "#4CAF50",
                icon: unicode"🌱",
                bgColor1: "#E8F5E8",
                bgColor2: "#C8E6C9"
            });
        } else if (grade == UserGrade.Good) {
            return GradeInfo({
                title: unicode"资深游民",
                color: "#2196F3",
                icon: unicode"✈️",
                bgColor1: "#E3F2FD",
                bgColor2: "#BBDEFB"
            });
        } else {
            return GradeInfo({
                title: unicode"顶级游民",
                color: "#FF9800",
                icon: unicode"👑",
                bgColor1: "#FFF3E0",
                bgColor2: "#FFE0B2"
            });
        }
    }

    /**
     * @notice 将用户等级枚举转换为字符串
     */
    function _gradeToString(UserGrade grade) internal pure returns (string memory) {
        return _getGradeInfo(grade).title;
    }

    /**
     * @notice 生成数字游民主题SVG图片（Base64编码）- 根据等级生成不同设计
     */
    function _generateSVGImage(UserMetadata memory metadata) internal pure returns (string memory) {
        if (metadata.grade == UserGrade.Poor) {
            return _generatePoorGradeNFT(metadata);
        } else if (metadata.grade == UserGrade.Good) {
            return _generateGoodGradeNFT(metadata);
        } else {
            return _generateExcellentGradeNFT(metadata);
        }
    }

    /**
     * @notice 生成新手游民等级NFT - 简化版本
     */
    function _generatePoorGradeNFT(UserMetadata memory metadata) internal pure returns (string memory) {
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#E8F5E8"/>',
                '<text x="200" y="200" text-anchor="middle" font-size="80">',
                unicode"🌱",
                "</text>",
                '<text x="200" y="100" text-anchor="middle" font-size="28" fill="#4CAF50">',
                unicode"新手游民",
                "</text>",
                '<text x="200" y="320" text-anchor="middle" font-size="20" fill="#333">',
                metadata.username,
                "</text>",
                '<text x="200" y="350" text-anchor="middle" font-size="12" fill="#999">',
                _formatTimestamp(metadata.createdAt),
                "</text>",
                "</svg>"
            )
        );
        return Base64.encode(bytes(svg));
    }

    /**
     * @notice 生成资深游民等级NFT - 简化版本
     */
    function _generateGoodGradeNFT(UserMetadata memory metadata) internal pure returns (string memory) {
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#E3F2FD"/>',
                '<text x="200" y="200" text-anchor="middle" font-size="80">',
                unicode"✈️",
                "</text>",
                '<text x="200" y="100" text-anchor="middle" font-size="28" fill="#2196F3">',
                unicode"资深游民",
                "</text>",
                '<text x="200" y="320" text-anchor="middle" font-size="20" fill="#333">',
                metadata.username,
                "</text>",
                '<text x="200" y="350" text-anchor="middle" font-size="12" fill="#999">',
                _formatTimestamp(metadata.createdAt),
                "</text>",
                "</svg>"
            )
        );
        return Base64.encode(bytes(svg));
    }

    /**
     * @notice 生成顶级游民等级NFT - 简化版本
     */
    function _generateExcellentGradeNFT(UserMetadata memory metadata) internal pure returns (string memory) {
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#FFF3E0"/>',
                '<text x="200" y="200" text-anchor="middle" font-size="80">',
                unicode"👑",
                "</text>",
                '<text x="200" y="100" text-anchor="middle" font-size="28" fill="#FF9800">',
                unicode"顶级游民",
                "</text>",
                '<text x="200" y="320" text-anchor="middle" font-size="20" fill="#333">',
                metadata.username,
                "</text>",
                '<text x="200" y="350" text-anchor="middle" font-size="12" fill="#999">',
                _formatTimestamp(metadata.createdAt),
                "</text>",
                "</svg>"
            )
        );
        return Base64.encode(bytes(svg));
    }

    /**
     * @notice 格式化时间戳为可读格式
     */
    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        return string(abi.encodePacked("Joined: ", Strings.toString(timestamp)));
    }

    /**
     * @notice 生成token URI（通过用户地址）
     */
    function _generateTokenURIByAddress(address userAddress) internal view returns (string memory) {
        UserMetadata memory metadata = userMetadata[userAddress];

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    abi.encodePacked(
                        '{"name":"',
                        metadata.username,
                        '",',
                        '"description":"Soulbound User Identity NFT",',
                        '"image":"data:image/svg+xml;base64,',
                        _generateSVGImage(metadata),
                        '",',
                        '"external_url":"https://soulbound-nft.com",',
                        '"attributes":[',
                        '{"trait_type":"Soulbound Type","value":"',
                        SOULBOUND_TYPE,
                        '"},',
                        '{"trait_type":"Soulbound Version","value":"',
                        Strings.toString(SOULBOUND_VERSION),
                        '"},',
                        '{"trait_type":"Grade","value":"',
                        _gradeToString(metadata.grade),
                        '"},',
                        '{"trait_type":"Created At","value":"',
                        Strings.toString(metadata.createdAt),
                        '"}',
                        "]}"
                    )
                )
            )
        );
    }

    /**
     * @notice 获取用户NFT元数据（通过地址）
     */
    function getUserMetadata(address userAddress) external view returns (UserMetadata memory) {
        return userMetadata[userAddress];
    }

    /**
     * @notice 根据用户地址获取tokenId
     */
    function getTokenIdByUser(address user) external view returns (uint256) {
        return userMetadata[user].tokenId;
    }

    /**
     * @notice 检查用户是否已铸造NFT
     */
    function hasUserMintedNFT(address user) external view returns (bool) {
        return userMetadata[user].tokenId > 0;
    }

    /**
     * @notice 获取灵魂NFT类型
     */
    function getSoulboundType() external pure returns (string memory) {
        return SOULBOUND_TYPE;
    }

    /**
     * @notice 获取灵魂NFT版本
     */
    function getSoulboundVersion() external pure returns (uint256) {
        return SOULBOUND_VERSION;
    }

    /**
     * @notice 检查地址是否拥有灵魂NFT
     */
    function hasSoulboundNFT(address user) external view returns (bool) {
        return userMetadata[user].tokenId > 0;
    }

    /**
     * @notice 获取用户等级（字符串形式，通过地址）
     */
    function getUserGradeString(address userAddress) external view returns (string memory) {
        UserMetadata memory metadata = userMetadata[userAddress];
        return _gradeToString(metadata.grade);
    }

    /**
     * @notice 获取用户等级（枚举形式，通过地址）
     */
    function getUserGrade(address userAddress) external view returns (UserGrade) {
        return userMetadata[userAddress].grade;
    }

    // 重写函数
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
