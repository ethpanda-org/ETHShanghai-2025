// 页面切换工具
const screens = ['home','risk','recommend','invest','sign','success','me'];
function setTabActive(tab) {
  const tabs = ['home','finance','me'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('active', t === tab);
  });
}
function tabByScreen(screen) {
  if (screen === 'home') return 'home';
  if (['risk','recommend','invest','sign','success'].includes(screen)) return 'finance';
  if (screen === 'me') return 'me';
  return 'home';
}
function show(screen) {
  screens.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('active', id === screen);
  });
  setTabActive(tabByScreen(screen));
}

// WalletConnect / 以太坊钱包连接（无项目ID时优先使用浏览器钱包）
let connectedAddress = null;

// 总资产与单位切换状态
const state = {
  unit: 'USD',
  balances: { eth: 0, usdc: 2000, usdt: 0 },
  prices: { USD_CNY: 7.10, ETH_USD: 3500, USDT_USD: 1 }, // 演示用静态价格
  portfolio: { yieldUSD: 0 }
};

async function initWallet() {
  const btn = document.getElementById('wallet-connect-btn');
  const addrEl = document.getElementById('wallet-address');
  const balEl = document.getElementById('wallet-balance');
  btn.addEventListener('click', async () => {
    if (window.ethereum && window.ethereum.request) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length) {
          connectedAddress = accounts[0];
          const short = `${connectedAddress.slice(0,4)}...${connectedAddress.slice(-4)}`;
          addrEl.textContent = short;
          await loadBalances(connectedAddress);
        }
      } catch (e) {
        addrEl.textContent = 'Connection failed';
        const ethEl = document.getElementById('bal-eth'); if (ethEl) ethEl.textContent = 'ETH: —';
        const usdcEl = document.getElementById('bal-usdc'); if (usdcEl) usdcEl.textContent = 'USDC: —';
        const usdtEl = document.getElementById('bal-usdt'); if (usdtEl) usdtEl.textContent = 'USDT: —';
      }
    } else {
      // 无浏览器钱包时，提示使用 WalletConnect（演示）
      const qr = document.getElementById('qr-overlay');
      qr.classList.remove('hidden');
      qr.querySelector('.overlay-title').textContent = 'WalletConnect Notice (demo)';
      qr.querySelector('.qr-box').textContent = 'Please use a WalletConnect-compatible wallet to scan and connect (no project ID configured)';
    }
  });

  // 自动检测已连接账户
  if (window.ethereum && window.ethereum.request) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length) {
        connectedAddress = accounts[0];
        const short = `${connectedAddress.slice(0,4)}...${connectedAddress.slice(-4)}`;
        addrEl.textContent = short;
        await loadBalances(connectedAddress);
      }
    } catch {}

    // 监听账户与网络变化
    window.ethereum.on && window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts && accounts.length) {
        connectedAddress = accounts[0];
        const short = `${connectedAddress.slice(0,4)}...${connectedAddress.slice(-4)}`;
        addrEl.textContent = short;
        await loadBalances(connectedAddress);
      } else {
        connectedAddress = null;
        addrEl.textContent = 'Not connected';
        const ethEl = document.getElementById('bal-eth'); if (ethEl) ethEl.textContent = 'ETH: —';
        const usdcEl = document.getElementById('bal-usdc'); if (usdcEl) usdcEl.textContent = 'USDC: —';
        const usdtEl = document.getElementById('bal-usdt'); if (usdtEl) usdtEl.textContent = 'USDT: —';
      }
    });
  }
}

function formatTokenAmountHex(hex, decimals, displayDecimals = 4) {
  try {
    const bi = BigInt(hex);
    const scaleIn = 10n ** BigInt(decimals);
    const scaleOut = 10n ** BigInt(displayDecimals);
    const scaled = (bi * scaleOut) / scaleIn;
    const intPart = scaled / scaleOut;
    const fracPart = scaled % scaleOut;
    return `${intPart.toString()}.${fracPart.toString().padStart(displayDecimals, '0')}`;
  } catch {
    return `0.${'0'.repeat(displayDecimals)}`;
  }
}

async function loadEthBalance(address) {
  const el = document.getElementById('bal-eth');
  el.textContent = 'ETH: Loading…';
  try {
    const balanceHex = await window.ethereum.request({ method: 'eth_getBalance', params: [address, 'latest'] });
    const formatted = formatTokenAmountHex(balanceHex, 18, 4);
    el.textContent = `ETH: ${formatted}`;
    state.balances.eth = parseFloat(formatted);
  } catch (e) {
    el.textContent = 'ETH: 0.0000';
    state.balances.eth = 0;
  }
}

