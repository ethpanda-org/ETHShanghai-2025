// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/UserOperation.sol";

interface IAAWalletModule {
    /**
     * @notice Called when the module is installed on the wallet.
     * @param wallet The wallet that installs the module.
     * @param hookData Optional encoded data supplied during installation.
     */
    function onInstall(address wallet, bytes calldata hookData) external;

    /**
     * @notice Called when the module is uninstalled.
     * @param wallet The wallet that removes the module.
     * @param hookData Optional encoded data supplied during removal.
     */
    function onUninstall(address wallet, bytes calldata hookData) external;

    /**
     * @notice Invoked during user operation validation when the module signature kind is selected.
     * @return validationData Encoded validation result aligned with EIP-4337 (validAfter, validUntil, aggregator)
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        bytes calldata moduleSignature
    ) external view returns (uint256 validationData);

    /**
     * @notice Enables modules to execute calls through the wallet context.
     */
    function executeFromModule(
        address wallet,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bytes memory result);
}

