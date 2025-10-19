// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {UserNonceBase} from "./Base.sol";
import {IUserNonceFacet} from "./IFacet.sol";

contract UserNonceFacet is IUserNonceFacet, UserNonceBase {
    function isNonceUsed(address userAddress, uint256 nonce) external view returns (bool) {
        return _isNonceUsed(userAddress, nonce);
    }
}
