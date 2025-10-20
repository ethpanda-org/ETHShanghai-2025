// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Facet} from "../../Facet.sol";
import {ERC1155Base} from "./Base.sol";
import {IERC1155Facet} from "./IFacet.sol";
import {ERC1155Storage} from "./Storage.sol";

contract ERC1155Facet is IERC1155Facet, ERC1155Base, Facet {
    function ERC1155Facet_init(string memory baseURI_) external onlyInitializing {
        __ERC1155_init(baseURI_);
    }

    function idx() external view returns (uint256) {
        return ERC1155Storage.load()._idx;
    }

    function uri(uint256 tokenID_) external view virtual returns (string memory) {
        return string(abi.encodePacked(ERC1155Storage.load()._baseURI, tokenID_));
    }

    function totalSupply(uint256 id_) external view virtual returns (uint256) {
        return ERC1155Storage.load()._totalSupply[id_];
    }

    function balanceOf(address account_, uint256 id_) external view returns (uint256) {
        return _balanceOf(account_, id_);
    }

    function balanceOfBatch(address[] calldata accounts_, uint256[] calldata ids_) external view returns (uint256[] memory) {
        require(accounts_.length == ids_.length, "ERC1155: accounts and ids length mismatch");
        uint256[] memory batchBalances = new uint256[](accounts_.length);

        for (uint256 i = 0; i < accounts_.length; ++i) {
            batchBalances[i] = _balanceOf(accounts_[i], ids_[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator_, bool approved_) external {
        _setApprovalForAll(msg.sender, operator_, approved_);
    }

    function isApprovedForAll(address account_, address operator_) external view returns (bool) {
        return _isApprovedForAll(account_, operator_);
    }

    function safeTransferFrom(address from_, address to_, uint256 id_, uint256 amount_, bytes calldata data_) external {
        _requireAuth(from_);
        _safeTransferFrom(from_, to_, id_, amount_, data_);
    }

    function safeBatchTransferFrom(address from_, address to_, uint256[] calldata ids_, uint256[] calldata amounts_, bytes calldata data_) external {
        _requireAuth(from_);
        _safeBatchTransferFrom(from_, to_, ids_, amounts_, data_);
    }
}
