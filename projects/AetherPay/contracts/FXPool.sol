// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IFXPool.sol";
import "./interfaces/IPublicGoodsFund.sol";

/**
 * @title FXPool
 * @author AetherPay Team
 * @notice Multi-stablecoin liquidity pool with AI oracle integration
 * @dev Implements low-slippage FX swaps with smart order splitting and dynamic fees
 */
contract FXPool is IFXPool, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_FEE = 1000; // 10%
    uint256 private constant MIN_FEE = 1;    // 0.01%
    uint256 private constant RATE_DECIMALS = 1e8; // 8 decimal places for rates
    
    // ============ Structs ============
    
    struct Pool {
        uint256 totalLiquidity;    // Total liquidity in the pool
        uint256 lpTokenSupply;     // Total LP tokens minted
        uint256 baseFee;          // Base fee in basis points
        uint256 dynamicFee;       // Dynamic fee adjustment
        uint256 lastUpdateTime;   // Last update timestamp
        bool isActive;            // Pool status
    }
    
    struct LiquidityPosition {
        uint256 shares;           // LP token shares
        uint256 depositTime;      // Deposit timestamp
        uint256 accumulatedFees;  // Accumulated fees
    }
    
    struct RateInfo {
        uint256 rate;            // Exchange rate
        uint256 confidence;      // Confidence level
        uint256 timestamp;       // Update timestamp
        address oracle;          // Oracle address
    }
    
    struct SwapResult {
        uint256 amountOut;       // Output amount
        uint256 fee;             // Fee charged
        uint256 slippage;        // Actual slippage
        uint256 executionRate;   // Execution rate
    }
    
    // ============ State Variables ============
    
    // Oracle address
    address public aetherOracle;

    // PublicGoodsFund address
    address public publicGoodsFundAddress;

    // Supported stablecoins
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Pool information for each token pair
    mapping(string => Pool) public pools;
    
    // Token reserves for each pool
    mapping(string => mapping(address => uint256)) public reserves;
    
    // Exchange rates from oracle
    mapping(string => RateInfo) public rates;
    
    // Liquidity positions
    mapping(string => mapping(address => LiquidityPosition)) public positions;
    
    // Fee configuration
    uint256 public protocolFeeShare = 1000;    // 10% of fees go to protocol
    uint256 public donationShare = 500;        // 5% of fees go to donations
    address public protocolTreasury;
    address public donationAddress;
    
    // Accumulated fees
    mapping(address => mapping(address => uint256)) public accumulatedFees;
    mapping(address => uint256) public protocolFees;
    mapping(address => uint256) public donationFunds;
    
    // Order splitting configuration
    uint256 public maxSlippage = 100;          // 1% max slippage
    uint256 public orderSplitThreshold = 100000 * 1e6; // $100k threshold for splitting
    
    // MEV protection
    mapping(address => uint256) public lastTradeBlock;
    uint256 public blockDelay = 1;
    
    // ============ Events ============
    
    event TokenAdded(address indexed token);
    event PoolCreated(string indexed pair);
    event LiquidityAdded(
        string indexed pair,
        address indexed provider,
        address token,
        uint256 amount,
        uint256 shares
    );
    event LiquidityRemoved(
        string indexed pair,
        address indexed provider,
        address token,
        uint256 amount,
        uint256 shares
    );
    event Swap(
        string indexed pair,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event RateUpdated(
        string indexed pair,
        uint256 rate,
        uint256 confidence,
        address oracle
    );
    event FeesCollected(
        address indexed collector,
        address token,
        uint256 amount
    );
    event DonationAccumulated(
        string indexed pair,
        uint256 amount
    );
    
    // ============ Modifiers ============
    
    modifier onlyOracle() {
        require(msg.sender == aetherOracle, "Only oracle");
        _;
    }
    
    modifier validPair(string memory pair) {
        require(pools[pair].isActive, "Pool not active");
        _;
    }
    
    modifier preventMEV() {
        require(
            lastTradeBlock[msg.sender] + blockDelay < block.number,
            "MEV protection"
        );
        lastTradeBlock[msg.sender] = block.number;
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _aetherOracle,
        address _protocolTreasury,
        address _donationAddress
    ) {
        require(_aetherOracle != address(0), "Invalid oracle");
        require(_protocolTreasury != address(0), "Invalid treasury");
        require(_donationAddress != address(0), "Invalid donation address");
        
        aetherOracle = _aetherOracle;
        protocolTreasury = _protocolTreasury;
        donationAddress = _donationAddress;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a supported token
     * @param token Token address to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
        
        emit TokenAdded(token);
    }
    
    /**
     * @notice Create a new liquidity pool
     * @param pair Currency pair identifier (e.g., "USDC/USDT")
     * @param baseFee Base fee in basis points
     */
    function createPool(
        string memory pair,
        uint256 baseFee
    ) external onlyOwner {
        require(!pools[pair].isActive, "Pool already exists");
        require(baseFee <= MAX_FEE, "Fee too high");
        require(baseFee >= MIN_FEE, "Fee too low");
        
        pools[pair] = Pool({
            totalLiquidity: 0,
            lpTokenSupply: 0,
            baseFee: baseFee,
            dynamicFee: 0,
            lastUpdateTime: block.timestamp,
            isActive: true
        });
        
        emit PoolCreated(pair);
    }
    
    /**
     * @notice Update fee configuration
     */
    function updateFeeShares(
        uint256 _protocolFeeShare,
        uint256 _donationShare
    ) external onlyOwner {
        require(_protocolFeeShare + _donationShare <= 5000, "Fee share too high");
        
        protocolFeeShare = _protocolFeeShare;
        donationShare = _donationShare;
    }
    
    // ============ Liquidity Management ============
    
    /**
     * @notice Add liquidity to a pool
     * @param pair Currency pair
     * @param token Token to deposit
     * @param amount Amount to deposit
     * @return shares LP token shares minted
     */
    function addLiquidity(
        string memory pair,
        address token,
        uint256 amount
    ) external validPair(pair) nonReentrant whenNotPaused returns (uint256 shares) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be positive");
        
        Pool storage pool = pools[pair];
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate shares
        if (pool.lpTokenSupply == 0) {
            shares = amount;
        } else {
            shares = (amount * pool.lpTokenSupply) / pool.totalLiquidity;
        }
        
        // Update state
        reserves[pair][token] += amount;
        pool.totalLiquidity += amount;
        pool.lpTokenSupply += shares;
        
        positions[pair][msg.sender].shares += shares;
        positions[pair][msg.sender].depositTime = block.timestamp;
        
        emit LiquidityAdded(pair, msg.sender, token, amount, shares);
        
        return shares;
    }
    
    /**
     * @notice Remove liquidity from a pool
     * @param pair Currency pair
     * @param shares LP token shares to burn
     * @param token Token to receive
     * @return amount Amount of tokens received
     */
    function removeLiquidity(
        string memory pair,
        uint256 shares,
        address token
    ) external validPair(pair) nonReentrant returns (uint256 amount) {
        require(supportedTokens[token], "Token not supported");
        require(shares > 0, "Shares must be positive");
        
        LiquidityPosition storage position = positions[pair][msg.sender];
        require(position.shares >= shares, "Insufficient shares");
        
        Pool storage pool = pools[pair];
        
        // Calculate amount to return
        amount = (shares * reserves[pair][token]) / pool.lpTokenSupply;
        
        // Update state
        position.shares -= shares;
        pool.lpTokenSupply -= shares;
        pool.totalLiquidity -= amount;
        reserves[pair][token] -= amount;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit LiquidityRemoved(pair, msg.sender, token, amount, shares);
        
        return amount;
    }
    
    // ============ Swap Functions ============
    
    /**
     * @notice Swap tokens using oracle rates
     * @param pair Currency pair
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param minAmountOut Minimum output amount
     * @return result Swap result details
     */
    function swap(
        string memory pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external validPair(pair) nonReentrant preventMEV whenNotPaused returns (SwapResult memory result) {
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Token not supported");
        require(tokenIn != tokenOut, "Same token swap");
        require(amountIn > 0, "Amount must be positive");
        
        // Get oracle rate
        RateInfo memory rateInfo = rates[pair];
        require(rateInfo.timestamp > 0, "No rate available");
        require(block.timestamp - rateInfo.timestamp < 300, "Rate too old"); // 5 min max
        
        // Check if order splitting is needed
        if (amountIn > orderSplitThreshold) {
            return _executeSmartOrderSplit(pair, tokenIn, tokenOut, amountIn, minAmountOut);
        }
        
        // Calculate output amount with fees
        result = _calculateSwapAmount(pair, tokenIn, tokenOut, amountIn, rateInfo.rate);
        require(result.amountOut >= minAmountOut, "Slippage too high");

        // Execute swap with actual execution rate
        _executeSwap(pair, tokenIn, tokenOut, amountIn, result.amountOut, result.fee, result.executionRate);

        emit Swap(pair, msg.sender, tokenIn, tokenOut, amountIn, result.amountOut, result.fee);

        return result;
    }
    
    /**
     * @notice Get swap quote without executing
     * @param pair Currency pair
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return result Quote details
     */
    function getQuote(
        string memory pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view validPair(pair) returns (SwapResult memory result) {
        RateInfo memory rateInfo = rates[pair];
        require(rateInfo.timestamp > 0, "No rate available");
        
        return _calculateSwapAmount(pair, tokenIn, tokenOut, amountIn, rateInfo.rate);
    }
    
    // ============ Oracle Integration ============
    
    /**
     * @notice Update exchange rate from oracle
     * @param pair Currency pair
     * @param rate Exchange rate
     * @param confidence Confidence level
     */
    function updateRate(
        string memory pair,
        uint256 rate,
        uint256 confidence
    ) external override onlyOracle {
        rates[pair] = RateInfo({
            rate: rate,
            confidence: confidence,
            timestamp: block.timestamp,
            oracle: msg.sender
        });
        
        // Update dynamic fees based on confidence
        _updateDynamicFees(pair, confidence);
        
        emit RateUpdated(pair, rate, confidence, msg.sender);
    }
    
    /**
     * @notice Get pool balance for a pair
     * @param pair Currency pair
     * @return Total pool liquidity
     */
    function getPoolBalance(string memory pair) external view override returns (uint256) {
        return pools[pair].totalLiquidity;
    }
    
    /**
     * @notice Settle a trade from oracle
     * @param trader Trader address
     * @param pair Currency pair
     * @param amount Trade amount
     * @param rate Execution rate
     * @return success Trade success status
     */
    function settleTrade(
        address trader,
        string memory pair,
        uint256 amount,
        uint256 rate
    ) external override onlyOracle returns (bool success) {
        // This function allows the oracle to execute trades on behalf of users
        // Implementation depends on specific settlement mechanism
        
        // Record price spread for donation if applicable
        RateInfo memory oracleRate = rates[pair];
        if (rate > oracleRate.rate) {
            uint256 spreadBps = ((rate - oracleRate.rate) * BASIS_POINTS) / oracleRate.rate;
            uint256 donationAmount = (amount * spreadBps * donationShare) / (BASIS_POINTS * BASIS_POINTS);
            donationFunds[address(0)] += donationAmount; // Native currency donations
            emit DonationAccumulated(pair, donationAmount);
        }
        
        return true;
    }
    
    // ============ Fee Management ============
    
    /**
     * @notice Collect accumulated fees
     * @param token Token to collect fees for
     */
    function collectFees(address token) external nonReentrant {
        uint256 amount = accumulatedFees[msg.sender][token];
        require(amount > 0, "No fees to collect");
        
        accumulatedFees[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit FeesCollected(msg.sender, token, amount);
    }
    
    /**
     * @notice Withdraw protocol fees
     * @param token Token to withdraw
     */
    function withdrawProtocolFees(address token) external onlyOwner {
        uint256 amount = protocolFees[token];
        require(amount > 0, "No fees to withdraw");
        
        protocolFees[token] = 0;
        IERC20(token).safeTransfer(protocolTreasury, amount);
    }
    
    /**
     * @notice Donate accumulated funds to charity
     */
    function processDonations() external {
        // Process donations for each token
        for (uint256 i = 0; i < tokenList.length; i++) {
            address token = tokenList[i];
            uint256 amount = donationFunds[token];
            
            if (amount > 0) {
                donationFunds[token] = 0;
                IERC20(token).safeTransfer(donationAddress, amount);
            }
        }
        
        // Process native currency donations
        uint256 nativeAmount = donationFunds[address(0)];
        if (nativeAmount > 0) {
            donationFunds[address(0)] = 0;
            (bool success, ) = donationAddress.call{value: nativeAmount}("");
            require(success, "Donation transfer failed");
        }
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Calculate swap output amount and fees
     */
    function _calculateSwapAmount(
        string memory pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 rate
    ) internal view returns (SwapResult memory result) {
        Pool memory pool = pools[pair];
        
        // Calculate base output
        uint256 amountOut;
        if (rate > 0) {
            // Rate is tokenOut/tokenIn with 8 decimals
            amountOut = (amountIn * rate) / RATE_DECIMALS;
        } else {
            // Fallback to 1:1 for stablecoin pairs
            amountOut = amountIn;
        }
        
        // Calculate total fee (base + dynamic)
        uint256 totalFee = pool.baseFee + pool.dynamicFee;
        uint256 feeAmount = (amountIn * totalFee) / BASIS_POINTS;
        
        // Calculate slippage based on trade size vs pool depth
        uint256 poolDepth = reserves[pair][tokenOut];
        uint256 slippage = 0;
        if (poolDepth > 0) {
            slippage = (amountOut * BASIS_POINTS) / poolDepth;
        }
        
        // Apply slippage adjustment
        uint256 slippageAdjustment = (amountOut * slippage) / BASIS_POINTS;
        amountOut = amountOut - slippageAdjustment - feeAmount;
        
        result = SwapResult({
            amountOut: amountOut,
            fee: feeAmount,
            slippage: slippage,
            executionRate: rate
        });
    }
    
    /**
     * @notice Execute the actual swap
     */
    function _executeSwap(
        string memory pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 executionRate  // ✅ 新增：实际执行汇率
    ) internal {
        // Transfer tokens
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update reserves
        reserves[pair][tokenIn] += amountIn;
        reserves[pair][tokenOut] -= amountOut;

        // Distribute fees
        uint256 protocolShare = (fee * protocolFeeShare) / BASIS_POINTS;
        uint256 donationAmount = (fee * donationShare) / BASIS_POINTS;
        uint256 lpShare = fee - protocolShare - donationAmount;

        protocolFees[tokenIn] += protocolShare;

        // ✅ FIXED: Contribute spread to PublicGoodsFund with correct execution rate
        if (publicGoodsFundAddress != address(0) && donationAmount > 0) {
            // Get AI oracle rate for spread calculation
            RateInfo memory rateInfo = rates[pair];

            // Approve PublicGoodsFund to spend donation amount
            IERC20(tokenIn).approve(publicGoodsFundAddress, donationAmount);

            // Calculate spread and contribute to public goods
            // Using AI oracle rate vs actual execution rate
            try IPublicGoodsFund(publicGoodsFundAddress).contributeSpread(
                msg.sender,           // trader/merchant address
                tokenIn,              // donation token
                rateInfo.rate,        // AI oracle rate (8 decimals)
                executionRate,        // ✅ FIXED: 使用实际执行汇率
                amountIn              // trade amount
            ) {
                // Spread contributed successfully
            } catch {
                // Fallback: accumulate in donationFunds if contribution fails
                donationFunds[tokenIn] += donationAmount;
            }
        } else {
            // Fallback: accumulate in donationFunds if no PublicGoodsFund
            donationFunds[tokenIn] += donationAmount;
        }

        // LP fees stay in the pool
        pools[pair].totalLiquidity += lpShare;
    }
    
    /**
     * @notice Execute smart order splitting for large trades
     */
    function _executeSmartOrderSplit(
        string memory pair,
        address tokenIn,
        address tokenOut,
        uint256 totalAmount,
        uint256 minAmountOut
    ) internal returns (SwapResult memory result) {
        // Split order into smaller chunks to minimize slippage
        uint256 chunkSize = orderSplitThreshold / 2; // 50k chunks
        uint256 remaining = totalAmount;
        uint256 totalOut = 0;
        uint256 totalFee = 0;
        
        RateInfo memory rateInfo = rates[pair];
        
        while (remaining > 0) {
            uint256 currentChunk = remaining > chunkSize ? chunkSize : remaining;
            
            SwapResult memory chunkResult = _calculateSwapAmount(
                pair, 
                tokenIn, 
                tokenOut, 
                currentChunk, 
                rateInfo.rate
            );
            
            _executeSwap(
                pair,
                tokenIn,
                tokenOut,
                currentChunk,
                chunkResult.amountOut,
                chunkResult.fee,
                chunkResult.executionRate  // ✅ 传递执行汇率
            );
            
            totalOut += chunkResult.amountOut;
            totalFee += chunkResult.fee;
            remaining -= currentChunk;
        }
        
        require(totalOut >= minAmountOut, "Total slippage too high");
        
        result = SwapResult({
            amountOut: totalOut,
            fee: totalFee,
            slippage: 0, // Calculated externally
            executionRate: rateInfo.rate
        });
    }
    
    /**
     * @notice Update dynamic fees based on oracle confidence
     */
    function _updateDynamicFees(string memory pair, uint256 confidence) internal {
        Pool storage pool = pools[pair];
        
        // Lower confidence = higher fees
        if (confidence >= 9000) {
            pool.dynamicFee = 0; // High confidence, no extra fee
        } else if (confidence >= 8000) {
            pool.dynamicFee = 10; // 0.1% extra
        } else if (confidence >= 7000) {
            pool.dynamicFee = 20; // 0.2% extra
        } else {
            pool.dynamicFee = 30; // 0.3% extra for low confidence
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get pool information
     */
    function getPoolInfo(string memory pair) external view returns (
        uint256 totalLiquidity,
        uint256 lpTokenSupply,
        uint256 baseFee,
        uint256 dynamicFee,
        bool isActive
    ) {
        Pool memory pool = pools[pair];
        return (
            pool.totalLiquidity,
            pool.lpTokenSupply,
            pool.baseFee,
            pool.dynamicFee,
            pool.isActive
        );
    }
    
    /**
     * @notice Get user position
     */
    function getUserPosition(
        string memory pair, 
        address user
    ) external view returns (
        uint256 shares,
        uint256 depositTime,
        uint256 currentValue
    ) {
        LiquidityPosition memory position = positions[pair][user];
        Pool memory pool = pools[pair];
        
        uint256 value = 0;
        if (pool.lpTokenSupply > 0) {
            value = (position.shares * pool.totalLiquidity) / pool.lpTokenSupply;
        }
        
        return (position.shares, position.depositTime, value);
    }
    
    /**
     * @notice Get supported tokens list
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @notice Set PublicGoodsFund address
     * @param _publicGoodsFundAddress PublicGoodsFund contract address
     */
    function setPublicGoodsFund(address _publicGoodsFundAddress) external onlyOwner {
        require(_publicGoodsFundAddress != address(0), "Invalid address");
        publicGoodsFundAddress = _publicGoodsFundAddress;
    }

    // ============ Emergency Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    receive() external payable {
        // Accept native currency for donations
    }
}