// Minimal Safe interface used by the module
pragma solidity ^0.8.20;

interface ISafe {
    function isOwner(address Owner) external view returns (bool);
    function getOwners() external view returns (address[] memory);
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external returns (bool success);
}

