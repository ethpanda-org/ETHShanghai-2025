// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/eip7702/DeadManSwitchRegistry.sol";
import "../src/eip7702/DeadManSwitchEnforcer.sol";
import "../src/eip7702/AssetTransferExecutor.sol";

contract DeadManSwitchEIP7702Test is Test {

    DeadManSwitchRegistry public registry;
    DeadManSwitchEnforcer public enforcer;
    AssetTransferExecutor public executor;

    address public owner = address(0x1);
    address public beneficiary = address(0x2);

    uint256 constant HEARTBEAT_INTERVAL = 30 days;
    uint256 constant CHALLENGE_PERIOD = 7 days;

    function setUp() public {
        // 部署合约
        registry = new DeadManSwitchRegistry();
        enforcer = new DeadManSwitchEnforcer(address(registry));
        executor = new AssetTransferExecutor(address(registry));
    }

    // ============ Registry 测试 ============

    function testCreateSwitch() public {
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        (
            address _beneficiary,
            uint256 lastCheckIn,
            uint256 heartbeatInterval,
            uint256 challengePeriod,
            uint256 claimReadyAt,
            bool isActive,
            bool canClaim
        ) = registry.getStatus(owner);

        assertEq(_beneficiary, beneficiary);
        assertEq(heartbeatInterval, HEARTBEAT_INTERVAL);
        assertEq(challengePeriod, CHALLENGE_PERIOD);
        assertTrue(isActive);
        assertFalse(canClaim);
        assertEq(claimReadyAt, 0);
    }

    function testCannotCreateSwitchWithZeroBeneficiary() public {
        vm.prank(owner);
        vm.expectRevert("ZERO_BENEFICIARY");
        registry.createSwitch(address(0), HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);
    }

    function testCannotCreateSwitchWithSelfAsBeneficiary() public {
        vm.prank(owner);
        vm.expectRevert("SELF_BENEFICIARY");
        registry.createSwitch(owner, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);
    }

    function testCheckIn() public {
        // 创建 switch
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        // 等待一段时间
        vm.warp(block.timestamp + 10 days);

        // owner check in
        vm.prank(owner);
        registry.checkIn();

        (,,,,, bool isActive,) = registry.getStatus(owner);
        assertTrue(isActive);

        // 验证未过期
        assertFalse(registry.isExpired(owner));
    }

    function testStartClaim() public {
        // 创建 switch
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        // 等待过期
        vm.warp(block.timestamp + HEARTBEAT_INTERVAL + 1);

        // beneficiary 发起 claim
        vm.prank(beneficiary);
        registry.startClaim(owner);

        (,,,, uint256 claimReadyAt,,) = registry.getStatus(owner);
        assertEq(claimReadyAt, block.timestamp + CHALLENGE_PERIOD);
    }

    function testCannotStartClaimBeforeExpiry() public {
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        // 未过期
        vm.prank(beneficiary);
        vm.expectRevert("NOT_EXPIRED");
        registry.startClaim(owner);
    }

    function testCancelClaim() public {
        // 创建并发起 claim
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        vm.warp(block.timestamp + HEARTBEAT_INTERVAL + 1);

        vm.prank(beneficiary);
        registry.startClaim(owner);

        // owner 取消 claim
        vm.prank(owner);
        registry.cancelClaim();

        (,,,, uint256 claimReadyAt,,) = registry.getStatus(owner);
        assertEq(claimReadyAt, 0);
    }

    function testCanFinalize() public {
        // 创建并发起 claim
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        vm.warp(block.timestamp + HEARTBEAT_INTERVAL + 1);

        vm.prank(beneficiary);
        registry.startClaim(owner);

        // 挑战期未结束
        assertFalse(registry.canFinalize(owner));

        // 挑战期结束
        vm.warp(block.timestamp + CHALLENGE_PERIOD);
        assertTrue(registry.canFinalize(owner));
    }

    function testTimeUntilExpiry() public {
        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        uint256 remaining = registry.timeUntilExpiry(owner);
        assertEq(remaining, HEARTBEAT_INTERVAL);

        vm.warp(block.timestamp + 10 days);
        remaining = registry.timeUntilExpiry(owner);
        assertEq(remaining, HEARTBEAT_INTERVAL - 10 days);

        vm.warp(block.timestamp + HEARTBEAT_INTERVAL);
        remaining = registry.timeUntilExpiry(owner);
        assertEq(remaining, 0);
    }

    function testGetOwnersByBeneficiary() public {
        address owner2 = address(0x3);

        vm.prank(owner);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        vm.prank(owner2);
        registry.createSwitch(beneficiary, HEARTBEAT_INTERVAL, CHALLENGE_PERIOD);

        address[] memory owners = registry.getOwnersByBeneficiary(beneficiary);
        assertEq(owners.length, 2);
        assertEq(owners[0], owner);
        assertEq(owners[1], owner2);
    }

    // ============ Enforcer 测试 ============

    function testEnforcerGetTerms() public view {
        bytes memory terms = enforcer.getTerms(owner);
        address decoded = abi.decode(terms, (address));
        assertEq(decoded, owner);
    }

    // ============ Executor 测试 ============

    function testGetETHBalance() public {
        vm.deal(owner, 1 ether);
        uint256 balance = executor.getETHBalance(owner);
        assertEq(balance, 1 ether);
    }
}
