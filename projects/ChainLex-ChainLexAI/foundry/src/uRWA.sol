// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./ChainlinkRisk.sol";

/// @notice ERC-7943 接口，即 uRWA。
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

/// @title uRWA - 统一现实世界资产代币 (集成 Chainlink 风险评估)
/// @notice 实现 ERC-20 和 ERC-7943 标准的合规代币合约，集成 Chainlink 预言机进行实时风险评估
/// @dev 支持白名单、冻结机制、强制转账功能和 Chainlink 链下数据验证
contract uRWA is Context, ERC20, Ownable, IERC7943 {
    mapping(address user => bool whitelisted) public isWhitelisted;
    mapping(address user => uint256 amount) internal _frozenTokens;

    // Chainlink 风险评估合约
    ChainlinkRisk public immutable riskAssessment;

    // 风险评估模式开关
    bool public enableRiskAssessment = true;

    // 传统白名单模式开关 (向后兼容)
    bool public enableWhitelist = true;

    event Whitelisted(address indexed account, bool status);
    event RiskAssessmentModeToggled(bool enabled);
    event WhitelistModeToggled(bool enabled);
    error NotZeroAddress();
    error InsufficientRole(address caller, string role);
    error RiskAssessmentRequired(address user, string reason);
    error WhitelistRequired(address user);

    /// @notice 构造函数
    /// @param name 代币名称
    /// @param symbol 代币符号
    /// @param initialAdmin 初始管理员地址
    /// @param riskAssessmentAddress Chainlink 风险评估合约地址
    constructor(
        string memory name,
        string memory symbol,
        address initialAdmin,
        address riskAssessmentAddress
    ) ERC20(name, symbol) Ownable(initialAdmin) {
        if (riskAssessmentAddress == address(0)) {
            revert NotZeroAddress();
        }

        riskAssessment = ChainlinkRisk(riskAssessmentAddress);

        // 将部署者设置为初始管理员，并自动加入白名单
        isWhitelisted[initialAdmin] = true;
        emit Whitelisted(initialAdmin, true);
    }

    // ========== 管理员功能 ==========

    /// @notice 切换风险评估模式
    /// @param enabled 是否启用风险评估
    function toggleRiskAssessment(bool enabled) external onlyOwner {
        enableRiskAssessment = enabled;
        emit RiskAssessmentModeToggled(enabled);
    }

    /// @notice 切换白名单模式
    /// @param enabled 是否启用白名单
    function toggleWhitelist(bool enabled) external onlyOwner {
        enableWhitelist = enabled;
        emit WhitelistModeToggled(enabled);
    }

    /// @notice 更改用户白名单状态
    /// @param account 用户地址
    /// @param status 白名单状态
    function changeWhitelist(address account, bool status) external onlyOwner {
        require(account != address(0), NotZeroAddress());
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
    }

    // ========== 风险评估查询 ==========

    /// @notice 检查用户是否被允许交互 (集成风险评估)
    /// @param user 用户地址
    /// @return allowed 是否允许用户交互
    function isUserAllowed(address user) public virtual view returns (bool allowed) {
        // 如果启用了风险评估，优先使用风险评估
        if (enableRiskAssessment) {
            try riskAssessment.isUserAllowed(user) returns (bool riskAllowed, string memory) {
                allowed = riskAllowed;
            } catch {
                // 风险评估合约调用失败，回退到白名单模式
                if (enableWhitelist) {
                    allowed = isWhitelisted[user];
                } else {
                    allowed = true; // 默认允许
                }
            }
        } else if (enableWhitelist) {
            // 仅使用白名单模式
            allowed = isWhitelisted[user];
        } else {
            // 两种模式都禁用，默认允许所有用户
            allowed = true;
        }
    }

    /// @notice 检查转账是否被允许 (集成风险评估)
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    /// @return allowed 是否允许转账
    function isTransferAllowed(address from, address to, uint256, uint256 amount) public virtual view returns (bool allowed) {
        // 检查冻结余额
        if (amount > balanceOf(from) - _frozenTokens[from]) {
            return false;
        }

        // 检查用户权限
        if (!isUserAllowed(from) || !isUserAllowed(to)) {
            return false;
        }

        // 如果启用了风险评估，进行更详细的检查
        if (enableRiskAssessment) {
            try riskAssessment.isTransferAllowed(from, to, amount) returns (bool riskAllowed, string memory) {
                allowed = riskAllowed;
            } catch {
                // 风险评估合约调用失败，使用基本检查结果
                // allowed 已经通过前面的基本检查
            }
        }
    }

    // ========== 标准代币功能 ==========

    /// @notice 铸造代币到指定地址
    /// @param to 接收代币的地址
    /// @param amount 要铸造的数量
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), NotZeroAddress());

        if (!isUserAllowed(to)) {
            if (enableRiskAssessment) {
                try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                    if (!allowed) {
                        revert RiskAssessmentRequired(to, reason);
                    }
                } catch {
                    // 风险评估调用失败，检查白名单
                    if (enableWhitelist && !isWhitelisted[to]) {
                        revert WhitelistRequired(to);
                    }
                }
            } else if (enableWhitelist && !isWhitelisted[to]) {
                revert WhitelistRequired(to);
            }
        }

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

    /// @notice 设置用户的冻结代币数量
    /// @param user 用户地址
    /// @param amount 要冻结的数量
    function setFrozen(address user, uint256, uint256 amount) external onlyOwner {
        require(amount <= balanceOf(user), IERC20Errors.ERC20InsufficientBalance(user, balanceOf(user), amount));
        _frozenTokens[user] = amount;
        emit Frozen(user, 0, amount);
    }

    /// @notice 强制转账
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    function forceTransfer(address from, address to, uint256, uint256 amount) external onlyOwner {
        if (!isUserAllowed(to)) {
            if (enableRiskAssessment) {
                try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                    if (!allowed) {
                        revert RiskAssessmentRequired(to, reason);
                    }
                } catch {
                    if (enableWhitelist && !isWhitelisted[to]) {
                        revert WhitelistRequired(to);
                    }
                }
            } else if (enableWhitelist && !isWhitelisted[to]) {
                revert WhitelistRequired(to);
            }
        }

        _excessFrozenUpdate(from, amount);
        super._update(from, to, amount);
        emit ForcedTransfer(from, to, 0, amount);
    }

    /// @notice 更新过剩的冻结代币数量（内部函数）
    /// @param user 用户地址
    /// @param amount 转账金额
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

    /// @notice 更新代币余额（重写ERC20的_update函数，集成风险评估）
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    function _update(address from, address to, uint256 amount) internal virtual override {
        if (from != address(0) && to != address(0)) { // Transfer
            // 转账
            require(amount <= balanceOf(from), IERC20Errors.ERC20InsufficientBalance(from, balanceOf(from), amount));
            require(amount <= balanceOf(from) - _frozenTokens[from], ERC7943InsufficientUnfrozenBalance(from, 0, amount, balanceOf(from) - _frozenTokens[from]));
            require(isTransferAllowed(from, to, 0, amount), ERC7943NotAllowedTransfer(from, to, 0, amount));
        } else if (from == address(0)) { // Mint
            // 铸造
            if (!isUserAllowed(to)) {
                if (enableRiskAssessment) {
                    try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                        if (!allowed) {
                            revert RiskAssessmentRequired(to, reason);
                        }
                    } catch {
                        if (enableWhitelist && !isWhitelisted[to]) {
                            revert WhitelistRequired(to);
                        }
                    }
                } else if (enableWhitelist && !isWhitelisted[to]) {
                    revert WhitelistRequired(to);
                }
            }
        } else { // Burn
            // 销毁
            _excessFrozenUpdate(from, amount);
        }

        super._update(from, to, amount);
    }

    // ========== 查询功能 ==========

    /// @notice 获取用户的冻结代币数量
    /// @param user 用户地址
    /// @return amount 冻结的代币数量
    function getFrozen(address user, uint256) external view returns (uint256 amount) {
        amount = _frozenTokens[user];
    }

    /// @notice 检查是否支持特定接口
    /// @param interfaceId 接口ID
    /// @return true 如果支持接口，否则 false
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC7943).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // ========== 风险评估相关查询 ==========

    /// @notice 获取用户的风险评估详情
    /// @param user 用户地址
    /// @return assessment 风险评估数据
    function getUserRiskAssessment(address user) external view returns (ChainlinkRisk.RiskAssessment memory assessment) {
        return riskAssessment.getRiskAssessment(user);
    }

    /// @notice 批量获取用户风险评估
    /// @param users 用户地址数组
    /// @return assessments 风险评估数组
    function getBatchRiskAssessments(address[] memory users) external view returns (ChainlinkRisk.RiskAssessment[] memory assessments) {
        return riskAssessment.getBatchRiskAssessments(users);
    }

    /// @notice 检查用户是否被风险评估允许 (带详细信息)
    /// @param user 用户地址
    /// @return allowed 是否允许
    /// @return reason 原因
    function isUserAllowedWithReason(address user) external view returns (bool allowed, string memory reason) {
        if (enableRiskAssessment) {
            try riskAssessment.isUserAllowed(user) returns (bool riskAllowed, string memory riskReason) {
                return (riskAllowed, riskReason);
            } catch {
                // 风险评估失败，回退到白名单
                if (enableWhitelist) {
                    return (isWhitelisted[user], isWhitelisted[user] ? "Whitelisted" : "Not whitelisted");
                } else {
                    return (true, "Risk assessment failed, whitelist disabled");
                }
            }
        } else if (enableWhitelist) {
            return (isWhitelisted[user], isWhitelisted[user] ? "Whitelisted" : "Not whitelisted");
        } else {
            return (true, "All checks disabled");
        }
    }

    /// @notice 检查转账是否被风险评估允许 (带详细信息)
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    /// @return allowed 是否允许
    /// @return reason 原因
    function isTransferAllowedWithReason(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        // 检查基本条件
        if (amount > balanceOf(from) - _frozenTokens[from]) {
            return (false, "Insufficient unfrozen balance");
        }

        if (!isUserAllowed(from)) {
            (bool fromAllowed, string memory fromReason) = this.isUserAllowedWithReason(from);
            if (!fromAllowed) {
                return (false, string(abi.encodePacked("Sender not allowed: ", fromReason)));
            }
        }

        if (!isUserAllowed(to)) {
            (bool toAllowed, string memory toReason) = this.isUserAllowedWithReason(to);
            if (!toAllowed) {
                return (false, string(abi.encodePacked("Recipient not allowed: ", toReason)));
            }
        }

        // 如果启用风险评估，进行详细检查
        if (enableRiskAssessment) {
            try riskAssessment.isTransferAllowed(from, to, amount) returns (bool riskAllowed, string memory riskReason) {
                return (riskAllowed, riskReason);
            } catch {
                return (true, "Risk assessment failed, allowing transfer");
            }
        }

        return (true, "Transfer allowed");
    }
}