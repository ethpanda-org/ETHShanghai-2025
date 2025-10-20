// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";

/**
 * @title ETFRouterV1 Constructor Tests
 * @notice Tests for ETFRouterV1 constructor and initialization
 */
contract ETFRouterV1ConstructorTest is ETFRouterV1TestBase {
    // TC-001: Valid constructor parameters - should deploy successfully
    function test_TC001_ValidConstructorParameters() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Verify all parameters are set correctly
        assertEq(address(router.etfCore()), address(etfCore));
        assertEq(address(router.v3Router()), address(v3Router));
        assertEq(address(router.priceOracle()), address(priceOracle));
        assertEq(address(router.v2Router()), address(v2Router));
        assertEq(address(router.quoterV3()), address(quoterV3));
        assertEq(router.USDT(), address(usdt));
        assertTrue(router.useV2Router(address(wbnb))); // WBNB should default to V2
    }

    // TC-002: Zero address ETFCore - should revert
    function test_TC002_ZeroAddressETFCore() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(0),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );
    }

    // TC-003: Zero address V3Router - should revert
    function test_TC003_ZeroAddressV3Router() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(0),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );
    }

    // TC-004: Zero address PriceOracle - should revert
    function test_TC004_ZeroAddressPriceOracle() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(0),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );
    }

    // TC-005: Zero address V2Router - should revert
    function test_TC005_ZeroAddressV2Router() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(0),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );
    }

    // TC-006: Zero address QuoterV3 - should revert
    function test_TC006_ZeroAddressQuoterV3() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(0),
            address(usdt),
            address(wbnb)
        );
    }

    // TC-007: Zero address USDT - should revert
    function test_TC007_ZeroAddressUSDT() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(0),
            address(wbnb)
        );
    }

    // TC-008: Zero address WBNB - should revert
    function test_TC008_ZeroAddressWBNB() public {
        vm.expectRevert();
        new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(0)
        );
    }

    // TC-009: Default values after deployment
    function test_TC009_DefaultValuesAfterDeployment() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Check default values
        assertEq(router.defaultSlippage(), 300); // 3%
        assertEq(router.defaultPoolFee(), 2500); // 0.25%
        assertTrue(router.useV2Router(address(wbnb))); // WBNB should use V2 by default
        assertEq(router.owner(), address(this)); // Deployer should be owner
    }

    // TC-010: Owner is set correctly
    function test_TC010_OwnerSetCorrectly() public {
        vm.prank(alice);
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        assertEq(router.owner(), alice);
    }

    // TC-011: Contract is not paused after deployment
    function test_TC011_ContractNotPausedAfterDeployment() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        assertFalse(router.paused());
    }

    // TC-012: USDT address is immutable and accessible
    function test_TC012_USDTAddressImmutableAndAccessible() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        assertEq(router.USDT(), address(usdt));
    }

    // TC-013: All immutable contract references are set correctly
    function test_TC013_ImmutableContractReferencesSetCorrectly() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Verify all immutable contracts are accessible and set correctly
        assertTrue(address(router.etfCore()) != address(0));
        assertTrue(address(router.v3Router()) != address(0));
        assertTrue(address(router.priceOracle()) != address(0));
        assertTrue(address(router.v2Router()) != address(0));
        assertTrue(address(router.quoterV3()) != address(0));

        // Verify they match the constructor parameters
        assertEq(address(router.etfCore()), address(etfCore));
        assertEq(address(router.v3Router()), address(v3Router));
        assertEq(address(router.priceOracle()), address(priceOracle));
        assertEq(address(router.v2Router()), address(v2Router));
        assertEq(address(router.quoterV3()), address(quoterV3));
    }

    // TC-014: Same address can be used for multiple parameters (edge case)
    function test_TC014_SameAddressMultipleParameters() public {
        // Test that same address can be used for different parameters (though not recommended)
        address sameAddress = address(0x1234);

        router = new ETFRouterV1(
            address(etfCore),
            sameAddress, // v3Router
            address(priceOracle),
            sameAddress, // v2Router (same as v3Router)
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Should deploy successfully
        assertEq(address(router.v3Router()), sameAddress);
        assertEq(address(router.v2Router()), sameAddress);
    }

    // TC-015: Contract initialization state after deployment
    function test_TC015_ContractInitializationState() public {
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Verify initial state of mappings
        assertTrue(router.useV2Router(address(wbnb))); // WBNB should use V2
        assertFalse(router.useV2Router(address(usdt))); // USDT should not use V2 by default
        assertEq(router.assetV3Pools(address(usdt)), address(0)); // No pools configured initially

        // Verify contract supports expected interfaces
        assertEq(router.owner(), address(this));
        assertFalse(router.paused());
    }
}
