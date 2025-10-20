// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GlobalVault.sol";
import "../src/PrivacyAMM.sol";
import "../src/Groth16Verifier.sol";
import "../src/mocks/MockWETH.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title DeployScript
 * @notice 部署 Privacy AMM 完整系统
 * @dev 部署顺序：
 *      1. Mock 代币 (WETH, USDC)
 *      2. Groth16 验证器
 *      3. GlobalVault
 *      4. PrivacyAMM
 *      5. 初始化池子
 * 
 * 使用方法：
 *   # 本地部署 (Anvil)
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast
 * 
 *   # 测试网部署 (Sepolia)
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    // ============ 部署的合约实例 ============
    
    MockWETH public weth;
    MockUSDC public usdc;
    Groth16Verifier public verifier;
    GlobalVault public vault;
    PrivacyAMM public amm;

    bytes32 private initialCommitmentOverride;
    bool private hasInitialCommitmentOverride;

    // ============ 配置参数 ============
    
    // 初始流动性配置
    uint256 public constant INITIAL_WETH = 10 ether;           // 10 WETH
    uint256 public constant INITIAL_USDC = 20000 * 10**6;       // 20,000 USDC (6 decimals)
    
    // 默认 Poseidon 承诺（Poseidon(INITIAL_WETH, INITIAL_USDC, 0, 0)）
    bytes32 public constant DEFAULT_INITIAL_COMMITMENT =
        0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1;

    // 测试账户初始余额
    uint256 public constant TEST_WETH_AMOUNT = 100 ether;       // 100 WETH
    uint256 public constant TEST_USDC_AMOUNT = 100000 * 10**6;  // 100,000 USDC

    // ============ 部署流程 ============
    
    function run() external {
        // 获取部署者私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying Privacy AMM System");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        _loadInitialCommitmentOverride();

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: 部署 Mock 代币
        deployMockTokens();

        // Step 2: 部署 Groth16 验证器
        deployVerifier();

        // Step 3: 部署 GlobalVault
        deployVault();

        // Step 4: 部署 PrivacyAMM
        deployAMM();

        // Step 5: 配置系统
        configureSystem();

        // Step 6: 初始化池子
        initializePool();

        // Step 7: 为测试账户铸造代币
        mintTestTokens(deployer);

        vm.stopBroadcast();

        // 打印部署摘要
        printDeploymentSummary();
    }

    function _loadInitialCommitmentOverride() internal {
        try vm.envBytes32("INITIAL_COMMITMENT") returns (bytes32 value) {
            initialCommitmentOverride = value;
            hasInitialCommitmentOverride = true;
            console.log("Found INITIAL_COMMITMENT override:", vm.toString(initialCommitmentOverride));
        } catch {}
    }

    // ============ Step 1: 部署 Mock 代币 ============
    
    function deployMockTokens() internal {
        console.log("Step 1: Deploying Mock Tokens...");
        
        weth = new MockWETH();
        console.log("  MockWETH deployed at:", address(weth));
        
        usdc = new MockUSDC();
        console.log("  MockUSDC deployed at:", address(usdc));
        
        console.log("");
    }

    // ============ Step 2: 部署 Groth16 验证器 ============
    
    function deployVerifier() internal {
        console.log("Step 2: Deploying Groth16 Verifier...");
        
        verifier = new Groth16Verifier();
        console.log("  Groth16Verifier deployed at:", address(verifier));
        
        console.log("");
    }

    // ============ Step 3: 部署 GlobalVault ============
    
    function deployVault() internal {
        console.log("Step 3: Deploying GlobalVault...");
        
        vault = new GlobalVault(address(weth), address(usdc));
        console.log("  GlobalVault deployed at:", address(vault));
        
        console.log("");
    }

    // ============ Step 4: 部署 PrivacyAMM ============
    
    function deployAMM() internal {
        console.log("Step 4: Deploying PrivacyAMM...");
        
        amm = new PrivacyAMM(address(vault), address(verifier));
        console.log("  PrivacyAMM deployed at:", address(amm));
        
        console.log("");
    }

    // ============ Step 5: 配置系统 ============
    
    function configureSystem() internal {
        console.log("Step 5: Configuring System...");
        
        // 设置 AMM 合约地址到 Vault
        vault.setAMMContract(address(amm));
        console.log("  Set AMM contract in Vault");
        
        console.log("");
    }

    // ============ Step 6: 初始化池子 ============
    
    function initializePool() internal {
        console.log("Step 6: Initializing Pool...");
        
        // 铸造初始流动性代币给 AMM 合约
        weth.mint(address(amm), INITIAL_WETH);
        usdc.mint(address(amm), INITIAL_USDC);
        
        // 授权 Vault 从 AMM 拉取初始流动性
        amm.approveVault(address(weth), INITIAL_WETH);
        amm.approveVault(address(usdc), INITIAL_USDC);
        
        bytes32 initialCommitment;
        if (hasInitialCommitmentOverride) {
            initialCommitment = initialCommitmentOverride;
            console.log("  Using override commitment from env:", vm.toString(initialCommitment));
        } else {
            initialCommitment = DEFAULT_INITIAL_COMMITMENT;
            console.log("  Using default Poseidon commitment:", vm.toString(initialCommitment));
        }
        
        // 通过 AMM 初始化池子
        amm.initializePool(initialCommitment, INITIAL_WETH, INITIAL_USDC);
        
        console.log("  Initial WETH:", INITIAL_WETH);
        console.log("  Initial USDC:", INITIAL_USDC);
        console.log("  Initial Commitment:", vm.toString(initialCommitment));
        
        console.log("");
    }

    // ============ Step 7: 铸造测试代币 ============

    function mintTestTokens(address recipient) internal {
        console.log("Step 7: Minting Test Tokens...");

        // Anvil 默认账户列表
        address[10] memory anvilAccounts = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,
            0x976EA74026E726554dB657fA54763abd0C3a0aa9,
            0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,
            0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,
            0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
        ];

        for (uint i = 0; i < anvilAccounts.length; i++) {
            weth.mint(anvilAccounts[i], TEST_WETH_AMOUNT);
            usdc.mint(anvilAccounts[i], TEST_USDC_AMOUNT);
        }

        console.log("  Minted to all 10 Anvil accounts:");
        console.log("  - Each: 100 WETH, 100,000 USDC");
        console.log("");
    }

    // ============ 部署摘要 ============
    
    function printDeploymentSummary() internal view {
        console.log("===========================================");
        console.log("Deployment Summary");
        console.log("===========================================");
        console.log("");
        
        console.log("Contracts:");
        console.log("  MockWETH:         ", address(weth));
        console.log("  MockUSDC:         ", address(usdc));
        console.log("  Groth16Verifier:  ", address(verifier));
        console.log("  GlobalVault:      ", address(vault));
        console.log("  PrivacyAMM:       ", address(amm));
        console.log("");
        
        console.log("Pool State:");
        console.log("  Initial WETH:     ", INITIAL_WETH);
        console.log("  Initial USDC:     ", INITIAL_USDC);
        console.log("  Current Root:     ", vm.toString(vault.currentRoot()));
        console.log("  Pool Commitment:  ", vm.toString(vault.currentCommitment()));
        console.log("");
        
        console.log("Next Steps:");
        console.log("  1. Update .env with contract addresses");
        console.log("  2. Run tests: forge test");
        console.log("  3. Generate ZK proofs: cd circuits && npm run prove");
        console.log("  4. Interact with contracts using cast or frontend");
        console.log("");
        
        console.log("Environment Variables to Set:");
        console.log("  export WETH_ADDRESS=", address(weth));
        console.log("  export USDC_ADDRESS=", address(usdc));
        console.log("  export VERIFIER_ADDRESS=", address(verifier));
        console.log("  export VAULT_ADDRESS=", address(vault));
        console.log("  export AMM_ADDRESS=", address(amm));
        console.log("");
        
        console.log("===========================================");
    }
}
