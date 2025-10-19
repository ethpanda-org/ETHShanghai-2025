// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./FXPool.sol";
import "./FXLPToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title FXPoolFactory
 * @notice Factory contract for deploying FX liquidity pools
 * @dev Manages pool creation and LP token deployment
 */
contract FXPoolFactory is Ownable {
    // Pool registry
    mapping(string => address) public pools;
    mapping(address => bool) public isPool;
    address[] public allPools;
    
    // Configuration
    address public aetherOracle;
    address public protocolTreasury;
    address public donationAddress;
    uint256 public defaultBaseFee = 30; // 0.3%
    
    // LP Token registry
    mapping(string => address) public lpTokens;
    
    event PoolCreated(
        string indexed pair,
        address indexed pool,
        address indexed lpToken,
        address creator
    );
    
    event ConfigurationUpdated(
        address oracle,
        address treasury,
        address donation
    );
    
    constructor(
        address _aetherOracle,
        address _protocolTreasury,
        address _donationAddress
    ) {
        require(_aetherOracle != address(0), "Invalid oracle");
        require(_protocolTreasury != address(0), "Invalid treasury");
        require(_donationAddress != address(0), "Invalid donation");
        
        aetherOracle = _aetherOracle;
        protocolTreasury = _protocolTreasury;
        donationAddress = _donationAddress;
    }
    
    /**
     * @notice Create a new FX pool
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param baseFee Base fee for the pool (in basis points)
     * @return pool Address of the created pool
     * @return lpToken Address of the LP token
     */
    function createPool(
        address tokenA,
        address tokenB,
        uint256 baseFee
    ) external returns (address pool, address lpToken) {
        require(tokenA != tokenB, "Same token");
        require(tokenA != address(0) && tokenB != address(0), "Invalid token");
        require(baseFee >= 1 && baseFee <= 1000, "Invalid fee"); // 0.01% to 10%
        
        // Create pair identifier
        string memory pair = _getPairIdentifier(tokenA, tokenB);
        require(pools[pair] == address(0), "Pool exists");
        
        // Deploy new pool
        pool = address(new FXPool(
            aetherOracle,
            protocolTreasury,
            donationAddress
        ));
        
        // Deploy LP token
        lpToken = address(new FXLPToken(
            string(abi.encodePacked("FX-LP-", _getTokenSymbol(tokenA), "-", _getTokenSymbol(tokenB))),
            string(abi.encodePacked("fxLP-", pair)),
            pair,
            pool
        ));
        
        // Initialize pool
        FXPool(payable(pool)).createPool(pair, baseFee);
        FXPool(payable(pool)).addSupportedToken(tokenA);
        FXPool(payable(pool)).addSupportedToken(tokenB);
        
        // Register pool
        pools[pair] = pool;
        lpTokens[pair] = lpToken;
        isPool[pool] = true;
        allPools.push(pool);
        
        emit PoolCreated(pair, pool, lpToken, msg.sender);
        
        return (pool, lpToken);
    }
    
    /**
     * @notice Get pool address for a pair
     * @param tokenA First token
     * @param tokenB Second token
     * @return pool Pool address (0 if not exists)
     */
    function getPool(
        address tokenA,
        address tokenB
    ) external view returns (address pool) {
        string memory pair = _getPairIdentifier(tokenA, tokenB);
        return pools[pair];
    }
    
    /**
     * @notice Update configuration
     * @param _oracle New oracle address
     * @param _treasury New treasury address
     * @param _donation New donation address
     */
    function updateConfiguration(
        address _oracle,
        address _treasury,
        address _donation
    ) external onlyOwner {
        if (_oracle != address(0)) aetherOracle = _oracle;
        if (_treasury != address(0)) protocolTreasury = _treasury;
        if (_donation != address(0)) donationAddress = _donation;
        
        emit ConfigurationUpdated(aetherOracle, protocolTreasury, donationAddress);
    }
    
    /**
     * @notice Get all pools
     * @return Array of pool addresses
     */
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }
    
    /**
     * @notice Get pool count
     * @return Number of pools created
     */
    function poolCount() external view returns (uint256) {
        return allPools.length;
    }
    
    // Internal functions
    
    function _getPairIdentifier(
        address tokenA,
        address tokenB
    ) internal pure returns (string memory) {
        // Sort tokens for consistent pair identifier
        if (uint160(tokenA) < uint160(tokenB)) {
            return string(abi.encodePacked(_toHexString(tokenA), "-", _toHexString(tokenB)));
        } else {
            return string(abi.encodePacked(_toHexString(tokenB), "-", _toHexString(tokenA)));
        }
    }
    
    function _getTokenSymbol(address token) internal view returns (string memory) {
        // Try to get token symbol, fallback to address
        try IERC20Metadata(token).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return _toHexString(token);
        }
    }
    
    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        
        return string(str);
    }
}

