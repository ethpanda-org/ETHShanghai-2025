// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockGroth16Verifier
 * @dev Mock verifier for testing purposes - always returns true
 */
contract MockGroth16Verifier {
    bool public verificationResult = true;
    
    /**
     * @dev Set the verification result for testing
     */
    function setVerificationResult(bool _result) external {
        verificationResult = _result;
    }
    
    /**
     * @dev Mock verification function - returns the set result
     */
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[8] calldata
    ) external view returns (bool) {
        return verificationResult;
    }
}
