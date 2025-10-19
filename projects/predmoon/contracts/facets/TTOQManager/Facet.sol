// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {Facet} from "../../Facet.sol";
import {TTOQManagerBase} from "./Base.sol";
import {ITTOQManagerFacet} from "./IFacet.sol";
import {TTOQManagerStorage} from "./Storage.sol";
import {AccessControlBase} from "../AccessControl/Base.sol";

// Token Transfer Out Quote Manager Facet
contract TTOQManagerFacet is ITTOQManagerFacet, TTOQManagerBase, AccessControlBase, Facet {
    function TTOQManagerFacet_init(uint8 roleA, uint8 roleC) external onlyInitializing {
        _setFunctionAccess(this.superAdminEnablePayout.selector, roleA, true);
        _setFunctionAccess(this.adminSetMaxTTOQ.selector, roleA, true);

        _setFunctionAccess(this.disablePayout.selector, roleC, true);

        _addInterface(type(ITTOQManagerFacet).interfaceId);
    }

    function superAdminEnablePayout() external protected {
        TTOQManagerStorage.load().isPayoutDisabled = false;
    }

    function disablePayout() external protected {
        TTOQManagerStorage.load().isPayoutDisabled = true;
    }

    function adminSetMaxTTOQ(address tokenAddress, uint256 newMaxTTOQ) external whenNotPaused protected {
        TTOQManagerStorage.load().maxTokenTransferOutQuoteMap[tokenAddress] = newMaxTTOQ;
        emit MaxTTOQUpdated(tokenAddress, newMaxTTOQ, msg.sender);
    }

    function getPayoutStatus() external view returns (bool isPayoutDisabled) {
        return TTOQManagerStorage.load().isPayoutDisabled;
    }

    function getUsedTTOQ(address tokenAddress) external view returns (uint256 usedTokenTransferOutQuote) {
        return TTOQManagerStorage.load().usedTokenTransferOutQuoteMap[tokenAddress];
    }

    function getMaxTTOQ(address tokenAddress) external view returns (uint256 maxTokenTransferOutQuote) {
        return TTOQManagerStorage.load().maxTokenTransferOutQuoteMap[tokenAddress];
    }
}
