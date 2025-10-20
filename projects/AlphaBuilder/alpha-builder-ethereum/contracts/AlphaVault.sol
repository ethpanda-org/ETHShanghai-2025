// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AlphaVault
 * @notice Minimal treasury contract to custody deposits for AA wallets.
 *         Balances are tracked per owner. Deposits/withdrawals emit events the backend can index.
 */
contract AlphaVault is AccessControl, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev mapping of account balances denominated in wei.
    mapping(address account => uint256 balance) private _balances;

    event Deposit(address indexed account, uint256 amount, uint256 balanceAfter);
    event Withdrawal(address indexed account, address indexed recipient, uint256 amount, uint256 balanceAfter);

    constructor(address admin, address operator) {
        require(admin != address(0), "AlphaVault: admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (operator != address(0)) {
            _grantRole(OPERATOR_ROLE, operator);
        }
    }

    /**
     * @notice Accept ether deposits, credited to the supplied owner.
     * @param owner The AA wallet or EOA that should receive the balance credit.
     */
    function deposit(address owner) external payable nonReentrant {
        require(owner != address(0), "AlphaVault: invalid owner");
        require(msg.value > 0, "AlphaVault: zero deposit");

        _balances[owner] += msg.value;

        emit Deposit(owner, msg.value, _balances[owner]);
    }

    /**
     * @notice Withdraw funds to the specified recipient.
     *         Can be invoked by the owner or an authorised operator (e.g. backend relayer).
     */
    function withdraw(address owner, address payable recipient, uint256 amount)
        external
        nonReentrant
    {
        require(owner != address(0) && recipient != address(0), "AlphaVault: invalid address");
        require(amount > 0, "AlphaVault: zero withdrawal");
        require(
            msg.sender == owner || hasRole(OPERATOR_ROLE, msg.sender),
            "AlphaVault: only owner or operator"
        );

        uint256 balance = _balances[owner];
        require(balance >= amount, "AlphaVault: insufficient balance");

        unchecked {
            _balances[owner] = balance - amount;
        }

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "AlphaVault: transfer failed");

        emit Withdrawal(owner, recipient, amount, _balances[owner]);
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}
