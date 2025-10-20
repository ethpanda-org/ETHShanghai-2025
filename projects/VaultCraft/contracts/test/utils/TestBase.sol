// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

// Foundry cheatcodes interface (subset)
interface Vm {
    function warp(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectEmit(bool, bool, bool, bool) external;
    function expectEmit(bool, bool, bool, bool, address) external;
}

address constant HEVM_ADDRESS = address(uint160(uint256(keccak256('hevm cheat code'))));

contract TestBase {
    Vm constant vm = Vm(HEVM_ADDRESS);

    function assertTrue(bool v, string memory err) internal pure {
        require(v, err);
    }
    function assertEq(uint256 a, uint256 b, string memory err) internal pure {
        require(a == b, err);
    }
    function assertApproxEq(uint256 a, uint256 b, uint256 tol, string memory err) internal pure {
        uint256 diff = a > b ? a - b : b - a;
        require(diff <= tol, err);
    }
}
