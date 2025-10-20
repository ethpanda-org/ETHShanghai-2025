// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMintableERC20} from "../interfaces/IMintableERC20.sol";

/// @title MockERC20
/// @notice Simple mintable ERC20 token used for testing (USDT placeholder).
contract MockERC20 is IMintableERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= value, "MockERC20: insufficient allowance");
        _allowances[from][msg.sender] = currentAllowance - value;
        emit Approval(from, msg.sender, _allowances[from][msg.sender]);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "MockERC20: transfer to zero");
        uint256 balance = _balances[from];
        require(balance >= value, "MockERC20: insufficient balance");
        _balances[from] = balance - value;
        _balances[to] += value;
        emit Transfer(from, to, value);
    }
}
