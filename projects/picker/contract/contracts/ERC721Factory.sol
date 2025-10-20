// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC721Custom.sol";

contract ERC721Factory {
    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol
    );

    mapping(address => address[]) public userCollections;

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external returns (address) {
        CustomERC721 newCollection = new CustomERC721(
            name,
            symbol,
            baseURI,
            msg.sender
        );
        
        userCollections[msg.sender].push(address(newCollection));
        emit CollectionCreated(msg.sender, address(newCollection), name, symbol);
        
        return address(newCollection);
    }

    function getCollections(address user) external view returns (address[] memory) {
        return userCollections[user];
    }
}