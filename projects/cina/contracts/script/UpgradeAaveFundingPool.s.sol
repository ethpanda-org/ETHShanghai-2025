// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/core/pool/AaveFundingPool.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract UpgradeAaveFundingPoolScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant POOL_CONFIGURATION = 0x35456038942C91eb16fe2E33C213135E75f8d188;
    address constant AAVE_POOL_PROXY = 0xAb20B978021333091CA307BB09E022Cec26E8608;
    address constant PROXY_ADMIN = 0x7bc6535d75541125fb3b494deCfdE10Db20C16d8;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address mockOracle = vm.envAddress("MOCK_ORACLE_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Upgrading AaveFundingPool on Sepolia");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("");
        
        // Deploy new AaveFundingPool implementation
        console.log("1. Deploying new AaveFundingPool implementation...");
        AaveFundingPool newImpl = new AaveFundingPool(
            POOL_MANAGER,
            POOL_CONFIGURATION
        );
        console.log("New Implementation:", address(newImpl));
        
        // Prepare initialization data
        console.log("");
        console.log("2. Preparing initialization with Mock Oracle...");
        console.log("Mock Oracle:", mockOracle);
        
        bytes memory initData = abi.encodeWithSelector(
            AaveFundingPool.initialize.selector,
            deployer,
            "f(x) USDC Leveraged Position",
            "xUSDC",
            USDC,
            mockOracle
        );
        
        // Upgrade through ProxyAdmin
        console.log("");
        console.log("3. Upgrading proxy...");
        ProxyAdmin proxyAdmin = ProxyAdmin(PROXY_ADMIN);
        
        // Upgrade and call
        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(AAVE_POOL_PROXY),
            address(newImpl),
            initData
        );
        console.log("Upgraded with initialization");
        
        console.log("");
        console.log("===========================================");
        console.log("Upgrade Summary");
        console.log("===========================================");
        console.log("Proxy:", AAVE_POOL_PROXY);
        console.log("New Implementation:", address(newImpl));
        console.log("ProxyAdmin:", PROXY_ADMIN);
        console.log("Price Oracle:", mockOracle);
        
        vm.stopBroadcast();
    }
}

