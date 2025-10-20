// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import {ERC1155} from "./ERC1155.sol";
error Unauthorized();

contract Bodhi is ERC1155 {
    event Create(uint256 indexed assetId, address indexed sender, string arTxId);
    event Remove(uint256 indexed assetId, address indexed sender);
    event Trade(
        TradeType indexed tradeType,
        uint256 indexed assetId,
        address indexed sender,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 creatorFee
    );

    struct Asset {
        uint256 id;
        string arTxId; // arweave transaction id
        address creator;
    }

    uint256 public assetIndex;
    mapping(uint256 => Asset) public assets;
    mapping(address => uint256[]) public userAssets;
    mapping(bytes32 => uint256) public txToAssetId;
    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public pool;
    uint256 public constant CREATOR_PREMINT = 1 ether; // 1e18
    uint256 public constant CREATOR_FEE_PERCENT = 0.05 ether; // 5%

    enum TradeType {
        Mint,
        Buy,
        Sell
    } // = 0, 1, 2

    function create(string calldata arTxId) public {
        bytes32 txHash = keccak256(abi.encodePacked(arTxId));
        require(txToAssetId[txHash] == 0, "Asset already exists");
        uint256 newAssetId = assetIndex;
        assets[newAssetId] = Asset(newAssetId, arTxId, msg.sender);
        userAssets[msg.sender].push(newAssetId);
        txToAssetId[txHash] = newAssetId;
        totalSupply[newAssetId] += CREATOR_PREMINT;
        assetIndex = newAssetId + 1;
        _mint(msg.sender, newAssetId, CREATOR_PREMINT, "");
        emit Create(newAssetId, msg.sender, arTxId);
        emit Trade(TradeType.Mint, newAssetId, msg.sender, CREATOR_PREMINT, 0, 0);
    }

    function remove(uint256 assetId) public {
        Asset memory asset = assets[assetId];
        if (asset.creator != msg.sender) {
            revert Unauthorized();
        }
        delete txToAssetId[keccak256(abi.encodePacked(asset.arTxId))];
        delete assets[assetId];
        emit Remove(assetId, msg.sender);
    }

    function getAssetIdsByAddress(address addr) public view returns (uint256[] memory) {
        return userAssets[addr];
    }

    function _curve(uint256 x) private pure returns (uint256) {
        return x <= CREATOR_PREMINT ? 0 : ((x - CREATOR_PREMINT) * (x - CREATOR_PREMINT) * (x - CREATOR_PREMINT));
    }

    function getPrice(uint256 supply, uint256 amount) public pure returns (uint256) {
        return (_curve(supply + amount) - _curve(supply)) / 1 ether / 1 ether / 50_000;
    }

    function getBuyPrice(uint256 assetId, uint256 amount) public view returns (uint256) {
        return getPrice(totalSupply[assetId], amount);
    }

    function getSellPrice(uint256 assetId, uint256 amount) public view returns (uint256) {
        return getPrice(totalSupply[assetId] - amount, amount);
    }

    function getBuyPriceAfterFee(uint256 assetId, uint256 amount) public view returns (uint256) {
        uint256 price = getBuyPrice(assetId, amount);
        uint256 creatorFee = (price * CREATOR_FEE_PERCENT) / 1 ether;
        return price + creatorFee;
    }

    function getSellPriceAfterFee(uint256 assetId, uint256 amount) public view returns (uint256) {
        uint256 price = getSellPrice(assetId, amount);
        uint256 creatorFee = (price * CREATOR_FEE_PERCENT) / 1 ether;
        return price - creatorFee;
    }

    function buy(uint256 assetId, uint256 amount) public payable {
        require(assetId < assetIndex, "Asset does not exist");
        uint256 price = getBuyPrice(assetId, amount);
        uint256 creatorFee = (price * CREATOR_FEE_PERCENT) / 1 ether;
        require(msg.value >= price + creatorFee, "Insufficient payment");
        totalSupply[assetId] += amount;
        pool[assetId] += price;
        _mint(msg.sender, assetId, amount, "");
        emit Trade(TradeType.Buy, assetId, msg.sender, amount, price, creatorFee);
        (bool creatorFeeSent, ) = payable(assets[assetId].creator).call{value: creatorFee}("");
        require(creatorFeeSent, "Failed to send Ether");
    }

    function sell(uint256 assetId, uint256 amount) public {
        require(assetId < assetIndex, "Asset does not exist");
        require(balanceOf[msg.sender][assetId] >= amount, "Insufficient balance");
        uint256 supply = totalSupply[assetId];
        require(supply - amount >= CREATOR_PREMINT, "Supply not allowed below premint amount");
        uint256 price = getSellPrice(assetId, amount);
        uint256 creatorFee = (price * CREATOR_FEE_PERCENT) / 1 ether;
        _burn(msg.sender, assetId, amount);
        totalSupply[assetId] = supply - amount;
        pool[assetId] -= price;
        emit Trade(TradeType.Sell, assetId, msg.sender, amount, price, creatorFee);
        (bool sent, ) = payable(msg.sender).call{value: price - creatorFee}("");
        (bool creatorFeeSent, ) = payable(assets[assetId].creator).call{value: creatorFee}("");
        require(sent && creatorFeeSent, "Failed to send Ether");
    }

    function uri(uint256 id) public view override returns (string memory) {
        return assets[id].arTxId;
    }
}