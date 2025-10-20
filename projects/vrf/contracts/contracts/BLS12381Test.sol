// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

/**
 * @title BLS12381Test
 * @dev Simple test contract for EIP-2537 BLS12-381 precompiles
 * @notice Tests core BLS12-381 operations: G1ADD and MAP_FP_TO_G1
 */
contract BLS12381Test {
    
    // Precompile addresses
    address constant BLS12_G1ADD = address(0x0A);
    address constant BLS12_MAP_FP_TO_G1 = address(0x0F);
    
    // Gas costs
    uint256 constant G1ADD_GAS = 500;
    uint256 constant MAP_FP_TO_G1_GAS = 5500;
    
    event TestResult(string operation, bool success, bytes result);
    
    /**
     * @dev Test BLS12_G1ADD precompile - adds two G1 points
     * @param p1 First G1 point (96 bytes)
     * @param p2 Second G1 point (96 bytes)
     * @return success Whether the operation succeeded
     * @return result The result of the operation
     */
    function testG1Add(bytes calldata p1, bytes calldata p2) 
        external 
        returns (bool success, bytes memory result) 
    {
        require(p1.length == 96, "G1 point must be 96 bytes");
        require(p2.length == 96, "G1 point must be 96 bytes");
        
        (success, result) = BLS12_G1ADD.call{gas: G1ADD_GAS}(abi.encodePacked(p1, p2));
        
        emit TestResult("G1ADD", success, result);
        return (success, result);
    }
    
    /**
     * @dev Test BLS12_MAP_FP_TO_G1 precompile - maps field element to G1 point
     * @param fp Field element (32 bytes)
     * @return success Whether the operation succeeded
     * @return result The result of the operation (G1 point)
     */
    function testMapFpToG1(bytes calldata fp) 
        external 
        returns (bool success, bytes memory result) 
    {
        require(fp.length == 32, "Field element must be 32 bytes");
        
        (success, result) = BLS12_MAP_FP_TO_G1.call{gas: MAP_FP_TO_G1_GAS}(fp);
        
        emit TestResult("MAP_FP_TO_G1", success, result);
        return (success, result);
    }
    
    /**
     * @dev Test with identity elements (zero points)
     * @return g1AddResult Result of G1ADD with identity elements
     * @return mapResult Result of MAP_FP_TO_G1 with zero
     */
    function testIdentityElements() 
        external 
        returns (bytes memory g1AddResult, bytes memory mapResult) 
    {
        // G1 identity point (all zeros)
        bytes memory g1Identity = new bytes(96);
        
        // Test G1ADD with identity elements
        (bool success1, bytes memory result1) = this.testG1Add(g1Identity, g1Identity);
        g1AddResult = abi.encode(success1, result1);
        
        // Test MAP_FP_TO_G1 with zero
        bytes memory zeroFp = new bytes(32);
        (bool success2, bytes memory result2) = this.testMapFpToG1(zeroFp);
        mapResult = abi.encode(success2, result2);
    }
}
