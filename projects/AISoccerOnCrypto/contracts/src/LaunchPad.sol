// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenBoundAgent.sol";
import "./IdentityRegistry.sol";
import "./IUniswapV2.sol";

interface ILaunchPad {
    struct TokenLaunch {
        address tokenAddress;
        uint256 agentId;
        address agentOwner;
        uint256 startTime;
        uint256 totalMinted;
        uint256 totalFees;
        bool isCompleted;
        bool isFailed;
        address uniswapPool;
    }
    
    function tokenLaunches(uint256 agentId) external view returns (
        address tokenAddress,
        uint256 agentId_,
        address agentOwner,
        uint256 startTime,
        uint256 totalMinted,
        uint256 totalFees,
        bool isCompleted,
        bool isFailed,
        address uniswapPool
    );
}

/// @title LaunchPad
/// @notice Launch platform for agent-bound ERC20 tokens with fair launch mechanism
/// @dev Manages token creation, minting, and liquidity provision
contract LaunchPad is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    uint256 public constant PUBLIC_MINT_SUPPLY = 50_000_000 * 10**18; // 50% for public mint
    uint256 public constant OWNER_ALLOCATION = 5_000_000 * 10**18; // 5% for agent owner
    uint256 public constant LIQUIDITY_ALLOCATION = 45_000_000 * 10**18; // 45% for liquidity
    
    uint256 public constant TOKENS_PER_BATCH = 1000 * 10**18; // 1000 tokens per batch
    uint256 public constant PRICE_PER_BATCH = 0.001 ether; // 0.001 ETH per batch
    uint256 public constant MIN_BATCHES = 1;
    uint256 public constant MAX_BATCHES = 100;
    uint256 public constant MAX_MESSAGE_LENGTH = 200; // bytes
    
    uint256 public constant MINT_DURATION = 3 days;
    uint256 public constant FOUNDATION_FEE_PERCENT = 5; // 5% of mint fees
    uint256 public constant LIQUIDITY_FEE_PERCENT = 95; // 95% of mint fees

    IIdentityRegistry public immutable identityRegistry;
    address public foundationAddress;
    IUniswapV2Router02 public immutable uniswapV2Router;

    // Token launch information
    struct TokenLaunch {
        address tokenAddress;
        uint256 agentId;
        address agentOwner;
        uint256 startTime;
        uint256 totalMinted;
        uint256 totalFees;
        bool isCompleted;
        bool isFailed;
        address uniswapPool;
    }

    // Mapping: agentId => TokenLaunch
    mapping(uint256 => TokenLaunch) public tokenLaunches;
    
    // Mapping: tokenAddress => agentId
    mapping(address => uint256) public tokenToAgent;
    
    // Mapping: tokenAddress => user => minted amount in ETH
    mapping(address => mapping(address => uint256)) public userMintedFees;
    
    // Mapping: tokenAddress => user => minted token amount
    mapping(address => mapping(address => uint256)) public userMintedTokens;

    // Events
    event TokenLaunched(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed agentOwner,
        string name,
        string symbol
    );

    event TokenMinted(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed user,
        uint256 batches,
        uint256 tokenAmount,
        uint256 fee,
        string message
    );

    event LaunchCompleted(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address uniswapPool,
        uint256 liquidityTokens,
        uint256 liquidityETH
    );

    event LaunchFailed(
        uint256 indexed agentId,
        address indexed tokenAddress
    );

    event Refunded(
        address indexed tokenAddress,
        address indexed user,
        uint256 refundAmount,
        uint256 burnedTokens
    );

    event FoundationAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    /// @notice Constructor
    /// @param _identityRegistry Address of the IdentityRegistry contract
    /// @param _foundationAddress Address to receive foundation fees
    /// @param _uniswapV2Router Address of Uniswap V2 Router
    constructor(
        address _identityRegistry,
        address _foundationAddress,
        address _uniswapV2Router
    ) Ownable(msg.sender) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_foundationAddress != address(0), "Invalid foundation address");
        require(_uniswapV2Router != address(0), "Invalid router");

        identityRegistry = IIdentityRegistry(_identityRegistry);
        foundationAddress = _foundationAddress;
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
    }

    /// @notice Launch a new token for an agent
    /// @param agentId The agent ID to bind the token to
    /// @return tokenAddress The address of the newly created token
    function launchToken(
        uint256 agentId
    ) external returns (address tokenAddress) {
        // Verify caller is the agent owner
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(msg.sender == agentOwner, "Not agent owner");

        // Check if token already exists for this agent
        require(tokenLaunches[agentId].tokenAddress == address(0), "Token already exists for this agent");

        // Create token name and symbol with agent ID
        string memory tokenName = string(abi.encodePacked("Agent Bound Token #", _uint2str(agentId)));
        string memory tokenSymbol = string(abi.encodePacked("ABT", _uint2str(agentId)));

        // Deploy new TokenBoundAgent contract
        TokenBoundAgent newToken = new TokenBoundAgent(
            tokenName,
            tokenSymbol,
            agentId,
            address(this)
        );

        tokenAddress = address(newToken);

        // Initialize token launch
        tokenLaunches[agentId] = TokenLaunch({
            tokenAddress: tokenAddress,
            agentId: agentId,
            agentOwner: agentOwner,
            startTime: block.timestamp,
            totalMinted: 0,
            totalFees: 0,
            isCompleted: false,
            isFailed: false,
            uniswapPool: address(0)
        });

        tokenToAgent[tokenAddress] = agentId;

        emit TokenLaunched(agentId, tokenAddress, agentOwner, tokenName, tokenSymbol);
    }

    /// @notice Mint tokens by purchasing batches
    /// @param agentId The agent ID whose token to mint
    /// @param batches Number of batches to mint (1-100)
    /// @param message Optional message (max 200 bytes)
    function mint(
        uint256 agentId,
        uint256 batches,
        string calldata message
    ) external payable nonReentrant {
        TokenLaunch storage launch = tokenLaunches[agentId];
        require(launch.tokenAddress != address(0), "Token not launched");
        require(!launch.isCompleted, "Launch already completed");
        require(!launch.isFailed, "Launch has failed");
        require(block.timestamp <= launch.startTime + MINT_DURATION, "Mint period expired");
        
        require(batches >= MIN_BATCHES && batches <= MAX_BATCHES, "Invalid batch count");
        require(bytes(message).length <= MAX_MESSAGE_LENGTH, "Message too long");

        uint256 tokenAmount = batches * TOKENS_PER_BATCH;
        uint256 requiredFee = batches * PRICE_PER_BATCH;
        require(msg.value == requiredFee, "Incorrect payment");

        // Check if minting would exceed public mint supply
        require(launch.totalMinted + tokenAmount <= PUBLIC_MINT_SUPPLY, "Exceeds public mint supply");

        // Update launch data
        launch.totalMinted += tokenAmount;
        launch.totalFees += requiredFee;

        // Track user's minted amount
        userMintedFees[launch.tokenAddress][msg.sender] += requiredFee;
        userMintedTokens[launch.tokenAddress][msg.sender] += tokenAmount;

        // Mint tokens to user
        TokenBoundAgent(launch.tokenAddress).mint(msg.sender, tokenAmount);

        emit TokenMinted(agentId, launch.tokenAddress, msg.sender, batches, tokenAmount, requiredFee, message);

        // Check if public mint is complete
        if (launch.totalMinted == PUBLIC_MINT_SUPPLY) {
            _completeLaunch(agentId);
        }
    }

    /// @notice Request refund if launch failed (after 3 days without reaching target)
    /// @param agentId The agent ID whose token to refund
    function requestRefund(uint256 agentId) external nonReentrant {
        TokenLaunch storage launch = tokenLaunches[agentId];
        require(launch.tokenAddress != address(0), "Token not launched");
        require(!launch.isCompleted, "Launch completed successfully");

        // Check if mint period has expired and target not reached
        if (!launch.isFailed) {
            require(block.timestamp > launch.startTime + MINT_DURATION, "Mint period not expired");
            require(launch.totalMinted < PUBLIC_MINT_SUPPLY, "Target reached");
            launch.isFailed = true;
            emit LaunchFailed(agentId, launch.tokenAddress);
        } else {
            require(launch.isFailed, "Launch not failed");
        }

        // Process refund for user
        uint256 userFee = userMintedFees[launch.tokenAddress][msg.sender];
        uint256 userTokens = userMintedTokens[launch.tokenAddress][msg.sender];
        
        require(userFee > 0, "No minted amount to refund");

        // Reset user's minted amount
        userMintedFees[launch.tokenAddress][msg.sender] = 0;
        userMintedTokens[launch.tokenAddress][msg.sender] = 0;

        // Burn user's tokens
        TokenBoundAgent(launch.tokenAddress).burn(msg.sender, userTokens);

        // Refund ETH
        (bool success, ) = msg.sender.call{value: userFee}("");
        require(success, "Refund failed");

        emit Refunded(launch.tokenAddress, msg.sender, userFee, userTokens);
    }

    /// @notice Get token launch details
    /// @param agentId The agent ID
    /// @return launch The token launch information
    function getTokenLaunch(uint256 agentId) external view returns (TokenLaunch memory) {
        return tokenLaunches[agentId];
    }

    /// @notice Get user's minted information for a token
    /// @param tokenAddress The token address
    /// @param user The user address
    /// @return mintedFees Total fees paid
    /// @return mintedTokens Total tokens minted
    function getUserMintInfo(
        address tokenAddress,
        address user
    ) external view returns (uint256 mintedFees, uint256 mintedTokens) {
        return (userMintedFees[tokenAddress][user], userMintedTokens[tokenAddress][user]);
    }

    /// @notice Check if launch can be failed (mint period expired without reaching target)
    /// @param agentId The agent ID
    /// @return canFail True if launch can be marked as failed
    function canFailLaunch(uint256 agentId) external view returns (bool) {
        TokenLaunch storage launch = tokenLaunches[agentId];
        return (
            launch.tokenAddress != address(0) &&
            !launch.isCompleted &&
            !launch.isFailed &&
            block.timestamp > launch.startTime + MINT_DURATION &&
            launch.totalMinted < PUBLIC_MINT_SUPPLY
        );
    }

    /// @notice Update foundation address (only owner)
    /// @param newFoundation New foundation address
    function setFoundationAddress(address newFoundation) external onlyOwner {
        require(newFoundation != address(0), "Invalid address");
        address oldAddress = foundationAddress;
        foundationAddress = newFoundation;
        emit FoundationAddressUpdated(oldAddress, newFoundation);
    }

    /// @notice Internal function to complete a launch
    /// @param agentId The agent ID
    function _completeLaunch(uint256 agentId) internal {
        TokenLaunch storage launch = tokenLaunches[agentId];
        require(!launch.isCompleted, "Already completed");

        launch.isCompleted = true;

        TokenBoundAgent token = TokenBoundAgent(launch.tokenAddress);

        // 1. Mint 5% to agent owner
        token.mint(launch.agentOwner, OWNER_ALLOCATION);

        // 2. Transfer 5% of fees to foundation
        uint256 foundationFee = (launch.totalFees * FOUNDATION_FEE_PERCENT) / 100;
        (bool success1, ) = foundationAddress.call{value: foundationFee}("");
        require(success1, "Foundation transfer failed");

        // 3. Enable transfers
        token.enableTransfer();

        // 4. Mint remaining 45% for liquidity
        token.mint(address(this), LIQUIDITY_ALLOCATION);

        // 5. Create Uniswap V3 pool and add liquidity
        uint256 liquidityETH = launch.totalFees - foundationFee;
        address pool = _createAndAddLiquidity(launch.tokenAddress, LIQUIDITY_ALLOCATION, liquidityETH);
        
        launch.uniswapPool = pool;

        emit LaunchCompleted(agentId, launch.tokenAddress, pool, LIQUIDITY_ALLOCATION, liquidityETH);
    }

    /// @notice Internal function to create Uniswap V2 pair and add liquidity
    /// @param tokenAddress The token address
    /// @param tokenAmount Amount of tokens for liquidity
    /// @param ethAmount Amount of ETH for liquidity
    /// @return pair The created/existing pair address
    function _createAndAddLiquidity(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal returns (address pair) {
        // Get or create pair
        IUniswapV2Factory factory = IUniswapV2Factory(uniswapV2Router.factory());
        address weth = uniswapV2Router.WETH();
        
        pair = factory.getPair(tokenAddress, weth);
        if (pair == address(0)) {
            pair = factory.createPair(tokenAddress, weth);
        }

        // Approve router to spend tokens
        IERC20(tokenAddress).approve(address(uniswapV2Router), tokenAmount);

        // Add liquidity (ETH + Token)
        // Using 95% of desired amounts as minimum to allow for small slippage
        uint256 minTokenAmount = (tokenAmount * 95) / 100;
        uint256 minETHAmount = (ethAmount * 95) / 100;
        
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            tokenAddress,
            tokenAmount,
            minTokenAmount,
            minETHAmount,
            address(0), // LP tokens go to zero address
            block.timestamp + 300 // 5 minutes deadline
        );

        return pair;
    }

    /// @notice Convert uint to string
    /// @param value The uint value to convert
    /// @return The string representation
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}