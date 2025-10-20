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

    // Match orders - finds best matching buy and sell orders
    function matchOrders() external returns (bytes32 buyOrderId, bytes32 sellOrderId, uint256 amount, uint256 price) {
        bytes32 bestBuyId;
        bytes32 bestSellId;
        uint256 bestBuyPrice = 0;
        uint256 bestSellPrice = type(uint256).max;

        // Find best buy order (highest price)
        for (uint256 i = 0; i < orderIds.length; i++) {
            bytes32 orderId = orderIds[i];
            Order memory order = orders[orderId];
            if (order.isBuy && !order.executed && order.price >= bestBuyPrice) {
                bestBuyId = orderId;
                bestBuyPrice = order.price;
            }
        }

        // Find best sell order (lowest price)
        for (uint256 i = 0; i < orderIds.length; i++) {
            bytes32 orderId = orderIds[i];
            Order memory order = orders[orderId];
            if (!order.isBuy && !order.executed && order.price <= bestSellPrice) {
                bestSellId = orderId;
                bestSellPrice = order.price;
            }
        }

        // Check if we have matching orders
        if (bestBuyId != bytes32(0) && bestSellId != bytes32(0) && bestBuyPrice <= bestSellPrice) {
            Order memory buyOrder = orders[bestBuyId];
            Order memory sellOrder = orders[bestSellId];

            // Execute the trade at the buy price (buyer gets better deal)
            uint256 tradeAmount = buyOrder.amount < sellOrder.amount ? buyOrder.amount : sellOrder.amount;
            uint256 tradePrice = buyOrder.price;

            // Mark orders as executed
            buyOrder.executed = true;
            sellOrder.executed = true;

            // Update storage
            orders[bestBuyId] = buyOrder;
            orders[bestSellId] = sellOrder;

            emit OrderMatched(bestBuyId, bestSellId, tradeAmount, tradePrice);

            return (bestBuyId, bestSellId, tradeAmount, tradePrice);
        }

        return (bytes32(0), bytes32(0), 0, 0);
    }
}