// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

/// @title IdentityToken
/// @notice Minimal account-bound token (EIP-4973 inspired) for the reputation system.
contract IdentityToken is Ownable {
    string public constant name = "Creator Reputation Identity";
    string public constant symbol = "CRI";

    uint256 private _nextId = 1;
    mapping(address => uint256) private _tokenIdOf;
    mapping(uint256 => address) private _ownerOf;
    mapping(uint256 => string) private _tokenUri;

    event IdentityMinted(address indexed account, uint256 indexed tokenId, string metadataURI);

    error IdentityAlreadyExists();
    error IdentityDoesNotExist();
    error Soulbound();

    function hasIdentity(address account) public view returns (bool) {
        return _tokenIdOf[account] != 0;
    }

    function tokenIdOf(address account) external view returns (uint256) {
        uint256 tokenId = _tokenIdOf[account];
        if (tokenId == 0) revert IdentityDoesNotExist();
        return tokenId;
    }

    function balanceOf(address account) external view returns (uint256) {
        return hasIdentity(account) ? 1 : 0;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner_ = _ownerOf[tokenId];
        if (owner_ == address(0)) revert IdentityDoesNotExist();
        return owner_;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_ownerOf[tokenId] == address(0)) revert IdentityDoesNotExist();
        return _tokenUri[tokenId];
    }

    function mintSelf(string calldata metadataURI) external returns (uint256 tokenId) {
        return _attest(msg.sender, metadataURI);
    }

    function attest(address account, string calldata metadataURI) external onlyOwner returns (uint256 tokenId) {
        require(account != address(0), "IdentityToken: zero account");
        return _attest(account, metadataURI);
    }

    function _attest(address account, string calldata metadataURI) internal returns (uint256 tokenId) {
        if (hasIdentity(account)) revert IdentityAlreadyExists();

        tokenId = _nextId++;
        _tokenIdOf[account] = tokenId;
        _ownerOf[tokenId] = account;
        _tokenUri[tokenId] = metadataURI;

        emit IdentityMinted(account, tokenId, metadataURI);
    }

    // --- Soulbound ERC721 surface ------------------------------------------------------------

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert Soulbound();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7; // ERC165
    }
}
