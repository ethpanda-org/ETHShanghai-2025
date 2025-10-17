// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AggregatorV3Interface.sol";

contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;

    int256 private _price;
    uint256 private _updatedAt;
    uint80 private _roundId;
    uint256 private _startedAt;
    uint80 private _answeredInRound;

    bool private _shouldRevert;

    constructor(uint8 decimals_, string memory description_, uint256 version_) {
        _decimals = decimals_;
        _description = description_;
        _version = version_;
        _roundId = 1;
        _answeredInRound = 1;
        _updatedAt = block.timestamp;
        _startedAt = block.timestamp;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        if (_shouldRevert) {
            revert("MockAggregator: forced revert");
        }

        return (_roundId, _price, _startedAt, _updatedAt, _answeredInRound);
    }

    function updateRoundData(int256 price, uint256 updatedAt, uint256 startedAt) external {
        _price = price;
        _updatedAt = updatedAt;
        _startedAt = startedAt;
        _roundId++;
        _answeredInRound = _roundId;
    }

    function setPrice(int256 price) external {
        _price = price;
        _updatedAt = block.timestamp;
        _startedAt = block.timestamp;
        _roundId++;
        _answeredInRound = _roundId;
    }

    function setShouldRevert(bool shouldRevert) external {
        _shouldRevert = shouldRevert;
    }

    function setUpdatedAt(uint256 updatedAt) external {
        _updatedAt = updatedAt;
    }

    function setRoundId(uint80 roundId) external {
        _roundId = roundId;
        _answeredInRound = roundId;
    }

    function setStartedAt(uint256 startedAt) external {
        _startedAt = startedAt;
    }

    function getRoundData(uint80)
        external
        view
        returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _price, _startedAt, _updatedAt, _answeredInRound);
    }
}
