// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CustomERC721 is ERC721, Ownable {
    string private _baseURIValue;
    uint256 public tokenCounter;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        _baseURIValue = baseURI;
        tokenCounter = 0;
    }

    function mint(address to) external onlyOwner {
        _safeMint(to, tokenCounter);
        tokenCounter++;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIValue;
    }
}