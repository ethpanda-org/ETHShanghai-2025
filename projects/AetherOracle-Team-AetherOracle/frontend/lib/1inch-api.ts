/**
 * 1inch API Integration
 * 用于获取真实的DEX聚合报价和最优交易路径
 */

const INCH_API_KEY = 'q2hUCarQSIrIGoCKKvKAylvyLiwebTpH';
const INCH_API_BASE = 'https://api.1inch.dev';
const CHAIN_ID = 11155420; // Optimism Sepolia

// Note: 1inch API only supports mainnet chains, not testnets
// This will fail for Optimism Sepolia, so we'll handle it gracefully
const SUPPORTED_CHAIN_IDS = [1, 10, 56, 137, 42161, 43114]; // Mainnet chains only

// Token地址映射（使用实际部署的地址）
export const TOKEN_ADDRESSES: Record<string, string> = {
  // Optimism Sepolia测试网地址 - Stablecoins
  USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
  DAI: '0x453Cbf07Af7293FDee270C9A15a95aedaEaA383e',

  // Wrapped Assets
  WETH: '0x134AA0b1B739d80207566B473534601DCea2aD92',
  WBTC: '0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A',

  // Additional Crypto Tokens (Deployed 2025-10-15)
  SOL: '0x738A919d321b2684f2020Ba05eb754785B59Cfa1',
  ADA: '0x2FB8F2b959fEA1fAC5A85d5eFaD9AF194028365d',
  BNB: '0xcF20D332E50cF90cd37bD716480A58a7CFE71C2B',
  MATIC: '0x5eC2F154e608Bc6e928a46a8BE8ADB51F912192B',
  AVAX: '0xe6e9a8ff8B88B81DE680f08dd78B82F93f24A456',
};

export interface InchSwapQuote {
  dstAmount: string; // 输出token数量
  srcAmount: string; // 输入token数量
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
  estimatedGas: string;
  tx?: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
}

export interface InchQuoteParams {
  src: string; // 源token地址
  dst: string; // 目标token地址
  amount: string; // 金额（wei格式）
  from?: string; // 用户地址（可选）
  slippage?: number; // 滑点（1-50）
  protocols?: string; // 指定协议
  fee?: number; // 手续费（0-3）
  gasPrice?: string; // Gas价格
  complexityLevel?: number; // 路径复杂度（0-3）
  parts?: number; // 分割数量
  mainRouteParts?: number; // 主路径分割
  gasLimit?: number; // Gas限制
}

/**
 * 获取1inch Swap报价
 */
export async function get1inchQuote(params: InchQuoteParams): Promise<InchSwapQuote | null> {
  try {
    // Check if chain is supported
    if (!SUPPORTED_CHAIN_IDS.includes(CHAIN_ID)) {
      // Silently return null for unsupported chains (testnets)
      return null;
    }

    const {
      src,
      dst,
      amount,
      from,
      slippage = 1,
      protocols,
      fee = 0,
      gasPrice,
      complexityLevel = 2,
      parts = 10,
      mainRouteParts = 10,
      gasLimit,
    } = params;

    // 构建查询参数
    const queryParams = new URLSearchParams({
      src,
      dst,
      amount,
      slippage: slippage.toString(),
      fee: fee.toString(),
      complexityLevel: complexityLevel.toString(),
      parts: parts.toString(),
      mainRouteParts: mainRouteParts.toString(),
    });

    if (from) queryParams.append('from', from);
    if (protocols) queryParams.append('protocols', protocols);
    if (gasPrice) queryParams.append('gasPrice', gasPrice);
    if (gasLimit) queryParams.append('gasLimit', gasLimit.toString());

    const url = `${INCH_API_BASE}/swap/v6.0/${CHAIN_ID}/quote?${queryParams.toString()}`;

    // Only log in development mode if explicitly debugging
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_1INCH === 'true') {
      console.log('🔄 Fetching 1inch quote:', {
        src,
        dst,
        amount,
        url: url.substring(0, 100) + '...',
      });
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Silently fail for testnet requests
      return null;
    }

    const data: InchSwapQuote = await response.json();

    // Only log success in debug mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_1INCH === 'true') {
      console.log('✅ 1inch quote received:', {
        dstAmount: data.dstAmount,
        srcAmount: data.srcAmount,
        protocols: data.protocols.length,
        estimatedGas: data.estimatedGas,
      });
    }

    return data;
  } catch (error) {
    // Silently fail - this is expected for testnets
    // No console.error to avoid cluttering the console
    return null;
  }
}

/**
 * 获取交易对的最优报价
 */
