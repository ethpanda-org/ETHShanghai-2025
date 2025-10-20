// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC1155Base} from "./IBase.sol";
import {ERC1155Storage} from "./Storage.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

abstract contract ERC1155Base is IERC1155Base {
    function __ERC1155_init(string memory baseURI_) internal {
        ERC1155Storage.load()._baseURI = baseURI_;
    }

    function _requireBalance(address account_, uint256 id_, uint256 amount_) internal view {
        require(ERC1155Storage.load()._balances[id_][account_] >= amount_, "ERC1155: Insufficient balance");
    }

    function _burn(address from_, uint256 id_, uint256 amount_) internal virtual {
        require(id_ != 0, "ERC1155: burning zero id is prohibited");
        _requireBalance(from_, id_, amount_);

        ERC1155Storage.Storage storage $ = ERC1155Storage.load();
        require(id_ <= $._idx, "ERC1155: burning non existing id");

        $._totalSupply[id_] -= amount_;
        $._balances[id_][from_] -= amount_;

        emit TransferSingle(msg.sender, from_, address(0), id_, amount_);
    }

    function _mint(address to_, uint256 id_, uint256 amount_) internal virtual {
        _mint(to_, id_, amount_, "");
    }

    function _requireNonZero(address account_) internal pure {
        require(account_ != address(0), "ERC1155: address zero is not a valid owner");
    }

    function _mint(address to_, uint256 id_, uint256 amount_, bytes memory data_) internal virtual {
        _requireNonZero(to_);
        require(id_ != 0, "ERC1155: minting zero id is prohibited");

        ERC1155Storage.Storage storage $ = ERC1155Storage.load();

        require(id_ <= $._idx, "ERC1155: minting non existing id");

        $._totalSupply[id_] += amount_;
        $._balances[id_][to_] += amount_;

        emit TransferSingle(msg.sender, address(0), to_, id_, amount_);

        _requireReceiver(address(0), to_, id_, amount_, data_);
    }

    function _requireReceiver(address from_, address to_, uint256 tokenID_, uint256 amount_, bytes memory data_) internal {
        require(_checkOnERC1155Received(from_, to_, tokenID_, amount_, data_), "ERC1155: transfer to non ERC1155Receiver implementer");
    }

    function _hasContract(address account_) internal view returns (bool) {
        return account_.code.length > 0;
    }

    function _checkOnERC1155Received(address from_, address to_, uint256 tokenID_, uint256 amount_, bytes memory data_) internal returns (bool) {
        if (_hasContract(to_)) {
            try IERC1155Receiver(to_).onERC1155Received(msg.sender, from_, tokenID_, amount_, data_) returns (bytes4 retval) {
                return retval == IERC1155Receiver.onERC1155Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC1155: transfer to non ERC1155Receiver implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _checkOnERC1155BactchReceived(
        address from_,
        address to_,
        uint256[] memory tokenIDs_,
        uint256[] memory amounts_,
        bytes memory data_
    ) internal returns (bool) {
        if (_hasContract(to_)) {
            try IERC1155Receiver(to_).onERC1155BatchReceived(msg.sender, from_, tokenIDs_, amounts_, data_) returns (bytes4 retval) {
                return retval == IERC1155Receiver.onERC1155BatchReceived.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC1155: transfer to non ERC1155Receiver implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _requireBatchReceiver(address from_, address to_, uint256[] memory tokenIDs_, uint256[] memory amounts_, bytes memory data_) internal {
        require(_checkOnERC1155BactchReceived(from_, to_, tokenIDs_, amounts_, data_), "ERC1155: transfer to non ERC1155Receiver implementer");
    }

    function _setApprovalForAll(address owner_, address operator_, bool approved_) internal {
        require(owner_ != operator_, "ERC1155: Cannot set approval status for self");
        ERC1155Storage.load()._operatorApprovals[owner_][operator_] = approved_;

        emit ApprovalForAll(owner_, operator_, approved_);
    }

    function _safeTransferFrom(address from_, address to_, uint256 id_, uint256 amount_, bytes memory data_) internal {
        _transfer(from_, to_, id_, amount_);

        emit TransferSingle(msg.sender, from_, to_, id_, amount_);
        _requireReceiver(from_, to_, id_, amount_, data_);
    }

    function _safeBatchTransferFrom(address from_, address to_, uint256[] memory ids_, uint256[] memory amounts_, bytes memory data_) internal {
        require(amounts_.length == ids_.length, "ERC1155: accounts and ids length mismatch");

        for (uint256 _i = 0; _i < amounts_.length; ++_i) {
            _transfer(from_, to_, ids_[_i], amounts_[_i]);
        }

        emit TransferBatch(msg.sender, from_, to_, ids_, amounts_);
        _requireBatchReceiver(from_, to_, ids_, amounts_, data_);
    }

    function _checkStatus(address from_, address to_, uint256 id_, uint256 amount_) internal virtual {
        _requireNonZero(to_);
        _requireBalance(from_, id_, amount_);
    }

    function _balanceOf(address account_, uint256 id_) internal view returns (uint256) {
        _requireNonZero(account_);
        return ERC1155Storage.load()._balances[id_][account_];
    }

    function _transfer(address from_, address to_, uint256 id_, uint256 amount_) internal {
        _checkStatus(from_, to_, id_, amount_);

        ERC1155Storage.Storage storage $ = ERC1155Storage.load();
        $._balances[id_][from_] -= amount_;
        $._balances[id_][to_] += amount_;
    }

    function _isApprovedForAll(address account_, address operator_) internal view returns (bool) {
        return ERC1155Storage.load()._operatorApprovals[account_][operator_];
    }

    function _requireAuth(address account_) internal view {
        require(account_ == msg.sender || _isApprovedForAll(account_, msg.sender), "ERC1155: caller is not token owner or approved");
    }
}
