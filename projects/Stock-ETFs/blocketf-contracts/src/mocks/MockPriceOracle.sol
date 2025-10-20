// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPriceOracle.sol";

contract MockPriceOracle is IPriceOracle {
    mapping(address => uint256) private prices;

    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }

    function getPrice(address asset) external view override returns (uint256) {
        require(asset != address(0), "Invalid asset");
        return prices[asset];
    }

    function updatePrice(address asset, uint256 price) external {
        prices[asset] = price;
    }

    function batchUpdatePrices(address[] calldata assets, uint256[] calldata _prices) external {
        require(assets.length == _prices.length, "Length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            prices[assets[i]] = _prices[i];
        }
    }

    function getPrices(address[] calldata tokens) external view override returns (uint256[] memory _prices) {
        _prices = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            _prices[i] = this.getPrice(tokens[i]);
        }
    }
}
