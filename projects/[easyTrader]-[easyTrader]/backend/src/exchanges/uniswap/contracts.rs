use ethers::prelude::*;
use anyhow::Result;

// Uniswap V3 Quoter合约ABI (简化版本)
abigen!(
    IUniswapV3Quoter,
    r#"[
        function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)
        function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)
    ]"#
);

// Uniswap V3 Router合约ABI (简化版本)
abigen!(
    IUniswapV3Router,
    r#"[
        function exactInputSingle(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) external payable returns (uint256 amountOut)
        function exactOutputSingle(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) external payable returns (uint256 amountIn)
    ]"#
);

// ERC20合约ABI
abigen!(
    IERC20,
    r#"[
        function balanceOf(address owner) external view returns (uint256)
        function transfer(address to, uint256 amount) external returns (bool)
        function approve(address spender, uint256 amount) external returns (bool)
        function allowance(address owner, address spender) external view returns (uint256)
        function decimals() external view returns (uint8)
        function symbol() external view returns (string)
        function name() external view returns (string)
    ]"#
);

// WETH合约ABI
abigen!(
    IWETH,
    r#"[
        function deposit() external payable
        function withdraw(uint256 amount) external
        function balanceOf(address owner) external view returns (uint256)
        function transfer(address to, uint256 amount) external returns (bool)
        function approve(address spender, uint256 amount) external returns (bool)
    ]"#
);

// 费率常量
pub const FEE_LOW: u32 = 500;      // 0.05%
pub const FEE_MEDIUM: u32 = 3000;  // 0.3%
pub const FEE_HIGH: u32 = 10000;   // 1%

// 以太坊主网合约地址
pub const UNISWAP_V3_ROUTER_ADDRESS: &str = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
pub const UNISWAP_V3_QUOTER_ADDRESS: &str = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
pub const WETH_ADDRESS: &str = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
pub const USDC_ADDRESS: &str = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// 辅助函数
pub fn parse_address(addr: &str) -> Result<Address, anyhow::Error> {
    Ok(addr.parse::<Address>()?)
}

pub fn get_token_address(symbol: &str) -> Result<Address, anyhow::Error> {
    match symbol.to_uppercase().as_str() {
        "ETH" | "WETH" => parse_address(WETH_ADDRESS),
        "USDC" => parse_address(USDC_ADDRESS),
        _ => Err(anyhow::anyhow!("Unsupported token: {}", symbol)),
    }
}

pub fn get_default_fee_for_pair(token_a: &str, token_b: &str) -> u32 {
    // 根据交易对返回默认费率
    match (token_a.to_uppercase().as_str(), token_b.to_uppercase().as_str()) {
        ("ETH", "USDC") | ("USDC", "ETH") | ("WETH", "USDC") | ("USDC", "WETH") => FEE_LOW, // 使用0.05%费率池
        _ => FEE_MEDIUM, 
    }
}