// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGroth16Verifier
 * @notice Groth16 ZK 证明验证器接口
 * @dev 由 snarkjs 自动生成的验证器合约实现
 */
interface IGroth16Verifier {
    /**
     * @notice 验证 Groth16 ZK 证明
     * @param _pA 证明点 A
     * @param _pB 证明点 B  
     * @param _pC 证明点 C
     * @param _pubSignals 公开信号数组 [commitmentOld, commitmentNew]
     * @return 证明是否有效
     */
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}
