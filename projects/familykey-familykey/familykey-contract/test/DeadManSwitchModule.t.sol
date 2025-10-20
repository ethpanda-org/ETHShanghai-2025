// Placeholder test; requires forge-std after `forge install foundry-rs/forge-std`
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {DeadManSwitchModule} from "../src/DeadManSwitchModule.sol";
import {MockSafe} from "../src/mocks/MockSafe.sol";

contract DeadManSwitchModuleTest is Test {
    address Owner = address(0xA11CE);
    address bene = address(0xBEEF);
    MockSafe safe;
    DeadManSwitchModule mod;

    function setUp() public {
        safe = new MockSafe(Owner);
        mod = new DeadManSwitchModule(address(safe), bene, 1 days, 1 days);
        vm.prank(Owner);
        safe.enableModule(address(mod));
    }

    function testHappyPath() public {
        vm.prank(Owner);
        mod.checkIn();
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(bene);
        mod.startClaim();
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(bene);
        mod.finalizeClaim();
        address[] memory Owners = safe.getOwners();
        assertEq(Owners[0], bene);
    }
}
