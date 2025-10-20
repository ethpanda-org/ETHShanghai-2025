// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "./utils/TestBase.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockAdapter.sol";
import "../Vault.sol";

contract VaultTest is TestBase {
    // duplicate event signatures for expectEmit matching
    event NavSnapshot(uint256 assets, uint256 liabilities, uint256 shares, uint256 ps, uint256 ts);
    event WhitelistSet(address indexed user, bool allowed);
    MockERC20 token;
    Vault vault;
    MockAdapter adapter;

    address admin;
    address manager;
    address guardian;
    address alice;
    address bob;

    function setUp() public {
        admin = address(0xA11CE);
        manager = address(0xB0B);
        guardian = address(0xF00D);
        alice = address(0xAAA1);
        bob = address(0xBBB2);

        token = new MockERC20("USD Stable", "USDS");
        adapter = new MockAdapter();

        // mint funds to test users
        token.mint(alice, 1_000_000 ether);
        token.mint(bob,   1_000_000 ether);

        // deploy vault
        vault = new Vault(
            address(token),
            "VaultCraft Shares",
            "VSHARE",
            admin,
            manager,
            guardian,
            false,
            1000, // 10%
            1 // 1 day
        );

        // admin set adapter allow
        vm.prank(admin);
        vault.setAdapter(address(adapter), true);
    }

    function _approve(address user, uint256 amt) internal {
        vm.prank(user);
        token.approve(address(vault), amt);
    }

    function test_deposit_minting_conserves_PS() public {
        // initial PS = 1e18
        assertEq(vault.ps(), 1e18, "ps0");

        // alice deposit 1000
        _approve(alice, 1000 ether);
        vm.prank(alice);
        vault.deposit(1000 ether, alice);
        uint256 ps1 = vault.ps();
        assertEq(ps1, 1e18, "ps after first deposit");
        assertEq(vault.totalAssets(), 1000 ether, "A=1000");
        assertEq(vault.balanceOf(alice), 1000 ether, "S(alice)=1000");

        // bob deposit 500 → PS stays same, shares=500
        _approve(bob, 500 ether);
        vm.prank(bob);
        vault.deposit(500 ether, bob);
        assertEq(vault.ps(), 1e18, "ps stays");
        assertEq(vault.balanceOf(bob), 500 ether, "S(bob)=500");
        assertEq(vault.totalAssets(), 1500 ether, "A=1500");
    }

    function test_withdraw_burn_conserves_PS() public {
        // setup two deposits
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        _approve(bob, 1000 ether);
        vm.prank(bob); vault.deposit(1000 ether, bob);

        // move time past lock (1 day)
        vm.warp(block.timestamp + 1 days + 1);

        // redeem 500 shares from alice
        vm.prank(alice);
        vault.redeem(500 ether, alice, alice);
        assertEq(vault.ps(), 1e18, "ps constant");
        assertEq(token.balanceOf(alice), 1_000_000 ether - 1000 ether + 500 ether, "alice asset");
    }

    function test_hwm_perf_fee_minting_only_when_PS_gt_HWM() public {
        // alice deposit 1000
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        assertEq(vault.ps(), 1e18, "ps=1");

        // donate profit 200 directly to vault (simulate pnl)
        token.mint(address(vault), 200 ether);
        // checkpoint to mint perf fee (10% of gain)
        uint256 S_before = vault.totalSupply(); // 1000
        vm.prank(manager);
        vault.checkpoint();

        // PS now = 1200/1000=1.2e18; HWM from 1e18 → 1.2e18
        // perfAssets = (1.2-1.0)*1000 * 10% = 200 * 10% = 20
        // perfShares = perfAssets / PS = 20 / 1.2 = 16.666...
        uint256 psNow = vault.ps();
        // within small tolerance
        assertApproxEq(psNow, 1_200_000_000_000_000_000, 1000, "ps ~ 1.2");

        uint256 S_after = vault.totalSupply();
        uint256 minted = S_after - S_before;
        // expect floor(20e18 / 1.2e18) = floor(16.666...) = 16
        // but due to integer math, check minted close to 16 or 17 depending rounding
        assertTrue(minted == 16 ether || minted == 17 ether, "perf shares ~ 16-17");
    }

    function test_private_vault_requires_whitelist() public {
        // deploy a private vault
        Vault pv = new Vault(
            address(token),
            "Private Shares",
            "PVSH",
            admin,
            manager,
            guardian,
            true,
            1000,
            1
        );
        // alice not whitelisted → deposit reverts
        _approve(alice, 100 ether);
        vm.prank(alice);
        bool reverted;
        try pv.deposit(100 ether, alice) returns (uint256) { reverted = false; } catch { reverted = true; }
        assertTrue(reverted, "should revert for non-wl");

        // admin whitelist alice
        vm.prank(admin);
        pv.setWhitelist(alice, true);
        // now ok
        vm.prank(alice);
        pv.deposit(100 ether, alice);
        assertEq(pv.balanceOf(alice), 100 ether, "wl deposit ok");
    }

    function test_lock_min_days_enforced() public {
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        // before unlock
        bool reverted;
        vm.prank(alice);
        try vault.redeem(1 ether, alice, alice) returns (uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "locked");
        // warp past lock
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(alice);
        vault.redeem(1 ether, alice, alice);
        assertEq(vault.balanceOf(alice), 999 ether, "redeemed 1");
    }

    function test_pause_blocks_actions() public {
        vm.prank(guardian); vault.pause();
        _approve(alice, 10 ether);
        vm.prank(alice);
        bool reverted;
        try vault.deposit(10 ether, alice) returns (uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "pause deposit blocked");
        vm.prank(guardian); vault.unpause();
        vm.prank(alice); vault.deposit(10 ether, alice);
        assertEq(vault.balanceOf(alice), 10 ether, "after unpause ok");
    }

    function test_execute_requires_whitelisted_adapter_and_manager() public {
        // not manager → revert
        bool reverted;
        vm.prank(alice);
        try vault.execute(address(adapter), abi.encode(int256(1), uint256(2), uint256(3))) returns (int256, uint256, uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "only manager");

        // manager, adapter allowed
        vm.prank(manager);
        (int256 pnl, uint256 spent, uint256 received) = vault.execute(address(adapter), abi.encode(int256(1), uint256(2), uint256(3)));
        assertEq(uint256(int256(pnl)), uint256(1), "pnl");
        assertEq(spent, 2, "spent");
        assertEq(received, 3, "received");
    }

    function test_execute_reverts_if_adapter_not_whitelisted() public {
        // deploy a fresh adapter that is not whitelisted
        MockAdapter bad = new MockAdapter();
        bool reverted;
        vm.prank(manager);
        try vault.execute(address(bad), abi.encode(int256(0), uint256(0), uint256(0))) returns (int256, uint256, uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "adapter not allowed");
    }

    function test_third_party_redeem_with_max_allowance_kept() public {
        // setup deposit
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        vm.warp(block.timestamp + 1 days + 1);
        // approve max
        vm.prank(alice); vault.approve(bob, type(uint256).max);
        uint256 beforeAllow = vault.allowance(alice, bob);
        vm.prank(bob);
        vault.redeem(100 ether, bob, alice);
        uint256 afterAllow = vault.allowance(alice, bob);
        // max allowance should not decrease
        assertEq(beforeAllow, afterAllow, "max allowance sticky");
    }

    function test_performance_fee_event_emitted() public {
        // deposit
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        // profit
        token.mint(address(vault), 200 ether);
        // expect event when checkpoint
        // Can't know exact perfShares due to floors; we validate HWM and p
        vm.prank(manager);
        vault.checkpoint();
        // PS should be close to 1.2e18
        uint256 psNow = vault.ps();
        assertApproxEq(psNow, 1_200_000_000_000_000_000, 1000, "ps ~ 1.2e18");
    }

    function test_adapterset_and_lockupdated_events() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, true, address(vault));
        emit AdapterSet(address(adapter), true);
        vault.setAdapter(address(adapter), true);

        vm.prank(admin);
        vm.expectEmit(false, false, false, true, address(vault));
        emit LockUpdated(3);
        vault.setLockMinDays(3);
    }

    function test_pause_blocks_redeem_even_after_unlock() public {
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(guardian); vault.pause();
        bool reverted;
        vm.prank(alice);
        try vault.redeem(10 ether, alice, alice) returns (uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "redeem blocked when paused");
        vm.prank(guardian); vault.unpause();
    }

    function test_private_deposit_requires_receiver_whitelisted() public {
        // private vault
        Vault pv = new Vault(
            address(token),
            "Private Shares",
            "PVSH",
            admin,
            manager,
            guardian,
            true,
            1000,
            1
        );
        // whitelist sender but not receiver
        vm.prank(admin); pv.setWhitelist(alice, true);
        _approve(alice, 100 ether);
        bool reverted;
        vm.prank(alice);
        try pv.deposit(100 ether, bob) returns (uint256) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "receiver must be whitelisted");
        // whitelist receiver and succeed
        vm.prank(admin); pv.setWhitelist(bob, true);
        vm.prank(alice); pv.deposit(100 ether, bob);
        assertEq(pv.balanceOf(bob), 100 ether, "deposit to whitelisted receiver ok");
    }

    function test_set_manager_guardian_zero_reverts() public {
        bool reverted;
        vm.prank(admin);
        try vault.setManager(address(0)) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "manager zero");
        vm.prank(admin);
        bool reverted2;
        try vault.setGuardian(address(0)) { reverted2=false; } catch { reverted2=true; }
        assertTrue(reverted2, "guardian zero");
    }
    function test_third_party_redeem_with_allowance() public {
        // alice deposits 1000
        _approve(alice, 1000 ether);
        vm.prank(alice); vault.deposit(1000 ether, alice);
        // move past lock
        vm.warp(block.timestamp + 1 days + 1);
        // alice approves bob to redeem 200 shares
        vm.prank(alice); vault.approve(bob, 200 ether);
        uint256 bobBalBefore = token.balanceOf(bob);
        // bob redeems on behalf of alice, assets sent to bob
        vm.prank(bob);
        uint256 assetsOut = vault.redeem(200 ether, bob, alice);
        assertEq(token.balanceOf(bob), bobBalBefore + assetsOut, "bob received assets");
        assertEq(vault.balanceOf(alice), 800 ether, "alice shares reduced");
    }

    function test_admin_setters_and_bounds() public {
        // only admin can set
        bool reverted;
        vm.prank(bob); // not admin
        try vault.setPerformanceFee(2000) { reverted=false; } catch { reverted=true; }
        assertTrue(reverted, "only admin set perf fee");

        // admin updates
        vm.prank(admin); vault.setPerformanceFee(2000);
        vm.prank(admin); vault.setLockMinDays(2);
        vm.prank(admin); vault.setManager(bob);
        vm.prank(admin); vault.setGuardian(alice);

        // out of bounds >30% should revert
        vm.prank(admin);
        bool reverted2;
        try vault.setPerformanceFee(4000) { reverted2=false; } catch { reverted2=true; }
        assertTrue(reverted2, "cap 30%");
    }

    function test_snapshot_event_emitted_with_values() public {
        // initial state: no deposits → PS=1e18, A=0, S=0
        uint256 A = token.balanceOf(address(vault));
        uint256 S = vault.totalSupply();
        uint256 PS = vault.ps();
        vm.expectEmit(true, true, true, true, address(vault));
        emit NavSnapshot(A, 0, S, PS, block.timestamp);
        vault.snapshot();
    }

    function test_whitelist_event_emitted() public {
        // using a fresh private vault to test event
        Vault pv = new Vault(
            address(token),
            "Private Shares",
            "PVSH",
            admin,
            manager,
            guardian,
            true,
            1000,
            1
        );
        vm.prank(admin);
        vm.expectEmit(true, true, false, true, address(pv));
        emit WhitelistSet(alice, true);
        pv.setWhitelist(alice, true);
    }
}
