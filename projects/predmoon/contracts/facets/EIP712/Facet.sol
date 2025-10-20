// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {Facet} from "../../Facet.sol";
import {EIP712Base} from "./Base.sol";
import {IEIP712Facet} from "./IFacet.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";

contract EIP712Facet is IEIP712Facet, IERC5267, EIP712Base, Facet {
    function EIP712Facet_init(string memory name, string memory version) external onlyInitializing {
        _setEIP712Config(name, version);
    }

    // only superAdmin / owner
    function setEIP712Config(string memory name, string memory version) external protected {
        _setEIP712Config(name, version);
    }

    /// @inheritdoc IERC5267
    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        return (
            hex"0f", // 01111
            _EIP712Name(),
            _EIP712Version(),
            block.chainid,
            address(this),
            bytes32(0),
            new uint256[](0)
        );
    }
}
