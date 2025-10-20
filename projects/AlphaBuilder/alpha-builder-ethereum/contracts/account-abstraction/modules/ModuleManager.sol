// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../libraries/AlphaErrors.sol";
import "./IAAWalletModule.sol";

abstract contract ModuleManager {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct ModuleConfig {
        bool allowValidation;
        bool allowExecution;
        uint96 version;
        uint48 installedAt;
    }

    EnumerableSet.AddressSet internal _modules;
    mapping(address => ModuleConfig) internal _moduleConfigs;

    event ModuleInstalled(address indexed module, bool allowValidation, bool allowExecution, uint96 version);
    event ModuleUninstalled(address indexed module);
    event ModuleFlagsUpdated(address indexed module, bool allowValidation, bool allowExecution);

    function _installModule(
        address module,
        bool allowValidation,
        bool allowExecution,
        uint96 version,
        bytes calldata hookData
    ) internal {
        if (module == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        if (_modules.contains(module)) {
            revert AlphaErrors.ModuleAlreadyInstalled();
        }

        _modules.add(module);
        _moduleConfigs[module] = ModuleConfig({
            allowValidation: allowValidation,
            allowExecution: allowExecution,
            version: version,
            installedAt: uint48(block.timestamp)
        });

        IAAWalletModule(module).onInstall(address(this), hookData);

        emit ModuleInstalled(module, allowValidation, allowExecution, version);
    }

    function _uninstallModule(address module, bytes calldata hookData) internal {
        if (!_modules.contains(module)) {
            revert AlphaErrors.ModuleNotInstalled();
        }

        delete _moduleConfigs[module];
        _modules.remove(module);

        IAAWalletModule(module).onUninstall(address(this), hookData);

        emit ModuleUninstalled(module);
    }

    function _setModuleFlags(address module, bool allowValidation, bool allowExecution) internal {
        if (!_modules.contains(module)) {
            revert AlphaErrors.ModuleNotInstalled();
        }
        ModuleConfig storage config = _moduleConfigs[module];
        config.allowValidation = allowValidation;
        config.allowExecution = allowExecution;

        emit ModuleFlagsUpdated(module, allowValidation, allowExecution);
    }

    function _moduleCount() internal view returns (uint256) {
        return _modules.length();
    }

    function _moduleAt(uint256 index) internal view returns (address) {
        return _modules.at(index);
    }

    function _moduleConfig(address module) internal view returns (ModuleConfig memory) {
        return _moduleConfigs[module];
    }

    function _isValidationModule(address module) internal view returns (bool) {
        return _moduleConfigs[module].allowValidation;
    }

    function _isExecutionModule(address module) internal view returns (bool) {
        return _moduleConfigs[module].allowExecution;
    }

    function _isInstalled(address module) internal view returns (bool) {
        return _modules.contains(module);
    }
}

