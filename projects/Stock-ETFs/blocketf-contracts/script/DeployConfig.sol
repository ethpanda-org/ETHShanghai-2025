// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DeployConfig
 * @notice Configuration parameters for BlockETF deployment on BNB Testnet
 */
contract DeployConfig {
    // ==================== Network Configuration ====================

    // BNB Testnet Chain ID
    uint256 public constant CHAIN_ID = 97;

    // ==================== PancakeSwap V2 Addresses ====================

    address public constant PANCAKE_V2_FACTORY = 0x6725F303b657a9451d8BA641348b6761A6CC7a17;
    address public constant PANCAKE_V2_ROUTER = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

    // ==================== PancakeSwap V3 Addresses ====================

    address public constant PANCAKE_V3_FACTORY = 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865;
    address public constant PANCAKE_V3_SWAP_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address public constant PANCAKE_V3_NFT_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;
    address public constant PANCAKE_V3_QUOTER_V2 = 0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2;

    // ==================== BlockETFCore Configuration ====================

    // Initial asset weights (must sum to 10000 = 100%)
    // Top 5 Crypto Assets: WBNB, BTCB, ETH, ADA, BCH (Equal Weight)
    uint256 public constant WEIGHT_WBNB = 2000; // 20%
    uint256 public constant WEIGHT_BTCB = 2000; // 20%
    uint256 public constant WEIGHT_ETH = 2000;  // 20%
    uint256 public constant WEIGHT_ADA = 2000;  // 20%
    uint256 public constant WEIGHT_BCH = 2000;  // 20%

    // Fee configurations (basis points, 100 = 1%)
    uint256 public constant MINT_FEE = 30; // 0.3%
    uint256 public constant BURN_FEE = 30; // 0.3%
    uint256 public constant MANAGEMENT_FEE = 200; // 2% annual

    // Rebalance configuration
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5% deviation threshold
    uint256 public constant MIN_REBALANCE_COOLDOWN = 1 hours;
    uint256 public constant MAX_SLIPPAGE_LOSS = 100; // 1% max slippage

    // ==================== Token Addresses (To be deployed or set) ====================

    // These will be filled after mock token deployment or using existing testnet tokens
    // WBNB on BNB Testnet: 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd (official testnet WBNB)
    address public constant WBNB = 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd;

    // Mock tokens will be deployed during deployment script
    // Or use existing testnet tokens if available

    // ==================== Helper Functions ====================

    /**
     * @notice Get initial asset addresses array
     * @dev Order: WBNB, BTCB, ETH, ADA, BCH
     */
    function getInitialAssets(address btcb, address eth, address ada, address bch) public pure returns (address[] memory) {
        address[] memory assets = new address[](5);
        assets[0] = WBNB;
        assets[1] = btcb;
        assets[2] = eth;
        assets[3] = ada;
        assets[4] = bch;
        return assets;
    }

    /**
     * @notice Get initial weights array (uint256)
     * @dev Order matches getInitialAssets: WBNB, BTCB, ETH, ADA, BCH
     */
    function getInitialWeights() public pure returns (uint256[] memory) {
        uint256[] memory weights = new uint256[](5);
        weights[0] = WEIGHT_WBNB;
        weights[1] = WEIGHT_BTCB;
        weights[2] = WEIGHT_ETH;
        weights[3] = WEIGHT_ADA;
        weights[4] = WEIGHT_BCH;
        return weights;
    }

    /**
     * @notice Get initial weights array (uint32)
     * @dev Order matches getInitialAssets: WBNB, BTCB, ETH, ADA, BCH
     */
    function getInitialWeights32() public pure returns (uint32[] memory) {
        uint32[] memory weights = new uint32[](5);
        weights[0] = uint32(WEIGHT_WBNB);
        weights[1] = uint32(WEIGHT_BTCB);
        weights[2] = uint32(WEIGHT_ETH);
        weights[3] = uint32(WEIGHT_ADA);
        weights[4] = uint32(WEIGHT_BCH);
        return weights;
    }

    /**
     * @notice Get pool fees for V3 pools (in basis points)
     * @dev 500 = 0.05%, 2500 = 0.25%, 10000 = 1%
     */
    function getPoolFees() public pure returns (uint24[] memory) {
        uint24[] memory fees = new uint24[](5);
        fees[0] = 2500; // WBNB-USDT: 0.25%
        fees[1] = 2500; // BTCB-USDT: 0.25%
        fees[2] = 2500; // ETH-USDT: 0.25%
        fees[3] = 500;  // ADA-USDT: 0.05%
        fees[4] = 500;  // BCH-USDT: 0.05%
        return fees;
    }

    /**
     * @notice Validate configuration
     * @dev Checks that all weights sum to 10000
     */
    function validateConfig() public pure returns (bool) {
        uint256 totalWeight = WEIGHT_WBNB + WEIGHT_BTCB + WEIGHT_ETH + WEIGHT_ADA + WEIGHT_BCH;
        require(totalWeight == 10000, "Weights must sum to 10000");
        return true;
    }
}
