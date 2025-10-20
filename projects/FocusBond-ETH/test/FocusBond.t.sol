// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/FocusBond.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/MockFOCUS.sol";

contract FocusBondTest is Test {
    FocusBond public focusBond;
    MockUSDC public usdc;
    MockFOCUS public focus;
    
    address public owner;
    address public user1;
    address public user2;
    address public treasury;
    address public watchdog;
    
    uint256 public constant BASE_FEE_USDC = 1e6; // 1 USDC
    uint256 public constant BASE_FEE_FOCUS = 10e18; // 10 FOCUS
    uint256 public constant DEPOSIT_AMOUNT = 1 ether;

    event SessionStarted(address indexed user, uint256 depositWei, uint16 targetMinutes, uint64 startTs);
    event SessionCompleted(address indexed user, uint256 depositReturned, uint64 completedAt);
    event SessionBroken(address indexed user, uint256 feeAmount, address feeToken, uint256 depositReturned, uint64 brokenAt);
    event SessionWatchdogClosed(address indexed user, uint256 slashedAmount, uint256 depositReturned, uint64 closedAt);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        treasury = makeAddr("treasury");
        watchdog = makeAddr("watchdog");

        // Deploy mock tokens
        usdc = new MockUSDC("Mock USDC", "USDC", owner);
        focus = new MockFOCUS("Focus Token", "FOCUS", owner);

        // Deploy FocusBond contract
        focusBond = new FocusBond(
            address(usdc),
            address(focus),
            treasury,
            BASE_FEE_USDC,
            BASE_FEE_FOCUS
        );

        // Grant watchdog role
        focusBond.grantRole(focusBond.WATCHDOG_ROLE(), watchdog);

        // Give users some ETH and tokens
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        usdc.mint(user1, 1000); // 1000 USDC
        usdc.mint(user2, 1000);
        focus.mint(user1, 10000); // 10000 FOCUS
        focus.mint(user2, 10000);
    }

    function testStartSession() public {
        vm.prank(user1);
        
        vm.expectEmit(true, false, false, true);
        emit SessionStarted(user1, DEPOSIT_AMOUNT, 30, uint64(block.timestamp));
        
        focusBond.startSession{value: DEPOSIT_AMOUNT}(30);

        FocusBond.Session memory session = focusBond.getSession(user1);
        assertEq(session.depositWei, DEPOSIT_AMOUNT);
        assertEq(session.targetMinutes, 30);
        assertTrue(session.isActive);
        assertEq(session.startTs, block.timestamp);
    }

    function testStartSessionFailsIfAlreadyActive() public {
        vm.startPrank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(30);
        
        vm.expectRevert(FocusBond.SessionAlreadyActive.selector);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(30);
        vm.stopPrank();
    }

    function testStartSessionFailsIfTooShort() public {
        vm.prank(user1);
        vm.expectRevert(FocusBond.SessionTooShort.selector);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(10); // Less than 15 minutes
    }

    function testStartSessionFailsWithZeroDeposit() public {
        vm.prank(user1);
        vm.expectRevert(FocusBond.InsufficientDeposit.selector);
        focusBond.startSession{value: 0}(30);
    }

    function testCompleteSession() public {
        // Start session
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(30);

        // Fast forward 30 minutes
        vm.warp(block.timestamp + 30 * 60);

        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SessionCompleted(user1, DEPOSIT_AMOUNT, uint64(block.timestamp));
        
        focusBond.completeSession();

        // Check user got full deposit back
        assertEq(user1.balance, balanceBefore + DEPOSIT_AMOUNT);
        
        // Check session is cleared
        FocusBond.Session memory session = focusBond.getSession(user1);
        assertFalse(session.isActive);
    }

    function testCompleteSessionFailsIfTooEarly() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(30);

        // Try to complete after only 20 minutes
        vm.warp(block.timestamp + 20 * 60);

        vm.prank(user1);
        vm.expectRevert(FocusBond.SessionTooShort.selector);
        focusBond.completeSession();
    }

    function testBreakSessionWithUsdc() public {
        // Start session
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        // Fast forward 25 minutes (2 fee steps: 25/10 = 2)
        vm.warp(block.timestamp + 25 * 60);

        // Calculate expected fee: base * (100 + 20 * 2) / 100 = base * 1.4
        uint256 expectedFee = (BASE_FEE_USDC * 140) / 100;
        
        // Approve USDC spending
        vm.prank(user1);
        usdc.approve(address(focusBond), expectedFee);

        uint256 userBalanceBefore = user1.balance;
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SessionBroken(user1, expectedFee, address(usdc), DEPOSIT_AMOUNT, uint64(block.timestamp));
        
        focusBond.breakSessionWithUsdc(expectedFee);

        // Check user got deposit back
        assertEq(user1.balance, userBalanceBefore + DEPOSIT_AMOUNT);
        
        // Check treasury received fee
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + expectedFee);
        
        // Check session is cleared
        assertFalse(focusBond.isSessionActive(user1));
    }

    function testBreakSessionWithFocus() public {
        // Start session
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        // Fast forward 15 minutes (1 fee step)
        vm.warp(block.timestamp + 15 * 60);

        // Calculate expected fee: base * (100 + 20 * 1) / 100 = base * 1.2
        uint256 expectedFee = (BASE_FEE_FOCUS * 120) / 100;
        
        // Approve FOCUS spending
        vm.prank(user1);
        focus.approve(address(focusBond), expectedFee);

        uint256 treasuryBalanceBefore = focus.balanceOf(treasury);

        vm.prank(user1);
        focusBond.breakSessionWithFocus(expectedFee);

        // Check treasury received fee
        assertEq(focus.balanceOf(treasury), treasuryBalanceBefore + expectedFee);
    }

    function testBreakSessionFailsWithHighMaxFee() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        vm.warp(block.timestamp + 25 * 60);

        uint256 lowMaxFee = BASE_FEE_USDC; // Too low for 25 minutes
        
        vm.prank(user1);
        usdc.approve(address(focusBond), BASE_FEE_USDC * 2);

        vm.prank(user1);
        vm.expectRevert(FocusBond.FeeExceedsMax.selector);
        focusBond.breakSessionWithUsdc(lowMaxFee);
    }

    function testWatchdogBreak() public {
        // Start session
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        // Fast forward past grace period (default 120 seconds)
        vm.warp(block.timestamp + 200);

        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 userBalanceBefore = user1.balance;

        // Watchdog closes session (100% slash by default)
        vm.prank(watchdog);
        vm.expectEmit(true, false, false, true);
        emit SessionWatchdogClosed(user1, DEPOSIT_AMOUNT, 0, uint64(block.timestamp));
        
        focusBond.watchdogBreak(user1);

        // Check treasury received full deposit (100% slash)
        assertEq(treasury.balance, treasuryBalanceBefore + DEPOSIT_AMOUNT);
        
        // Check user received nothing back
        assertEq(user1.balance, userBalanceBefore);
        
        // Check session is cleared
        assertFalse(focusBond.isSessionActive(user1));
    }

    function testWatchdogBreakWithPartialSlash() public {
        // Set 50% slash rate
        focusBond.setWatchdogSlashBps(5000);

        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        vm.warp(block.timestamp + 200);

        uint256 expectedSlash = DEPOSIT_AMOUNT / 2;
        uint256 expectedReturn = DEPOSIT_AMOUNT - expectedSlash;

        vm.prank(watchdog);
        focusBond.watchdogBreak(user1);

        assertEq(treasury.balance, expectedSlash);
        assertEq(user1.balance, 10 ether - DEPOSIT_AMOUNT + expectedReturn);
    }

    function testWatchdogBreakFailsWithinGracePeriod() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        // Try to break within grace period
        vm.warp(block.timestamp + 60); // Only 60 seconds, grace is 120

        vm.prank(watchdog);
        vm.expectRevert(FocusBond.InvalidConfig.selector);
        focusBond.watchdogBreak(user1);
    }

    function testUpdateHeartbeat() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        vm.warp(block.timestamp + 60);

        vm.prank(user1);
        focusBond.updateHeartbeat();

        FocusBond.Session memory session = focusBond.getSession(user1);
        assertEq(session.lastHeartbeatTs, block.timestamp);
    }

    function testCalculateBreakFee() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        // Test fee calculation at different time points
        
        // At 0 minutes: base fee
        uint256 fee0 = focusBond.calculateBreakFee(user1, address(usdc));
        assertEq(fee0, BASE_FEE_USDC);

        // At 15 minutes (1 step): base * 1.2
        vm.warp(block.timestamp + 15 * 60);
        uint256 fee15 = focusBond.calculateBreakFee(user1, address(usdc));
        assertEq(fee15, (BASE_FEE_USDC * 120) / 100);

        // At 25 minutes (2 steps): base * 1.4
        vm.warp(block.timestamp + 10 * 60); // Total 25 minutes
        uint256 fee25 = focusBond.calculateBreakFee(user1, address(usdc));
        assertEq(fee25, (BASE_FEE_USDC * 140) / 100);
    }

    function testBreakSessionWithUsdcPermit() public {
        // This test would require implementing permit signature generation
        // For now, we'll test the basic flow without actual permit signature
        
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        vm.warp(block.timestamp + 15 * 60);

        uint256 expectedFee = (BASE_FEE_USDC * 120) / 100;
        
        // For testing, we'll approve first (in real usage, permit would handle this)
        vm.prank(user1);
        usdc.approve(address(focusBond), expectedFee);

        // This would fail with invalid permit signature, but tests the flow
        vm.prank(user1);
        vm.expectRevert(); // Will revert due to invalid permit signature
        focusBond.breakSessionWithUsdcPermit(
            expectedFee,
            block.timestamp + 3600,
            0, // Invalid v
            bytes32(0), // Invalid r
            bytes32(0)  // Invalid s
        );
    }

    function testGetSessionElapsedMinutes() public {
        vm.prank(user1);
        focusBond.startSession{value: DEPOSIT_AMOUNT}(60);

        assertEq(focusBond.getSessionElapsedMinutes(user1), 0);

        vm.warp(block.timestamp + 30 * 60);
        assertEq(focusBond.getSessionElapsedMinutes(user1), 30);
    }

    function testAdminFunctions() public {
        // Test setting reward treasury
        address newTreasury = makeAddr("newTreasury");
        focusBond.setRewardTreasury(newTreasury);
        assertEq(focusBond.rewardTreasury(), newTreasury);

        // Test setting base fees
        focusBond.setBaseFeeUsdc(2e6);
        assertEq(focusBond.baseFeeUsdc(), 2e6);

        focusBond.setBaseFeeFocus(20e18);
        assertEq(focusBond.baseFeeFocus(), 20e18);

        // Test setting other parameters
        focusBond.setMinCompleteMinutes(20);
        assertEq(focusBond.minCompleteMinutes(), 20);

        focusBond.setHeartbeatGraceSecs(180);
        assertEq(focusBond.heartbeatGraceSecs(), 180);

        focusBond.setWatchdogSlashBps(7500);
        assertEq(focusBond.watchdogSlashBps(), 7500);
    }

    function testAdminFunctionFailsForNonAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        focusBond.setRewardTreasury(user1);
    }

    function testInvalidWatchdogSlashBps() public {
        vm.expectRevert(FocusBond.InvalidConfig.selector);
        focusBond.setWatchdogSlashBps(10001); // > 100%
    }
}
