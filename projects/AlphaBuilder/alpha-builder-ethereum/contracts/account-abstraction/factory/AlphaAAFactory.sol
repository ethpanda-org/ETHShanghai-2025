// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../AlphaAAWallet.sol";
import "../interfaces/IEntryPoint.sol";
import "../libraries/AlphaErrors.sol";

/**
 * @title AlphaAAFactory
 * @notice Deterministic factory to deploy AlphaAAWallet instances with arbitrary configuration.
 *         Uses CREATE2 salts to offer stable addresses per owner set. Factory also emits
 *         metadata snapshots to help off-chain indexers reconstruct configuration.
 */
contract AlphaAAFactory is Ownable {
    IEntryPoint public immutable entryPoint;

    event WalletDeployed(
        address indexed wallet,
        address[] owners,
        uint32[] weights,
        uint32 ownerThreshold,
        address[] guardians,
        uint256 guardianThreshold,
        uint48 recoveryDelay,
        bytes32 salt
    );

    constructor(IEntryPoint _entryPoint, address initialOwner) {
        require(address(_entryPoint) != address(0), "AlphaAAFactory: entry point required");
        require(initialOwner != address(0), "AlphaAAFactory: owner required");
        entryPoint = _entryPoint;
        transferOwnership(initialOwner);
    }

    function deployWallet(
        address[] calldata owners,
        uint32[] calldata weights,
        uint32 ownerThreshold,
        address[] calldata guardians,
        uint256 guardianThreshold,
        uint48 recoveryDelay,
        bytes32 salt
    ) external onlyOwner returns (address wallet) {
        wallet = address(
            new AlphaAAWallet{salt: salt}(
                entryPoint,
                owners,
                weights,
                ownerThreshold,
                guardians,
                guardianThreshold,
                recoveryDelay
            )
        );

        emit WalletDeployed(
            wallet,
            owners,
            weights,
            ownerThreshold,
            guardians,
            guardianThreshold,
            recoveryDelay,
            salt
        );
    }

    function computeWalletAddress(
        address[] calldata owners,
        uint32[] calldata weights,
        uint32 ownerThreshold,
        address[] calldata guardians,
        uint256 guardianThreshold,
        uint48 recoveryDelay,
        bytes32 salt
    ) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(
            type(AlphaAAWallet).creationCode,
            abi.encode(
                entryPoint,
                owners,
                weights,
                ownerThreshold,
                guardians,
                guardianThreshold,
                recoveryDelay
            )
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
        );
        predicted = address(uint160(uint256(hash)));
    }
}

