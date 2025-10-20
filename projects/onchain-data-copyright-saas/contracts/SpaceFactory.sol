// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "./Space.sol";

contract SpaceFactory {
    event Create(uint256 spaceId, address indexed spaceAddress, uint256 indexed assetId, address creator, string spaceName);
    uint256 public spaceIndex = 0;
    mapping(uint256 => address) public spaces;
    function create(uint256 assetId, string calldata spaceName) public {
        Space newSpace = new Space(assetId, spaceName, msg.sender);
        spaces[spaceIndex] = address(newSpace);
        emit Create(spaceIndex, address(newSpace), assetId, msg.sender, spaceName);
        spaceIndex++;
    }
}