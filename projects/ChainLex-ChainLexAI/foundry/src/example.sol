// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IERC7943.sol";

contract uRWA20 is Context, ERC20, Ownable, IERC7943 {
    mapping(address user => bool whitelisted) public isWhitelisted;
    mapping(address user => uint256 amount) internal _frozenTokens;

    event Whitelisted(address indexed account, bool status);
    error NotZeroAddress();
    error InsufficientRole(address caller, string role);

    constructor(string memory name, string memory symbol, address initialAdmin) ERC20(name, symbol) Ownable(initialAdmin) {
        // 将部署者设置为初始管理员，并自动加入白名单
        isWhitelisted[initialAdmin] = true;
        emit Whitelisted(initialAdmin, true);
    }

    function isTransferAllowed(address from, address to, uint256, uint256 amount) public virtual view returns (bool allowed) {
        if (amount > balanceOf(from) - _frozenTokens[from]) return false;
        if (!isUserAllowed(from) || !isUserAllowed(to)) return false;
        allowed = true;
    }

    function isUserAllowed(address user) public virtual view returns (bool allowed) {
        if (isWhitelisted[user]) {
            allowed = true;
        } else {
            allowed = false;
        }
    } 

    function getFrozen(address user, uint256) external view returns (uint256 amount) {
        amount = _frozenTokens[user];
    }

    function changeWhitelist(address account, bool status) external onlyOwner {
        require(account != address(0), NotZeroAddress());
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
    }

    /* standard mint and burn functions with access control ...*/
    // 具有访问控制的标准铸造和销毁功能...

    /// @notice 铸造代币到指定地址
    /// @param to 接收代币的地址
    /// @param amount 要铸造的数量
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), NotZeroAddress());
        require(isUserAllowed(to), ERC7943NotAllowedUser(to));
        _mint(to, amount);
    }

    /// @notice 销毁指定数量的代币
    /// @param amount 要销毁的数量
    function burn(uint256 amount) external {
        require(amount <= balanceOf(msg.sender), IERC20Errors.ERC20InsufficientBalance(msg.sender, balanceOf(msg.sender), amount));
        _burn(msg.sender, amount);
    }

    /// @notice 销毁指定地址的代币（仅所有者）
    /// @param from 要销毁代币的地址
    /// @param amount 要销毁的数量
    function burnFrom(address from, uint256 amount) external onlyOwner {
        require(amount <= balanceOf(from), IERC20Errors.ERC20InsufficientBalance(from, balanceOf(from), amount));
        _burn(from, amount);
    }

    function setFrozen(address user, uint256, uint256 amount) external onlyOwner {
        require(amount <= balanceOf(user), IERC20Errors.ERC20InsufficientBalance(user, balanceOf(user), amount));
        _frozenTokens[user] = amount;
        emit Frozen(user, 0, amount);
    }

    function forceTransfer(address from, address to, uint256, uint256 amount) external onlyOwner {
        require(isUserAllowed(to), ERC7943NotAllowedUser(to));
        _excessFrozenUpdate(from, amount);
        super._update(from, to, amount);
        emit ForcedTransfer(from, to, 0, amount);
    }

    function _excessFrozenUpdate(address user, uint256 amount) internal {
        uint256 unfrozenBalance = balanceOf(user) - _frozenTokens[user];
        if(amount > unfrozenBalance && amount <= balanceOf(user)) { 
            // Protect from underflow: if amount > balanceOf(user) the call will revert in super._update with insufficient balance error
            // 防止下溢：如果 amount > balanceOf(user)，则调用将在 super._update 中回滚，并出现余额不足错误
            _frozenTokens[user] -= amount - unfrozenBalance; // Reduce by excess amount
            // 减少过剩数量
            emit Frozen(user, 0, _frozenTokens[user]);
        }
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        if (from != address(0) && to != address(0)) { // Transfer
            // 转账
            require(amount <= balanceOf(from), IERC20Errors.ERC20InsufficientBalance(from, balanceOf(from), amount));
            require(amount <= balanceOf(from) - _frozenTokens[from], ERC7943InsufficientUnfrozenBalance(from, 0, amount, balanceOf(from) - _frozenTokens[from]));
            require(isTransferAllowed(from, to, 0, amount), ERC7943NotAllowedTransfer(from, to, 0, amount));
        } else if (from == address(0)) { // Mint
            // 铸造
            require(isUserAllowed(to), ERC7943NotAllowedUser(to));
        } else { // Burn
            // 销毁
            _excessFrozenUpdate(from, amount);
        }

        super._update(from, to, amount);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC7943).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
