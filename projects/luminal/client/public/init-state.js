// 自动初始化池子状态缓存 - 从链上读取实际的池子储备量
(async function() {
  const CACHE_KEY = 'luminal.pool-state-cache.v1';

  // 从 meta 标签读取部署配置
  const commitment = document.querySelector('meta[name="initial-commitment"]')?.content;
  const vaultAddress = document.querySelector('meta[name="vault-address"]')?.content;
  const wethAddress = document.querySelector('meta[name="weth-address"]')?.content;
  const usdcAddress = document.querySelector('meta[name="usdc-address"]')?.content;
  const rpcUrl = document.querySelector('meta[name="rpc-url"]')?.content;

  if (!commitment || !vaultAddress || !wethAddress || !usdcAddress || !rpcUrl) {
    console.warn('[Init] Missing deployment config, skipping auto-cache');
    return;
  }

  try {
    // 检查缓存是否已存在
    const existing = localStorage.getItem(CACHE_KEY);
    if (existing) {
      console.log('[Init] Cache already exists');
      return;
    }

    // 从链上读取 Vault 的 WETH 和 USDC 余额
    // 读取 WETH 余额
    const wethResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: wethAddress,
          data: '0x70a08231' + vaultAddress.slice(2).padStart(64, '0') // balanceOf(address)
        }, 'latest']
      })
    });
    const wethData = await wethResponse.json();
    const reserve0 = BigInt(wethData.result || '0').toString();

    // 读取 USDC 余额
    const usdcResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: usdcAddress,
          data: '0x70a08231' + vaultAddress.slice(2).padStart(64, '0') // balanceOf(address)
        }, 'latest']
      })
    });
    const usdcData = await usdcResponse.json();
    const reserve1 = BigInt(usdcData.result || '0').toString();

    const INITIAL_STATE = {
      reserve0: reserve0,
      reserve1: reserve1,
      nonce: '0',
      feeBps: '0'
    };

    const cache = {};
    cache[commitment.toLowerCase()] = INITIAL_STATE;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('[Init] Pool state cached from chain:', {
      commitment,
      reserve0,
      reserve1
    });
  } catch (e) {
    console.error('[Init] Failed to cache state from chain:', e);
  }
})();
