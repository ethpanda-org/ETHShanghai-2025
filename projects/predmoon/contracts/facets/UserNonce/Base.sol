// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IUserNonceBase} from "./IBase.sol";
import {UserNonceStorage} from "./Storage.sol";

abstract contract UserNonceBase is IUserNonceBase {
    function _useNonce(address userAddress, uint256 nonce) internal {
        UserNonceStorage.Storage storage $ = UserNonceStorage.load();
        if ($.userNonceMap[userAddress][nonce]) {
            revert NonceHasBeenUsed(userAddress, nonce);
        }
        $.userNonceMap[userAddress][nonce] = true;
        emit NonceUsed(userAddress, nonce);
    }

    function _isNonceUsed(address userAddress, uint256 nonce) internal view returns (bool) {
        return UserNonceStorage.load().userNonceMap[userAddress][nonce];
    }
}
