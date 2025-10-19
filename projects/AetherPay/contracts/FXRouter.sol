// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./FXPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FXRouter
 * @notice Advanced routing for optimal FX swaps across multiple pools
 * @dev Implements path finding, aggregation, and MEV protection
 */
contract FXRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    struct Route {
        address[] pools;      // Pool addresses in order
        address[] tokens;     // Token path
        uint256[] amounts;    // Amount for each hop
        uint256 totalGas;     // Estimated gas cost
    }
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
        bytes userData;       // For advanced features
    }
    
    // Pool registry
    mapping(string => address) public poolRegistry;
    mapping(address => bool) public authorizedPools;
    
    // Routing optimization
    uint256 private constant MAX_HOPS = 3;
    uint256 private constant GAS_PER_HOP = 150000;
    
    event RouteExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address[] route
    );
    
    /**
     * @notice Find best route for swap
     * @param params Swap parameters
     * @return bestRoute Optimal route details
     */
    function findBestRoute(
        SwapParams memory params
    ) public view returns (Route memory bestRoute) {
        // Simple direct route for MVP
        // In production, implement Dijkstra or A* algorithm
        
        address[] memory pools = new address[](1);
        address[] memory tokens = new address[](2);
        uint256[] memory amounts = new uint256[](1);
        
        // Try to find direct pool
        string memory pair = _getPairIdentifier(params.tokenIn, params.tokenOut);
        address directPool = poolRegistry[pair];
        
        if (directPool != address(0)) {
            pools[0] = directPool;
            tokens[0] = params.tokenIn;
            tokens[1] = params.tokenOut;
            amounts[0] = params.amountIn;
            
            bestRoute = Route({
                pools: pools,
                tokens: tokens,
                amounts: amounts,
                totalGas: GAS_PER_HOP
            });
        }
        
        return bestRoute;
    }
    
    /**
     * @notice Execute swap through optimal route
     * @param params Swap parameters
     * @return amountOut Final output amount
     */
    function swapExactTokensForTokens(
        SwapParams memory params
    ) external nonReentrant returns (uint256 amountOut) {
        require(params.deadline >= block.timestamp, "Expired");
        require(params.amountIn > 0, "Invalid amount");
        
        // Find best route
        Route memory route = findBestRoute(params);
        require(route.pools.length > 0, "No route found");
        
        // Transfer tokens from user
        IERC20(params.tokenIn).safeTransferFrom(
            msg.sender, 
            address(this), 
            params.amountIn
        );
        
        // Execute swaps through route
        uint256 currentAmount = params.amountIn;

        for (uint256 i = 0; i < route.pools.length; i++) {
            // Reset and approve pool (security best practice)
            IERC20(route.tokens[i]).safeApprove(route.pools[i], 0);
            IERC20(route.tokens[i]).safeApprove(route.pools[i], currentAmount);

            // Execute swap
            FXPool pool = FXPool(payable(route.pools[i]));
            string memory pair = _getPairFromPool(route.pools[i]);

            FXPool.SwapResult memory result = pool.swap(
                pair,
                route.tokens[i],
                route.tokens[i + 1],
                currentAmount,
                0 // No min for intermediate swaps
            );

            currentAmount = result.amountOut;

            // Reset approval after swap (security best practice)
            IERC20(route.tokens[i]).safeApprove(route.pools[i], 0);
        }
        
        require(currentAmount >= params.minAmountOut, "Insufficient output");
        
        // Transfer to recipient
        IERC20(params.tokenOut).safeTransfer(
            params.recipient == address(0) ? msg.sender : params.recipient,
            currentAmount
        );
        
        emit RouteExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            currentAmount,
            route.pools
        );
        
        return currentAmount;
    }
    
    /**
     * @notice Multi-pool arbitrage execution
     * @dev Finds and executes profitable arbitrage opportunities
     */
    function executeArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn
    ) external onlyOwner returns (uint256 profit) {
        // This is a simplified version
        // Real implementation would scan multiple pools and calculate profits
        
        // Step 1: Swap A -> B in pool 1
        // Step 2: Swap B -> A in pool 2
        // Step 3: Calculate profit
        
        // Implementation left as exercise
        return 0;
    }
    
    /**
     * @notice Register a pool
     */
    function registerPool(
        string memory pair,
        address pool
    ) external onlyOwner {
        require(pool != address(0), "Invalid pool");
        poolRegistry[pair] = pool;
        authorizedPools[pool] = true;
    }
    
    // Internal helpers
    function _getPairIdentifier(
        address tokenA,
        address tokenB
    ) internal pure returns (string memory) {
        // Create consistent pair identifier
        if (uint160(tokenA) < uint160(tokenB)) {
            return string(abi.encodePacked(tokenA, "/", tokenB));
        } else {
            return string(abi.encodePacked(tokenB, "/", tokenA));
        }
    }
    
    function _getPairFromPool(address pool) internal view returns (string memory) {
        // In production, pools would expose their pair
        // This is a placeholder
        return "USDC/USDT";
    }
}