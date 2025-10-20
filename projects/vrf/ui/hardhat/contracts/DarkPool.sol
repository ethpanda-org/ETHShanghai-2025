// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract DarkPool {
    struct Order {
        bytes32 id;
        address trader;
        bool isBuy;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bool executed;
    }

    mapping(bytes32 => Order) public orders;
    bytes32[] public orderIds;
    uint256 public orderCounter;

    event OrderPlaced(bytes32 indexed orderId, address indexed trader, bool isBuy, uint256 amount, uint256 price);
    event OrderMatched(bytes32 indexed buyOrderId, bytes32 indexed sellOrderId, uint256 amount, uint256 price);

    function placeOrder(bool isBuy, uint256 amount, uint256 price) external returns (bytes32) {
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, orderCounter++));

        orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            isBuy: isBuy,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            executed: false
        });

        orderIds.push(orderId);
        emit OrderPlaced(orderId, msg.sender, isBuy, amount, price);

        return orderId;
    }

    function getOrderCount() external view returns (uint256) {
        return orderIds.length;
    }

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getAllOrders() external view returns (Order[] memory) {
        Order[] memory allOrders = new Order[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            allOrders[i] = orders[orderIds[i]];
        }
        return allOrders;
    }
}