async function loadTokenBalance(address, tokenAddress, decimals, elId, symbol) {
  const el = document.getElementById(elId);
  el.textContent = `${symbol}: Loading…`;
  try {
    const data = '0x70a08231' + address.replace('0x','').padStart(64, '0');
    const res = await window.ethereum.request({ method: 'eth_call', params: [{ to: tokenAddress, data }, 'latest'] });
    const formatted = formatTokenAmountHex(res, decimals, 4);
    el.textContent = `${symbol}: ${formatted}`;
    if (symbol === 'USDC') state.balances.usdc = parseFloat(formatted);
    if (symbol === 'USDT') state.balances.usdt = parseFloat(formatted);
  } catch (e) {
    el.textContent = `${symbol}: 0.0000`;
    if (symbol === 'USDC') state.balances.usdc = 0;
    if (symbol === 'USDT') state.balances.usdt = 0;
  }
}

async function loadBalances(address) {
  await loadEthBalance(address);
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48';
  const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  await loadTokenBalance(address, USDC, 6, 'bal-usdc', 'USDC');
  await loadTokenBalance(address, USDT, 6, 'bal-usdt', 'USDT');
  renderPortfolio();
}

// 总资产计算与单位切换
function convertUSD(valueUSD, unit) {
  switch (unit) {
    case 'CNY': return valueUSD * state.prices.USD_CNY;
    case 'USD': return valueUSD;
    case 'USDT': return valueUSD * state.prices.USDT_USD;
    case 'ETH': return valueUSD / state.prices.ETH_USD;
    default: return valueUSD;
  }
}
function unitLabel(u) { return u === 'CNY' ? 'CNY' : u === 'USD' ? 'USD' : u === 'USDT' ? 'USDT' : 'ETH'; }
function prefix(u) { return u === 'CNY' ? '¥' : u === 'USD' ? '$' : u === 'USDT' ? 'USDT ' : 'ETH '; }
function decimals(u) { return u === 'ETH' ? 4 : 2; }
function formatByUnit(valueUSD, unit) {
  const v = convertUSD(valueUSD, unit);
  return `${prefix(unit)}${v.toFixed(decimals(unit))}`;
}
function computePortfolioUSD() {
  const earnUSD = (state.balances.usdc || 0) + (state.balances.usdt || 0);
  const mainstreamUSD = (state.balances.eth || 0) * state.prices.ETH_USD;
  const yieldUSD = state.portfolio.yieldUSD || 0;
  const totalUSD = earnUSD + mainstreamUSD + yieldUSD;
  const yIncomeUSD = earnUSD * 0.05 / 365 + yieldUSD * 0.10 / 365; // 演示收益
  return { earnUSD, mainstreamUSD, yieldUSD, totalUSD, yIncomeUSD };
}
function renderPortfolio() {
  const { earnUSD, mainstreamUSD, yieldUSD, totalUSD, yIncomeUSD } = computePortfolioUSD();
  const u = state.unit;
  const totalEl = document.getElementById('portfolio-total');
  const incomeEl = document.getElementById('portfolio-income');
  const earnEl = document.getElementById('asset-earn');
  const mainEl = document.getElementById('asset-mainstream');
  const yieldEl = document.getElementById('asset-yield');
  const seg = document.getElementById('unit-seg');
  const uLabel = document.getElementById('unit-label');
  if (!totalEl) return;
  totalEl.textContent = formatByUnit(totalUSD, u);
  incomeEl.textContent = formatByUnit(yIncomeUSD, u);
  earnEl.textContent = formatByUnit(earnUSD, u);
  mainEl.textContent = formatByUnit(mainstreamUSD, u);
  yieldEl.textContent = formatByUnit(yieldUSD, u);
  uLabel.textContent = unitLabel(u);
  seg && seg.querySelectorAll('.seg').forEach(b => {
    b.classList.toggle('active', b.dataset.unit === u);
  });
}
function initPortfolioUI() {
  const seg = document.getElementById('unit-seg');
  if (!seg) return;
  seg.querySelectorAll('.seg').forEach(btn => {
    btn.addEventListener('click', () => {
      state.unit = btn.dataset.unit;
      renderPortfolio();
    });
  });
}