export async function getBestQuoteForPair(
  fromToken: string,
  toToken: string,
  amountUSD: number,
  fromDecimals: number = 6
): Promise<{
  rate: number;
  protocols: string[];
  estimatedGas: string;
  path: string;
} | null> {
  try {
    // Check if chain is supported
    if (!SUPPORTED_CHAIN_IDS.includes(CHAIN_ID)) {
      return null;
    }

    // 转换为wei格式
    const amount = (amountUSD * Math.pow(10, fromDecimals)).toString();

    const fromAddress = TOKEN_ADDRESSES[fromToken];
    const toAddress = TOKEN_ADDRESSES[toToken];

    if (!fromAddress || !toAddress) {
      // Silently fail if token addresses not found
      return null;
    }

    const quote = await get1inchQuote({
      src: fromAddress,
      dst: toAddress,
      amount: amount,
      slippage: 1,
      complexityLevel: 2,
    });

    if (!quote) {
      return null;
    }

    // 计算汇率
    const dstAmount = parseFloat(quote.dstAmount) / Math.pow(10, fromDecimals);
    const srcAmount = parseFloat(quote.srcAmount) / Math.pow(10, fromDecimals);
    const rate = dstAmount / srcAmount;

    // 提取协议名称
    const protocols = quote.protocols.map(p => p.name);
    const uniqueProtocols = [...new Set(protocols)];

    // 生成路径描述
    const path = uniqueProtocols.slice(0, 3).join(' → ') + (uniqueProtocols.length > 3 ? ' (+more)' : '');

    return {
      rate,
      protocols: uniqueProtocols,
      estimatedGas: quote.estimatedGas,
      path,
    };
  } catch (error) {
    // Silently fail
    return null;
  }
}

/**
 * 获取支持的协议列表
 */
export async function getSupportedProtocols(): Promise<string[] | null> {
  try {
    // Check if chain is supported
    if (!SUPPORTED_CHAIN_IDS.includes(CHAIN_ID)) {
      return null;
    }

    const url = `${INCH_API_BASE}/swap/v6.0/${CHAIN_ID}/liquidity-sources`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.protocols || [];
  } catch (error) {
    return null;
  }
}

/**
 * 检查token是否支持
 */
export async function checkTokenSupport(tokenAddress: string): Promise<boolean> {
  try {
    // Check if chain is supported
    if (!SUPPORTED_CHAIN_IDS.includes(CHAIN_ID)) {
      return false;
    }

    const url = `${INCH_API_BASE}/swap/v6.0/${CHAIN_ID}/tokens`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.tokens && tokenAddress.toLowerCase() in data.tokens;
  } catch (error) {
    return false;
  }
}

/**
 * 获取1inch推荐的Settlement Path
 */
export async function get1inchSettlementPath(
  pair: string,
  amountUSD: number,
  confidence: number = 0.9
): Promise<{
  name: string;
  protocol: string;
  estimated_cost_pct: number;
  settlement_time_seconds: number;
  reliability: number;
  risk_level: 'low' | 'medium' | 'high' | 'very_low';
  reason: string;
  alternative_paths: string[];
  gas_estimate: string;
  is_realtime: boolean;
} | null> {
  try {
    // Check if chain is supported
    if (!SUPPORTED_CHAIN_IDS.includes(CHAIN_ID)) {
      // Return null for testnets - will fallback to AI optimizer
      return null;
    }

    const [fromToken, toToken] = pair.split('/');

    const quote = await getBestQuoteForPair(fromToken, toToken, amountUSD);

    if (!quote) {
      return null;
    }

    // 估算成本（基于Gas）
    const gasEstimate = parseInt(quote.estimatedGas);
    const estimatedCostPct = Math.min((gasEstimate / 1000000) * 0.1, 1.0); // 简化计算

    // 主协议
    const mainProtocol = quote.protocols[0] || '1inch Router';

    // 根据协议数量判断复杂度和时间
    const settlementTime = quote.protocols.length > 3 ? 25 : 15;

    // 可靠性基于1inch的聚合能力
    const reliability = 0.99;

    return {
      name: `1inch Aggregator via ${mainProtocol}`,
      protocol: '1inch',
      estimated_cost_pct: estimatedCostPct,
      settlement_time_seconds: settlementTime,
      reliability,
      risk_level: gasEstimate > 500000 ? 'medium' : 'low',
      reason: `Best route found across ${quote.protocols.length} protocols: ${quote.path}`,
      alternative_paths: quote.protocols.slice(1, 4),
      gas_estimate: quote.estimatedGas,
      is_realtime: true,
    };
  } catch (error) {
    // Silently fail - fallback to AI optimizer will be used
    return null;
  }
}
