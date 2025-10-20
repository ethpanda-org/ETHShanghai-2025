// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {DeadManSwitchRegistry} from "./DeadManSwitchRegistry.sol";

/**
 * @title AssetTransferExecutor
 * @notice 批量转移 EOA 资产的执行器
 * @dev 配合 EIP-7702 使用,从 owner EOA 转移资产到 beneficiary
 */
contract AssetTransferExecutor {

    // ============ 数据结构 ============

    struct AssetTransfer {
        address token;     // address(0) = ETH
        uint256 amount;    // 转移数量
    }

    // ============ 状态变量 ============

    DeadManSwitchRegistry public immutable registry;

    // ============ 事件 ============

    event AssetTransferred(
        address indexed owner,
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );

    event BatchTransferCompleted(
        address indexed owner,
        address indexed beneficiary,
        uint256 ethAmount,
        uint256 erc20Count
    );

    // ============ 构造函数 ============

    constructor(address _registry) {
        require(_registry != address(0), "ZERO_REGISTRY");
        registry = DeadManSwitchRegistry(_registry);
    }

    // ============ 核心函数 ============

    /**
     * @notice 批量转移资产 (ETH + ERC20)
     * @param owner Owner EOA 地址
     * @param transfers 资产转移列表
     * @dev 只能由 beneficiary 调用,且必须满足继承条件
     */
    function batchTransfer(
        address owner,
        AssetTransfer[] calldata transfers
    ) external {
        // 验证继承资格
        (
            address beneficiary,
            ,,,,,
            bool canClaim
        ) = registry.getStatus(owner);

        require(msg.sender == beneficiary, "NOT_BENEFICIARY");
        require(canClaim, "CANNOT_CLAIM");

        uint256 ethAmount = 0;
        uint256 erc20Count = 0;

        // 批量转移
        for (uint256 i = 0; i < transfers.length; i++) {
            AssetTransfer memory transfer = transfers[i];

            if (transfer.token == address(0)) {
                // ETH 转移
                _transferETH(owner, beneficiary, transfer.amount);
                ethAmount += transfer.amount;
            } else {
                // ERC20 转移
                _transferERC20(owner, beneficiary, transfer.token, transfer.amount);
                erc20Count++;
            }

            emit AssetTransferred(owner, beneficiary, transfer.token, transfer.amount);
        }

        // 标记继承完成
        registry.markFinalized(owner);

        emit BatchTransferCompleted(owner, beneficiary, ethAmount, erc20Count);
    }

    /**
     * @notice 简化版: 转移所有 ETH
     * @param owner Owner EOA 地址
     */
    function transferAllETH(address owner) external {
        (
            address beneficiary,
            ,,,,,
            bool canClaim
        ) = registry.getStatus(owner);

        require(msg.sender == beneficiary, "NOT_BENEFICIARY");
        require(canClaim, "CANNOT_CLAIM");

        uint256 balance = owner.balance;
        require(balance > 0, "NO_BALANCE");

        _transferETH(owner, beneficiary, balance);

        emit AssetTransferred(owner, beneficiary, address(0), balance);
    }

    /**
     * @notice 简化版: 转移单个 ERC20 代币的全部余额
     * @param owner Owner EOA 地址
     * @param token ERC20 代币地址
     */
    function transferAllERC20(address owner, address token) external {
        (
            address beneficiary,
            ,,,,,
            bool canClaim
        ) = registry.getStatus(owner);

        require(msg.sender == beneficiary, "NOT_BENEFICIARY");
        require(canClaim, "CANNOT_CLAIM");

        uint256 balance = IERC20(token).balanceOf(owner);
        require(balance > 0, "NO_BALANCE");

        _transferERC20(owner, beneficiary, token, balance);

        emit AssetTransferred(owner, beneficiary, token, balance);
    }

    // ============ 内部函数 ============

    /**
     * @dev 转移 ETH (需要 owner EOA 通过 EIP-7702 委托代码)
     */
    function _transferETH(
        address owner,
        address beneficiary,
        uint256 amount
    ) internal {
        require(owner.balance >= amount, "INSUFFICIENT_ETH");

        // 通过 low-level call 从 owner 转移 ETH
        // 注意: 这需要 owner EOA 启用 EIP-7702 delegation
        (bool success,) = beneficiary.call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");
    }

    /**
     * @dev 转移 ERC20 (需要 owner EOA 通过 EIP-7702 委托代码)
     */
    function _transferERC20(
        address owner,
        address beneficiary,
        address token,
        uint256 amount
    ) internal {
        uint256 balance = IERC20(token).balanceOf(owner);
        require(balance >= amount, "INSUFFICIENT_ERC20");

        // 通过 ERC20.transfer 从 owner 转移代币
        // 注意: 这需要 owner EOA 启用 EIP-7702 delegation
        bool success = IERC20(token).transferFrom(owner, beneficiary, amount);
        require(success, "ERC20_TRANSFER_FAILED");
    }

    // ============ 查询函数 ============

    /**
     * @notice 查询 owner 的 ETH 余额
     */
    function getETHBalance(address owner) external view returns (uint256) {
        return owner.balance;
    }

    /**
     * @notice 查询 owner 的 ERC20 余额
     */
    function getERC20Balance(address owner, address token)
        external
        view
        returns (uint256)
    {
        return IERC20(token).balanceOf(owner);
    }
}
