// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice 定义 ERC-7943 接口，即 uRWA。
/// 在与特定代币标准交互时：
/// - 对于类似 ERC-721 的（非同质化）代币，'amount' 参数通常代表单个代币（即 1）。
/// - 对于类似 ERC-20 的（同质化）代币，'tokenId' 参数通常不适用，应设置为 0。
interface IERC7943 /*is IERC165*/ {
    /// @notice 当代币从一个地址转移到另一个地址时发出。
    /// @param from 代币被取出的地址。
    /// @param to 被扣押的代币转移到的地址。
    /// @param tokenId 被转移的代币的 ID。
    /// @param amount 被扣押的数量。
    event ForcedTransfer(address indexed from, address indexed to, uint256 tokenId, uint256 amount);

    /// @notice 当调用 `setFrozen` 时发出，改变 `user` 的 `tokenId` 代币的冻结 `amount`。
    /// @param user 其代币被冻结的用户的地址。
    /// @param tokenId 要冻结的代币的 ID。
    /// @param amount 更改后要冻结的代币数量。
    event Frozen(address indexed user, uint256 indexed tokenId, uint256 amount);

    /// @notice 当用户不允许交互时回滚的错误。
    /// @param account 不允许交互的用户的地址。
    error ERC7943NotAllowedUser(address account);

    /// @notice 当由于现有限制而不允许转账时回滚的错误。
    /// @param from 要从中转移代币的地址。
    /// @param to 要将代币转移到的地址。
    /// @param tokenId 被转移的代币的 ID。
    /// @param amount 被转移的数量。
    error ERC7943NotAllowedTransfer(address from, address to, uint256 tokenId, uint256 amount);

    /// @notice 当尝试从 `user` 转移 `tokenId` 的 `amount` 小于或等于其余额但大于其未冻结余额时回滚的错误。
    /// @param user 持有代币的地址。
    /// @param tokenId 被转移的代币的 ID。
    /// @param amount 被转移的数量。
    /// @param unfrozen 未冻结且可用于转移的代币数量。
    error ERC7943InsufficientUnfrozenBalance(address user, uint256 tokenId, uint256 amount, uint256 unfrozen);

    /// @notice 将代币从一个地址转移到另一个地址。
    /// @dev 需要特定授权。用于法规遵从或恢复场景。
    /// @param from 从中获取 `amount` 的地址。
    /// @param to 接收 `amount` 的地址。
    /// @param tokenId 被转移的代币的 ID。
    /// @param amount 要强制转移的数量。
    function forceTransfer(address from, address to, uint256 tokenId, uint256 amount) external;

    /// @notice 更改属于 `user` 的 `tokenId` 代币的 `amount` 的冻结状态。
    /// 这将覆盖当前值，类似于 `approve` 函数。
    /// @dev 需要特定授权。冻结的代币不能由用户转移。
    /// @param user 要冻结/解冻其代币的用户的地址。
    /// @param tokenId 要冻结/解冻的代币的 ID。
    /// @param amount 要冻结/解冻的代币数量。
    function setFrozen(address user, uint256 tokenId, uint256 amount) external;

    /// @notice 检查特定 `tokenId` 的冻结状态/数量。
    /// @param user 用户的地址。
    /// @param tokenId 代币的 ID。
    /// @return amount 当前为 `user` 冻结的 `tokenId` 代币的数量。
    function getFrozen(address user, uint256 tokenId) external view returns (uint256 amount);

    /// @notice 检查根据代币规则当前是否可以进行转账。它强制执行对冻结代币的验证。
    /// @dev 这可能涉及检查，例如白名单、黑名单、转账限制和其他策略定义的限制。
    /// @param from 发送代币的地址。
    /// @param to 接收代币的地址。
    /// @param tokenId 被转移的代币的 ID。
    /// @param amount 被转移的数量。
    /// @return allowed 如果允许转移，则为 True，否则为 False。
    function isTransferAllowed(address from, address to, uint256 tokenId, uint256 amount) external view returns (bool allowed);

    /// @notice 检查是否允许特定用户根据代币规则进行交互。
    /// @dev 这通常用于白名单/KYC/KYB/AML 检查。
    /// @param user 要检查的地址。
    /// @return allowed 如果允许用户，则为 True，否则为 False。
    function isUserAllowed(address user) external view returns (bool allowed);
}