// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import {ERC1155TokenReceiver} from "./ERC1155.sol";
import "./IBodhi.sol";

contract Space is ERC1155TokenReceiver {
    event Create(uint256 indexed parentId, uint256 indexed assetId, address indexed sender);
    event Remove(uint256 indexed assetId);

    IBodhi public constant bodhi = IBodhi(0x2AD82A4E39Bac43A54DdfE6f94980AAf0D1409eF);
    uint256 public immutable spaceAssetId;
    address public immutable owner;
    string public name;
    
    constructor(uint256 _assetId, string memory _name, address _owner) {
        (,, address creator) = bodhi.assets(_assetId);
        require(_owner == creator, "Only creator can create its Space");  // also revert if asset not exist or creator is zero
        spaceAssetId = _assetId;
        name = _name;
        owner = _owner;
    }
    
    mapping(uint256 => uint256) public assetToParent;
    mapping(uint256 => address) public assetToCreator;

    // create('...', 0) for new post
    // create('...', parentId) for reply to a post
    function create(string calldata arTxId, uint256 parentId) external {
        require(parentId == 0 || assetToParent[parentId] != 0, "Parent not exists");
        uint256 assetId = bodhi.assetIndex();
        uint256 _parentId = parentId != 0 ? parentId : assetId;
        assetToParent[assetId] = _parentId;
        assetToCreator[assetId] = msg.sender;
        emit Create(_parentId, assetId, msg.sender);
        bodhi.create(arTxId);
        bodhi.safeTransferFrom(address(this), msg.sender, assetId, 1 ether, "");
    }

    function removeFromSpace(uint256[] calldata assetIds) external {
        require(msg.sender == owner, "Only owner can remove");
        for(uint256 i = 0; i < assetIds.length; i++) {
            delete assetToParent[assetIds[i]];
            emit Remove(assetIds[i]);
        }
    }

    function removeFromBodhi(uint256 assetId) external {
        require(assetToCreator[assetId] == msg.sender, "Only creator can remove");
        bodhi.remove(assetId);
    }
    
    function buyback(uint256 amount, uint256 maxPrice) external {
        require(msg.sender == owner, "Only owner can buyback");
        uint256 price = bodhi.getBuyPriceAfterFee(spaceAssetId, amount);
        require(price <= maxPrice, "Price too high");  // prevent potential MEV in the future
        bodhi.buy{value: price}(spaceAssetId, amount);
    }
    
    receive () external payable {}
}