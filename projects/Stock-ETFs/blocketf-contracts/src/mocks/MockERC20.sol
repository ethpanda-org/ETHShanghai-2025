// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;
    uint256 public transferFee;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function setTransferFee(uint256 fee) external {
        transferFee = fee;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (transferFee > 0) {
            uint256 fee = (amount * transferFee) / 10000;
            uint256 actualAmount = amount - fee;
            return super.transfer(to, actualAmount);
        }
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (transferFee > 0) {
            uint256 fee = (amount * transferFee) / 10000;
            uint256 actualAmount = amount - fee;
            return super.transferFrom(from, to, actualAmount);
        }
        return super.transferFrom(from, to, amount);
    }
}
