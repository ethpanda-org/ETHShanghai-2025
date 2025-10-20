// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CaveatEnforcer} from "../../lib/delegation-framework/src/enforcers/CaveatEnforcer.sol";
import {ModeCode} from "../../lib/delegation-framework/src/utils/Types.sol";
import {DeadManSwitchRegistry} from "./DeadManSwitchRegistry.sol";

/**
 * @title DeadManSwitchEnforcer
 * @notice Caveat Enforcer 用于验证 Dead Man's Switch 继承条件
 * @dev 继承自 MetaMask CaveatEnforcer,在执行前验证继承资格
 */
contract DeadManSwitchEnforcer is CaveatEnforcer {

    // ============ 状态变量 ============

    DeadManSwitchRegistry public immutable registry;

    // ============ 构造函数 ============

    constructor(address _registry) {
        require(_registry != address(0), "ZERO_REGISTRY");
        registry = DeadManSwitchRegistry(_registry);
    }

    // ============ CaveatEnforcer 实现 ============

    /**
     * @notice 在执行前验证继承条件
     * @param _terms bytes编码的 owner 地址
     * @param _args 执行参数 (未使用)
     * @param _mode 执行模式 (未使用)
     * @param _executionCallData 执行调用数据 (未使用)
     * @param _delegationHash delegation hash (未使用)
     * @param _delegator 委托人地址
     * @param _redeemer 赎回者地址 (应为 beneficiary)
     */
    function beforeHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCallData,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) public view override {
        // 解码 terms 获取 owner 地址
        address owner = abi.decode(_terms, (address));

        // 验证: delegator 应该是 owner (EOA 地址)
        require(_delegator == owner, "INVALID_DELEGATOR");

        // 验证: redeemer 应该是 beneficiary
        (address beneficiary,,,,,,bool canClaim) = registry.getStatus(owner);
        require(_redeemer == beneficiary, "NOT_BENEFICIARY");

        // 验证: 必须满足继承条件
        require(canClaim, "CANNOT_CLAIM_YET");
    }

    /**
     * @notice 在执行后调用 (我们不需要后置检查)
     */
    function afterHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCallData,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) public view override {
        // 无需后置验证
    }

    // ============ 辅助函数 ============

    /**
     * @notice 编码 terms 参数
     * @param owner Owner 地址
     */
    function getTerms(address owner) external pure returns (bytes memory) {
        return abi.encode(owner);
    }
}
