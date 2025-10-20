// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Interface for the Bodhi contract
interface IBodhi {
    // ERC1155
    function balanceOf(address, uint256) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;

    // Bodhi - read
    function assets(uint256 assetId) external view returns (uint256 id, string memory arTxId, address creator);
    function assetIndex() external view returns (uint256);
    function totalSupply(uint256) external view returns (uint256);
    function getPrice(uint256 supply, uint256 amount) external pure returns (uint256);
    function getBuyPrice(uint256 assetId, uint256 amount) external view returns (uint256);
    function getBuyPriceAfterFee(uint256 assetId, uint256 amount) external view returns (uint256);
    function getSellPrice(uint256 assetId, uint256 amount) external view returns (uint256);
    function getSellPriceAfterFee(uint256 assetId, uint256 amount) external view returns (uint256);
    
    // Bodhi - write
    function create(string calldata arTxId) external;
    function remove(uint256 assetId) external;
    function buy(uint256 assetId, uint256 amount) external payable;
    function sell(uint256 assetId, uint256 amount) external;
}