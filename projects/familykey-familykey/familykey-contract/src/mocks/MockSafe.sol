pragma solidity ^0.8.20;

contract MockSafe {
    address public Owner;
    mapping(address => bool) public modules;
    address internal constant SENTINEL = address(0x1);

    event ModuleEnabled(address module);
    event OwnerSwapped(address oldOwner, address newOwner);

    constructor(address initialOwner) {
        Owner = initialOwner;
    }

    function isOwner(address who) external view returns (bool) {
        return who == Owner;
    }

    function getOwners() external view returns (address[] memory Owners) {
        Owners = new address[](1);
        Owners[0] = Owner;
    }

    function enableModule(address module) external {
        require(msg.sender == Owner, "NOT_Owner");
        modules[module] = true;
        emit ModuleEnabled(module);
    }

    function execTransactionFromModule(
        address,
        uint256,
        bytes calldata data,
        uint8
    ) external returns (bool success) {
        require(modules[msg.sender], "MOD_DISABLED");
        // simulate Safe executing the call so that msg.sender == address(this)
        (success,) = address(this).call(data);
    }

    function swapOwner(address prevOwner, address oldOwner, address newOwner) external {
        require(msg.sender == address(this), "ONLY_SELF");
        require(prevOwner == SENTINEL, "BAD_PREV");
        require(oldOwner == Owner, "BAD_OLD");
        Owner = newOwner;
        emit OwnerSwapped(oldOwner, newOwner);
    }
}
