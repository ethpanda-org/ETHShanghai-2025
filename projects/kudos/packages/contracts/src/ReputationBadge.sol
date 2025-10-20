// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

/// @title ReputationBadge
/// @notice Non-transferable badge tokens mapped to rule identifiers.
contract ReputationBadge is Ownable {
    string public constant name = "Creator Reputation Badge";
    string public constant symbol = "CRB";

    uint256 private _nextBadgeId = 1;

    mapping(uint256 => address) private _badgeOwner;
    mapping(uint256 => uint256) private _badgeRule;
    mapping(uint256 => string) private _badgeUri;
    mapping(address => uint256[]) private _ownedBadges;
    mapping(address => mapping(uint256 => bool)) private _hasBadgeByRule;

    event BadgeMinted(address indexed account, uint256 indexed ruleId, uint256 badgeId, string metadataURI);

    error BadgeAlreadyClaimed(uint256 ruleId);
    error BadgeNotFound(uint256 badgeId);
    error Soulbound();

    function issueBadge(address account, uint256 ruleId, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 badgeId)
    {
        require(account != address(0), "ReputationBadge: zero account");
        if (_hasBadgeByRule[account][ruleId]) revert BadgeAlreadyClaimed(ruleId);

        badgeId = _nextBadgeId++;
        _badgeOwner[badgeId] = account;
        _badgeRule[badgeId] = ruleId;
        _badgeUri[badgeId] = metadataURI;
        _ownedBadges[account].push(badgeId);
        _hasBadgeByRule[account][ruleId] = true;

        emit BadgeMinted(account, ruleId, badgeId, metadataURI);
    }

    function hasBadge(address account, uint256 ruleId) external view returns (bool) {
        return _hasBadgeByRule[account][ruleId];
    }

    function badgeIdsOf(address account) external view returns (uint256[] memory) {
        return _ownedBadges[account];
    }

    function badgeURI(uint256 badgeId) external view returns (string memory) {
        if (_badgeOwner[badgeId] == address(0)) revert BadgeNotFound(badgeId);
        return _badgeUri[badgeId];
    }

    function badgeRule(uint256 badgeId) external view returns (uint256) {
        if (_badgeOwner[badgeId] == address(0)) revert BadgeNotFound(badgeId);
        return _badgeRule[badgeId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextBadgeId - 1;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _ownedBadges[account].length;
    }

    function ownerOf(uint256 badgeId) public view returns (address) {
        address owner_ = _badgeOwner[badgeId];
        if (owner_ == address(0)) revert BadgeNotFound(badgeId);
        return owner_;
    }

    // --- Soulbound surface -------------------------------------------------------------------

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
