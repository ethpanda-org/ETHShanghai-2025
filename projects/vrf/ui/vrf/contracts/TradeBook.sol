// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TradeBook {
    enum TradeType { BUY, SELL }
    
    struct Trade {
        address trader;
        uint256 price;
        uint256 volume;
        TradeType tradeType;
        uint256 blockNumber;
        uint256 timestamp;
    }
    
    Trade[] public trades;
    
    event TradeSubmitted(
        uint256 indexed tradeId,
        address indexed trader,
        uint256 price,
        uint256 volume,
        TradeType tradeType,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    function submitTrade(
        uint256 _price,
        uint256 _volume,
        TradeType _tradeType
    ) external {
        Trade memory newTrade = Trade({
            trader: msg.sender,
            price: _price,
            volume: _volume,
            tradeType: _tradeType,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        
        trades.push(newTrade);
        
        emit TradeSubmitted(
            trades.length - 1,
            msg.sender,
            _price,
            _volume,
            _tradeType,
            block.number,
            block.timestamp
        );
    }
    
    function getTrade(uint256 _tradeId) external view returns (Trade memory) {
        require(_tradeId < trades.length, "Trade does not exist");
        return trades[_tradeId];
    }
    
    function getAllTrades() external view returns (Trade[] memory) {
        return trades;
    }
    
    function getTradeCount() external view returns (uint256) {
        return trades.length;
    }
    
    function getTradesByEpoch(uint256 _startBlock, uint256 _endBlock) 
        external 
        view 
        returns (Trade[] memory) 
    {
        uint256 count = 0;
        
        // Count trades in range
        for (uint256 i = 0; i < trades.length; i++) {
            if (trades[i].blockNumber >= _startBlock && trades[i].blockNumber <= _endBlock) {
                count++;
            }
        }
        
        // Create result array
        Trade[] memory result = new Trade[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < trades.length; i++) {
            if (trades[i].blockNumber >= _startBlock && trades[i].blockNumber <= _endBlock) {
                result[index] = trades[i];
                index++;
            }
        }
        
        return result;
    }
}
