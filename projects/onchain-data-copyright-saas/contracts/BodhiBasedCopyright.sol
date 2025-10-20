// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IBodhi.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// bodhi address: 0x2ad82a4e39bac43a54ddfe6f94980aaf0d1409ef

contract LicenseNFT is ERC721, ERC721Enumerable {
    // Events
    event LicenseCreated(uint256 indexed licenseId, string name, string link);

    // License metadata
    mapping(uint256 => string) private _names;
    mapping(uint256 => string) private _tokenURI;
    mapping(uint256 => uint256) private _bodhi_ids;
    // The link could be a link to the bodhi asset, link to the arweave asset, or any link else to the content.
    mapping(uint256 => string) private _cotent_links;
    uint256 public _nextTokenId;

    constructor() ERC721("License", "PRTCL") {
        _nextTokenId = 1;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // if bodhi_id is 0, then the license is not bodhi based
    function mint(address to, string memory name, string memory uri, string memory link, uint256 bodhi_id) external returns (uint256) {
        require(bytes(name).length > 0, "Empty name");
        uint256 tokenId = _nextTokenId++;
        _names[tokenId] = name;
        _tokenURI[tokenId] = uri;
        _cotent_links[tokenId] = link;
        _bodhi_ids[tokenId] = bodhi_id;
        _mint(to, tokenId);
        emit LicenseCreated(tokenId, name, link);
        return tokenId;
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        require(_ownerOf(id) != address(0), "Token does not exist");
        return _tokenURI[id];
    }

    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tokenOfOwnerByIndex(owner, i);
        }
        return result;
    }

    function getLicenseInfo(uint256 tokenId) external view returns (string memory name, string memory uri,string memory link, uint256 bodhi_id) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return (_names[tokenId], _tokenURI[tokenId], _cotent_links[tokenId], _bodhi_ids[tokenId]);
    }
}

contract CopyrightNFT is ERC721, ERC721Enumerable {
    // Events
    event CopyrightCreated(uint256 indexed copyrightId, string contentHash, string name, uint256 licenseId, string data_link, uint256 bodhi_id);

    // Copyright metadata
    struct CopyrightMetadata {
        string contentHash;
        string name;
        uint256 licenseId;
        string data_link;
        uint256 bodhi_id;
    }

    mapping(uint256 => CopyrightMetadata) private _metadata;
    mapping(uint256 => string) private _tokenURI;
    uint256 public _nextTokenId;
    LicenseNFT public immutable licenseContract;
    // IBodhi public immutable bodhi;

    constructor(address _licenseContract) ERC721("Copyright", "CPYRT") {
        licenseContract = LicenseNFT(_licenseContract);
        // bodhi = IBodhi(_bodhiAddress);
        _nextTokenId = 1;
    }


    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // if bodhi_id is 0, then the copyright is not bodhi based
    function mint(
        address to,
        string memory uri,
        string memory contentHash,
        string memory name,
        uint256 licenseId,
        string memory link,
        uint256 bodhi_id
    ) external returns (uint256) {
        require(address(licenseContract).code.length > 0, "License contract not deployed");
        require(licenseContract.ownerOf(licenseId) != address(0), "License does not exist");
        uint256 tokenId = _nextTokenId++;
        _metadata[tokenId] = CopyrightMetadata({
            contentHash: contentHash,
            name: name,
            licenseId: licenseId,
            data_link: link,
            bodhi_id: bodhi_id
        });

        _tokenURI[tokenId] = uri;
        _mint(to, tokenId);
        emit CopyrightCreated(tokenId, contentHash, name, licenseId, link, bodhi_id);
        return tokenId;
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        require(_ownerOf(id) != address(0), "Token does not exist");
        return _tokenURI[id];
    }

    function getCopyright(uint256 tokenId) external view returns (
        string memory name,
        string memory uri,
        string memory contentHash,
        uint256 licenseId,
        string memory data_link,
        uint256 bodhi_id
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        CopyrightMetadata memory metadata = _metadata[tokenId];
        return (
            metadata.name,
            _tokenURI[tokenId],
            metadata.contentHash,
            metadata.licenseId,
            metadata.data_link,
            metadata.bodhi_id
        );
    }

    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tokenOfOwnerByIndex(owner, i);
        }
        return result;
    }
}

contract BodhiBasedCopyright {
    LicenseNFT public immutable licenseNFT;
    CopyrightNFT public immutable copyrightNFT;
    

    constructor() {
        // Deploy the License NFT contract
        licenseNFT = new LicenseNFT();
        
        // Deploy the Copyright NFT contract with License NFT address and Bodhi address
        copyrightNFT = new CopyrightNFT(
            address(licenseNFT)
            // 0x2AD82A4E39Bac43A54DdfE6f94980AAf0D1409eF // Bodhi address
        );
    }

    /**
     * @dev Generate a new license NFT
     * @param _name Name of the license
     * @param _link Link to the license documentation
     * @return licenseId The ID of the newly created license NFT
     */
    function generateLicense(
        string calldata _name,
        string calldata _uri,
        string calldata _link,
        uint256 _bodhiId
    ) external returns (uint256) {
        return licenseNFT.mint(msg.sender, _name, _uri, _link, _bodhiId);
    }

    /**
     * @dev Generate a new copyright NFT
     * @param _contentHash Hash of the content
     * @param _name Name of the content (optional)
     * @param _licenseId ID of the license to use
     * @param _link Link to the content (optional)
     * @param _bodhiId The Bodhi asset ID (0 if not Bodhi-based)
     * @return copyrightId The ID of the newly created copyright NFT
     */
    function generateCopyright(
        string calldata _contentHash,
        string calldata _name,
        uint256 _licenseId,
        string calldata _uri,
        string calldata _link,
        uint256 _bodhiId
    ) external returns (uint256) {
        return copyrightNFT.mint(msg.sender, _uri, _contentHash, _name, _licenseId, _link, _bodhiId);
    }

    /**
     * @dev Get license information
     * @param _licenseId The ID of the license to query
     * @return name The name of the license
     * @return uri The token URI
     * @return link The link to the license documentation
     */
    function getLicense(uint256 _licenseId) external view returns (string memory name, string memory uri, string memory link, uint256 bodhi_id) {
        (name, uri, link, bodhi_id) = licenseNFT.getLicenseInfo(_licenseId);
    }

    /**
     * @dev Get copyright information
     * @param _copyrightId The ID of the copyright to query
     * @return name The name of the content
      * @return uri The token URI
    * @return contentHash The hash of the content
     * @return licenseId The ID of the license used
     * @return link The link to the content
     * @return bodhi_id The Bodhi asset ID (0 if not Bodhi-based)
     */
    function getCopyright(uint256 _copyrightId) external view returns (
        string memory name,
        string memory uri,
        string memory contentHash,
        uint256 licenseId,
        string memory link,
        uint256 bodhi_id
    ) {
        return copyrightNFT.getCopyright(_copyrightId);
    }
}