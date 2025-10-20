// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IDynamicSBTAgent.sol";
// Counters removed in OZ v5; use a simple incrementing id instead

/// @notice ERC-8004 三表接口定义（对接而非继承）
interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
    function tokenURI(uint256 agentId) external view returns (string memory);
}
interface IReputationRegistry {
    function getSummary(uint256 agentId, address[] calldata clients, bytes32 tag1, bytes32 tag2)
        external view returns (uint64 count, uint8 averageScore);
}
interface IValidationRegistry {
    function validationRequest(address validator, uint256 agentId, string calldata uri, bytes32 hash) external;
    function getValidationStatus(bytes32 requestHash)
        external view returns (address validator, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate);
}

/// @title CrediNet Soulbound Badge Token (SBT)
/// @notice 不可转让的 ERC-721 徽章，支持多类型，每地址每类型唯一，含查询、批量铸造与（可选）撤销接口
contract CrediNetSBT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {

    /// @dev 版本号便于运维识别
    string public constant VERSION = "CrediNet SBT v1.0";

    /// @dev 自增 tokenId 计数器（从 1 开始）
    uint256 private _nextTokenId;

    /// @dev tokenId => 徽章类型（uint8）
    mapping(uint256 => uint8) private _tokenTypeOf;

    /// @dev user => type => 是否持有
    mapping(address => mapping(uint8 => bool)) private _hasBadge;

    /// @dev user => type => tokenId（0 表示无）
    mapping(address => mapping(uint8 => uint256)) private _tokenIdOf;

    /// @dev 可选的 tokenId => tokenURI 存储；若为空，则按基URI+类型/ID组合
    mapping(uint256 => string) private _tokenURIs;

    /// @dev 基础元数据 URI（可选，例如 IPFS 网关），前端可基于类型渲染
    string private _baseMetadataURI;

    /// @dev 事件：铸造与销毁
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint8 badgeType);
    event BadgeBurned(address indexed owner, uint256 indexed tokenId, uint8 badgeType);
    event BadgeMintedWithValidation(address indexed to, uint256 indexed tokenId, uint8 badgeType, bytes32 requestHash, address validator, uint256 agentId);

    // -----------------------------
    // ERC-5192: 最小锁定接口（Soulbound 标记）
    // interface id: 0xb45a3c0e
    // -----------------------------
    event Locked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /// @dev 三表地址与治理参数
    address public identityRegistry;
    address public reputationRegistry;
    address public validationRegistry;
    uint8 public minAvgScore; // 0-100
    uint8 public minValidationResponse; // 通过阈值，默认 100
    address public preferredValidator; // 可选
    bool public enforceRegistryChecks; // 生产开启

    /// @dev 发行者 => agentId（来自 IdentityRegistry）
    mapping(address => uint256) public issuerAgentId;

    /// @dev tokenId => 验证请求哈希 requestHash（来自 ValidationRegistry）
    mapping(uint256 => bytes32) public tokenValidationHash;

    /// @dev DynamicSBTAgent 合约地址（用于动态元数据生成）
    address public dynamicAgent;

    /// @dev DynamicAgent 更新事件
    event DynamicAgentUpdated(address indexed oldAgent, address indexed newAgent);

    constructor(string memory name_, string memory symbol_, string memory baseURI_) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseMetadataURI = baseURI_;
    }

    // -----------------------------
    // 不可转让机制（SBT核心）
    // 使用 _update 钩子拦截非铸造/销毁转移
    // -----------------------------

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("SBT: approve disabled");
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("SBT: setApprovalForAll disabled");
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        // 仅允许铸造（from==0）和销毁（to==0）
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("SBT: transfer disabled");
        }
        return ERC721Enumerable._update(to, tokenId, auth);
    }

    // -----------------------------
    // 铸造 / 批量铸造 / 撤销
    // -----------------------------

    /// @notice 铸造单个徽章（仅管理员）
    function mintBadge(address to, uint8 badgeType, string calldata tokenURI_) external onlyOwner nonReentrant returns (uint256 tokenId) {
        tokenId = _mintBadgeInternal(to, badgeType, tokenURI_, bytes32(0));
    }

    /// @notice 带验证强绑定的铸造（推荐生产使用）
    function mintBadgeWithValidation(address to, uint8 badgeType, string calldata tokenURI_, bytes32 requestHash) external onlyOwner nonReentrant returns (uint256 tokenId) {
        tokenId = _mintBadgeInternal(to, badgeType, tokenURI_, requestHash);
    }

    function _mintBadgeInternal(address to, uint8 badgeType, string memory tokenURI_, bytes32 requestHash) internal returns (uint256 tokenId) {
        require(to != address(0), "SBT: to zero address");
        require(!_hasBadge[to][badgeType], "SBT: already has type");

        if (enforceRegistryChecks) {
            require(identityRegistry != address(0) && reputationRegistry != address(0) && validationRegistry != address(0), "SBT: registries not set");
            uint256 agentId = issuerAgentId[msg.sender];
            require(agentId != 0, "SBT: issuer agentId not set");
            // 验证 issuer 拥有该 agentId
            require(IIdentityRegistry(identityRegistry).ownerOf(agentId) == msg.sender, "SBT: agentId owner mismatch");
            // 声誉阈值
            (, uint8 avg) = IReputationRegistry(reputationRegistry).getSummary(agentId, new address[](0), bytes32(0), bytes32(0));
            require(avg >= minAvgScore, "SBT: reputation below threshold");
            // 验证闭环
            require(requestHash != bytes32(0), "SBT: requestHash required");
            (address v, uint256 aid, uint8 resp,,) = IValidationRegistry(validationRegistry).getValidationStatus(requestHash);
            require(aid == agentId, "SBT: validation agent mismatch");
            require(resp >= minValidationResponse, "SBT: validation not passed");
            if (preferredValidator != address(0)) {
                require(v == preferredValidator, "SBT: validator mismatch");
            }
        }

        unchecked { _nextTokenId++; }
        tokenId = _nextTokenId;

        _safeMint(to, tokenId);
        _tokenTypeOf[tokenId] = badgeType;
        _hasBadge[to][badgeType] = true;
        _tokenIdOf[to][badgeType] = tokenId;

        if (bytes(tokenURI_).length > 0) {
            _tokenURIs[tokenId] = tokenURI_;
        }

        // 绑定验证哈希（若提供）
        if (requestHash != bytes32(0)) {
            tokenValidationHash[tokenId] = requestHash;
        }

        // ✅ 注册到 DynamicSBTAgent（如果已配置）
        // 使用 try-catch 避免注册失败导致铸造回滚
        if (dynamicAgent != address(0)) {
            try IDynamicSBTAgent(dynamicAgent).registerSBT(to, tokenId) {
                // 注册成功
            } catch {
                // 注册失败，但不影响铸造
                // 可以手动调用 registerSBT 或在后续更新时重试
            }
        }

        emit BadgeMinted(to, tokenId, badgeType);
        if (requestHash != bytes32(0)) {
            address vEmit = address(0);
            uint256 aidEmit = 0;
            if (enforceRegistryChecks) {
                aidEmit = issuerAgentId[msg.sender];
                (address v,, , ,) = IValidationRegistry(validationRegistry).getValidationStatus(requestHash);
                vEmit = v;
            }
            emit BadgeMintedWithValidation(to, tokenId, badgeType, requestHash, vEmit, aidEmit);
        }
        // ERC-5192: 永久锁定
        emit Locked(tokenId);
    }

    /// @notice 批量铸造同类型徽章（仅管理员）
    function batchMintBadges(address[] calldata recipients, uint8 badgeType, string calldata tokenURI_) external onlyOwner nonReentrant returns (uint256[] memory tokenIds) {
        require(recipients.length > 0, "SBT: empty recipients");
        tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = _mintBadgeInternal(recipients[i], badgeType, tokenURI_, bytes32(0));
        }
    }

    function batchMintBadgesWithValidation(address[] calldata recipients, uint8 badgeType, string calldata tokenURI_, bytes32[] calldata requestHashes) external onlyOwner nonReentrant returns (uint256[] memory tokenIds) {
        require(recipients.length > 0 && recipients.length == requestHashes.length, "SBT: bad args");
        tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = _mintBadgeInternal(recipients[i], badgeType, tokenURI_, requestHashes[i]);
        }
    }

    /// @notice 撤销/销毁徽章（仅管理员）
    function burnBadge(uint256 tokenId) external onlyOwner nonReentrant {
        address owner = ownerOf(tokenId);
        uint8 badgeType = _tokenTypeOf[tokenId];

        _burn(tokenId);

        _hasBadge[owner][badgeType] = false;
        _tokenIdOf[owner][badgeType] = 0;
        delete _tokenTypeOf[tokenId];
        delete _tokenURIs[tokenId];

        emit BadgeBurned(owner, tokenId, badgeType);
    }

    // -----------------------------
    // 查询接口
    // -----------------------------
    function hasBadge(address user, uint8 badgeType) external view returns (bool) {
        return _hasBadge[user][badgeType];
    }

    function getBadgeTokenId(address user, uint8 badgeType) external view returns (uint256) {
        return _tokenIdOf[user][badgeType];
    }

    function getBadges(address user) external view returns (uint8[] memory) {
        uint256 count = balanceOf(user);
        uint8[] memory typesHeld = new uint8[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            typesHeld[i] = _tokenTypeOf[tokenId];
        }
        return typesHeld;
    }

    // -----------------------------
    // 元数据
    // -----------------------------
    function _baseURI() internal view override returns (string memory) {
        return _baseMetadataURI;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseMetadataURI = newBaseURI;
    }

    function tokenTypeOf(uint256 tokenId) external view returns (uint8) {
        require(_ownerOf(tokenId) != address(0), "SBT: query for nonexistent token");
        return _tokenTypeOf[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SBT: URI query for nonexistent token");
        
        // ✅ 优先从 DynamicSBTAgent 读取动态元数据
        // 使用 try-catch 避免 Agent 合约异常导致 tokenURI 失败
        if (dynamicAgent != address(0)) {
            try IDynamicSBTAgent(dynamicAgent).generateMetadata(ownerOf(tokenId), tokenId) returns (string memory uri) {
                if (bytes(uri).length > 0) {
                    return uri;
                }
            } catch {
                // Agent 调用失败，回退到静态 URI
            }
        }
        
        // 回退到静态 URI
        string memory u = _tokenURIs[tokenId];
        if (bytes(u).length > 0) return u;
        return super.tokenURI(tokenId);
    }

    function tokenValidationHashOf(uint256 tokenId) external view returns (bytes32) {
        require(_ownerOf(tokenId) != address(0), "SBT: query for nonexistent token");
        return tokenValidationHash[tokenId];
    }

    // -----------------------------
    // ERC-165 / 多重继承支持
    // -----------------------------
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        // ERC-5192 = 0xb45a3c0e
        if (interfaceId == 0xb45a3c0e) return true;
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._increaseBalance(account, value);
    }

    // -----------------------------
    // 管理员函数（治理）
    // -----------------------------
    function setRegistries(address identity, address reputation, address validation) external onlyOwner {
        identityRegistry = identity;
        reputationRegistry = reputation;
        validationRegistry = validation;
    }

    function setThresholds(uint8 _minAvgScore, uint8 _minValidationResponse) external onlyOwner {
        require(_minAvgScore <= 100 && _minValidationResponse <= 100, "SBT: bad thresholds");
        minAvgScore = _minAvgScore;
        minValidationResponse = _minValidationResponse;
    }

    function setPreferredValidator(address v) external onlyOwner {
        preferredValidator = v;
    }

    function setIssuerAgentId(address issuer, uint256 agentId) external onlyOwner {
        issuerAgentId[issuer] = agentId;
    }

    function setEnforceRegistryChecks(bool enabled) external onlyOwner {
        enforceRegistryChecks = enabled;
    }

    // -----------------------------
    // DynamicSBTAgent 管理函数
    // -----------------------------

    /**
     * @notice 设置 DynamicSBTAgent 合约地址
     * @param _agent DynamicSBTAgent 合约地址
     */
    function setDynamicAgent(address _agent) external onlyOwner {
        address oldAgent = dynamicAgent;
        dynamicAgent = _agent;
        emit DynamicAgentUpdated(oldAgent, _agent);
    }

    /**
     * @notice 获取 DynamicSBTAgent 合约地址
     */
    function getDynamicAgent() external view returns (address) {
        return dynamicAgent;
    }
}