// 支付相关（Fiat24 与二维码）
function initPayments() {
  const qr = document.getElementById('qr-overlay');
  document.getElementById('btnFiat24').addEventListener('click', () => {
    qr.classList.remove('hidden');
    qr.querySelector('.overlay-title').textContent = 'Fiat24 Payment (demo)';
    qr.querySelector('.qr-box').textContent = 'Fiat24 link QR Code';
  });
  document.getElementById('btnQRPay').addEventListener('click', () => {
    qr.classList.remove('hidden');
    qr.querySelector('.overlay-title').textContent = 'QR Payment (demo)';
    qr.querySelector('.qr-box').textContent = 'Payment QR Code';
  });
  document.getElementById('btnCloseQR').addEventListener('click', () => qr.classList.add('hidden'));
}

// 风险评估提交
function initRisk() {
  const startBtn = document.getElementById('btnStartRisk');
  startBtn && startBtn.addEventListener('click', () => show('risk'));
  const submitBtn = document.getElementById('btnRiskSubmit');
  submitBtn && submitBtn.addEventListener('click', () => {
    const form = document.getElementById('risk-form');
    const values = ['r1','r2','r3','r4','r5','r6','r7','r8'].map(n => new FormData(form).get(n));
    const score = { low: 0, medium: 0, high: 0 };
    values.forEach(v => { if (score[v] !== undefined) score[v]++; });
    let profile = 'medium';
    profile = ['low','medium','high'].reduce((acc, key) => (score[key] > score[acc] ? key : acc), profile);
    buildDefiList(profile);
    show('recommend');
  });
}

// DeFi 推荐（示例 APY）
const protocols = [
  { name: 'AAVE v3 (ETH) - Supply USDC', apy: 6.7 },
  { name: 'Compound v3 (ETH) - Supply USDC', apy: 6.1 },
  { name: 'Morpho Blue (ETH) - Supply USDC', apy: 5.9 },
  { name: 'Fluid (ETH) - USDC Deposit', apy: 4.8 },
];

function buildDefiList(profile) {
  const list = document.getElementById('defi-list');
  list.innerHTML = '';
  const label = profile === 'low'
    ? 'Low risk: prioritize staking and lending blue-chip protocols'
    : profile === 'medium'
    ? 'Medium risk: yield farming; mind IL and reward volatility'
    : 'High risk: DCA into major crypto; price volatility is larger';
  const sorted = [...protocols].sort((a, b) => b.apy - a.apy);
  sorted.forEach(p => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div><div class=\"name\">${p.name}</div><div class=\"label\">Profile Fit: ${label}</div></div><div class=\"apy\">${p.apy.toFixed(1)}% APY</div>`;
    list.appendChild(div);
  });
}

// 投入与签名模拟（EVM）
function initInvestFlow() {
  document.getElementById('btnChooseInvest').addEventListener('click', () => show('invest'));
  document.getElementById('btnConfirmInvest').addEventListener('click', () => show('sign'));
  document.getElementById('btnCancelSign').addEventListener('click', () => show('invest'));
  document.getElementById('btnDoSign').addEventListener('click', async () => {
    // 如果已连接钱包，可模拟签名
    if (window.ethereum && connectedAddress) {
      try {
        const message = 'NomadPay Investment Confirmation';
        await window.ethereum.request({ method: 'personal_sign', params: [message, connectedAddress] });
      } catch (e) {
        // 忽略签名失败，继续演示流程
      }
    }
    show('success');
  });
  document.getElementById('btnBackHome').addEventListener('click', () => show('home'));
}

function renderWalletFallback() {
  const ethEl = document.getElementById('bal-eth'); if (ethEl) ethEl.textContent = 'ETH: 0.0000';
  const usdcEl = document.getElementById('bal-usdc'); if (usdcEl) usdcEl.textContent = 'USDC: 2000.0000';
  const usdtEl = document.getElementById('bal-usdt'); if (usdtEl) usdtEl.textContent = 'USDT: 0.0000';
}
(function init() {
  initWallet();
  renderWalletFallback();
  initPortfolioUI();
  renderPortfolio();
  initPayments();
  initRisk();
  initInvestFlow();
  // 底部导航
  const homeTab = document.getElementById('tab-home');
  const financeTab = document.getElementById('tab-finance');
  const meTab = document.getElementById('tab-me');
  homeTab && homeTab.addEventListener('click', () => show('home'));
  financeTab && financeTab.addEventListener('click', () => show('risk'));
  meTab && meTab.addEventListener('click', () => show('me'));
})();