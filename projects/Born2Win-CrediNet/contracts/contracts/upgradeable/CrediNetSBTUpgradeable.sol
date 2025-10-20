// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "../interfaces/IDynamicSBTAgent.sol";

interface IIdentityRegistry_Up {
    function ownerOf(uint256 agentId) external view returns (address);
}
interface IReputationRegistry_Up {
    function getSummary(
        uint256 agentId,
        address[] calldata clients,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore);
}
interface IValidationRegistry_Up {
    function getValidationStatus(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validator,
            uint256 agentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        );
}

contract CrediNetSBTUpgradeable is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable
{
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    string public constant VERSION = "CrediNet SBT Up v1";

    string private _baseMetadataURI;
    uint256 private _nextTokenId;

    mapping(uint256 => uint8) private _tokenTypeOf;
    mapping(address => mapping(uint8 => bool)) private _hasBadge;
    mapping(address => mapping(uint8 => uint256)) private _tokenIdOf;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bytes32) public tokenValidationHash;

    // registries + thresholds
    address public identityRegistry;
    address public reputationRegistry;
    address public validationRegistry;
    uint8 public minAvgScore;
    uint8 public minValidationResponse;
    address public preferredValidator;
    bool public enforceRegistryChecks;
    mapping(address => uint256) public issuerAgentId;

    /// @dev DynamicSBTAgent 合约地址（用于动态元数据生成）
    address public dynamicAgent;

    /// @dev DynamicAgent 更新事件
    event DynamicAgentUpdated(
        address indexed oldAgent,
        address indexed newAgent
    );

    // EIP-5192
    event Locked(uint256 tokenId);

    // EIP-712 permit
    mapping(address => uint256) public nonces;
    bytes32 public constant MINT_TYPEHASH =
        keccak256(
            "Mint(address to,uint8 badgeType,string tokenURI,bytes32 requestHash,uint256 nonce,uint256 deadline)"
        );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address trustedForwarder,
        address _dynamicAgent
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        // Store trusted forwarder manually and override isTrustedForwarder
        __EIP712_init(name_, VERSION);

        _baseMetadataURI = baseURI_;
        trustedForwarderAddress = trustedForwarder;
        dynamicAgent = _dynamicAgent;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(GOVERNOR_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());

        minAvgScore = 0;
        minValidationResponse = 100;
    }

    // governance setters
    function setRegistries(
        address identity,
        address reputation,
        address validation
    ) external onlyRole(GOVERNOR_ROLE) {
        identityRegistry = identity;
        reputationRegistry = reputation;
        validationRegistry = validation;
    }

    // ERC2771
    address public trustedForwarderAddress;
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarderAddress;
    }
    function setThresholds(
        uint8 _minAvgScore,
        uint8 _minValidationResponse
    ) external onlyRole(GOVERNOR_ROLE) {
        require(
            _minAvgScore <= 100 && _minValidationResponse <= 100,
            "bad thresholds"
        );
        minAvgScore = _minAvgScore;
        minValidationResponse = _minValidationResponse;
    }
    function setPreferredValidator(address v) external onlyRole(GOVERNOR_ROLE) {
        preferredValidator = v;
    }
    function setIssuerAgentId(
        address issuer,
        uint256 agentId
    ) external onlyRole(GOVERNOR_ROLE) {
        issuerAgentId[issuer] = agentId;
    }
    function setEnforceRegistryChecks(
        bool enabled
    ) external onlyRole(GOVERNOR_ROLE) {
        enforceRegistryChecks = enabled;
    }
    function setBaseURI(
        string calldata newBaseURI
    ) external onlyRole(GOVERNOR_ROLE) {
        _baseMetadataURI = newBaseURI;
    }

    // core mint
    function mintBadgeWithValidation(
        address to,
        uint8 badgeType,
        string calldata tokenURI_,
        bytes32 requestHash
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256 tokenId) {
        tokenId = _mintBadgeInternal(to, badgeType, tokenURI_, requestHash);
    }

    function mintWithPermit(
        address issuer,
        address to,
        uint8 badgeType,
        string calldata tokenURI_,
        bytes32 requestHash,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 tokenId) {
        require(block.timestamp <= deadline, "expired");
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                to,
                badgeType,
                keccak256(bytes(tokenURI_)),
                requestHash,
                nonces[issuer]++,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        bool ok;
        if (issuer.code.length == 0) {
            address recovered = ECDSA.recover(digest, signature);
            ok = recovered == issuer;
        } else {
            try IERC1271(issuer).isValidSignature(digest, signature) returns (
                bytes4 magic
            ) {
                ok = (magic == 0x1626ba7e);
            } catch {
                ok = false;
            }
        }
        require(ok, "bad sig");
        require(hasRole(MINTER_ROLE, issuer), "no minter role");
        tokenId = _mintBadgeInternal(to, badgeType, tokenURI_, requestHash);
    }

    function _mintBadgeInternal(
        address to,
        uint8 badgeType,
        string memory tokenURI_,
        bytes32 requestHash
    ) internal returns (uint256 tokenId) {
        require(to != address(0), "to zero");
        require(!_hasBadge[to][badgeType], "already has");

        if (enforceRegistryChecks) {
            require(
                identityRegistry != address(0) &&
                    reputationRegistry != address(0) &&
                    validationRegistry != address(0),
                "regs not set"
            );
            uint256 agentId = issuerAgentId[_msgSender()];
            require(agentId != 0, "agentId not set");
            require(
                IIdentityRegistry_Up(identityRegistry).ownerOf(agentId) ==
                    _msgSender(),
                "agent owner mismatch"
            );
            (, uint8 avg) = IReputationRegistry_Up(reputationRegistry)
                .getSummary(agentId, new address[](0), bytes32(0), bytes32(0));
            require(avg >= minAvgScore, "rep low");
            require(requestHash != bytes32(0), "need hash");
            (address v, uint256 aid, uint8 resp, , ) = IValidationRegistry_Up(
                validationRegistry
            ).getValidationStatus(requestHash);
            require(aid == agentId, "agent mismatch");
            require(resp >= minValidationResponse, "val not pass");
            if (preferredValidator != address(0))
                require(v == preferredValidator, "validator mismatch");
        }

        unchecked {
            _nextTokenId++;
        }
        tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        _tokenTypeOf[tokenId] = badgeType;
        _hasBadge[to][badgeType] = true;
        _tokenIdOf[to][badgeType] = tokenId;
        if (bytes(tokenURI_).length > 0) {
            _tokenURIs[tokenId] = tokenURI_;
        }
        if (requestHash != bytes32(0)) {
            tokenValidationHash[tokenId] = requestHash;
        }

        // ✅ 注册到 DynamicSBTAgent（如果已配置）
        if (dynamicAgent != address(0)) {
            try IDynamicSBTAgent(dynamicAgent).registerSBT(to, tokenId) {
                // 注册成功
            } catch {
                // 忽略异常，避免阻断铸造流程
            }
        }

        emit Locked(tokenId);
    }

    // views
    function hasBadge(
        address user,
        uint8 badgeType
    ) external view returns (bool) {
        return _hasBadge[user][badgeType];
    }
    function getBadgeTokenId(
        address user,
        uint8 badgeType
    ) external view returns (uint256) {
        return _tokenIdOf[user][badgeType];
    }
    function tokenTypeOf(uint256 tokenId) external view returns (uint8) {
        require(_ownerOf(tokenId) != address(0), "no token");
        return _tokenTypeOf[tokenId];
    }
    function _baseURI() internal view override returns (string memory) {
        return _baseMetadataURI;
    }
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "no token");

        // ✅ 优先从 DynamicSBTAgent 读取动态元数据
        if (dynamicAgent != address(0)) {
            address owner = ownerOf(tokenId);
            try
                IDynamicSBTAgent(dynamicAgent).generateMetadata(owner, tokenId)
            returns (string memory uri) {
                if (bytes(uri).length > 0) {
                    return uri;
                }
            } catch {
                // 若 Agent 调用失败，回退到静态 URI
            }
        }

        // 回退到静态 URI
        string memory u = _tokenURIs[tokenId];
        if (bytes(u).length > 0) return u;
        return super.tokenURI(tokenId);
    }

    // non-transferable
    function approve(
        address,
        uint256
    ) public pure override(ERC721Upgradeable, IERC721) {
        revert("approve disabled");
    }
    function setApprovalForAll(
        address,
        bool
    ) public pure override(ERC721Upgradeable, IERC721) {
        revert("approval disabled");
    }
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert("transfer disabled");
        return ERC721EnumerableUpgradeable._update(to, tokenId, auth);
    }
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        ERC721EnumerableUpgradeable._increaseBalance(account, value);
    }

    // supports
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        if (interfaceId == 0xb45a3c0e) return true; // ERC-5192
        return super.supportsInterface(interfaceId);
    }

    // UUPS
    function _authorizeUpgrade(
        address
    ) internal override onlyRole(GOVERNOR_ROLE) {}

    // -----------------------------
    // DynamicSBTAgent 管理函数
    // -----------------------------

    /**
     * @notice 设置 DynamicSBTAgent 合约地址
     * @param _agent DynamicSBTAgent 合约地址
     */
    function setDynamicAgent(address _agent) external onlyRole(GOVERNOR_ROLE) {
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

    // ERC2771-like meta-tx support（基于 trustedForwarder 手工解析）
    function _msgSender()
        internal
        view
        override(ContextUpgradeable)
        returns (address sender)
    {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = super._msgSender();
        }
    }
    function _msgData()
        internal
        view
        override(ContextUpgradeable)
        returns (bytes calldata)
    {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        }
        return super._msgData();
    }
}
