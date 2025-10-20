// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.17 <0.9.0;

import {AdminRoles} from "./AdminRoles.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract AdvancedPayment is AdminRoles {
    using SafeERC20 for IERC20;

    enum OrderStatus{Pending,Paid,Canceled}

    struct Payment{
        address _sender;
        address _reciever;
        IERC20 _stableCoin;
        uint _amount;
        OrderStatus _orderStatus;
    }

    mapping(uint=>Payment) private _payments;

    error OrderUsedERROR(uint _orderId);
    error OrderNoExisting(uint _orderId);
    error OrderStatusError(OrderStatus _actualStatus,OrderStatus _expectedStatus);

    constructor() AdminRoles(){

    }

    function advancePay(uint _orderID,address _receiver,IERC20 _stableCoin,uint amount)public{
        Payment storage payment=_payments[_orderID];
        require(payment._sender==address(0),OrderUsedERROR(_orderID));
        _stableCoin.safeTransferFrom(msg.sender,address(this),amount);
       
        payment._sender=msg.sender;
        payment._reciever=_receiver;
        payment._amount=amount;
        payment._stableCoin=_stableCoin;
        payment._orderStatus=OrderStatus.Pending;
    }

    function pay(uint _orderID)public onlyAdmin{
        Payment storage payment=_payments[_orderID];
        require(payment._orderStatus==OrderStatus.Pending,OrderStatusError(payment._orderStatus,OrderStatus.Pending));
        require(payment._sender!=address(0),OrderNoExisting(_orderID));

        payment._orderStatus=OrderStatus.Paid;
        payment._stableCoin.safeTransfer(payment._reciever,payment._amount);
    }

    function cancel(uint _orderID)public onlyAdmin {
        Payment storage payment=_payments[_orderID];
        require(payment._orderStatus==OrderStatus.Pending,OrderStatusError(payment._orderStatus,OrderStatus.Pending));
        require(payment._sender!=address(0),OrderNoExisting(_orderID));
        
        payment._orderStatus=OrderStatus.Canceled;
        payment._stableCoin.safeTransfer(payment._sender,payment._amount);
    }

    function getPayment(uint _orderID)public view returns(Payment memory){
        return _payments[_orderID];
    }
}
