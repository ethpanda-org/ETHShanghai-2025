// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {EIP712Base} from "../../../facets/EIP712/Base.sol";
import {ERC1155Base} from "../../../facets/ERC1155/Base.sol";
import {IMarketManagerBase} from "./IBase.sol";
import {AppStorage} from "../AppStorage.sol";
import {UserNonceBase} from "../../../facets/UserNonce/Base.sol";

abstract contract MarketManagerBase is IMarketManagerBase, AppStorage, ERC1155Base, EIP712Base, UserNonceBase {}
