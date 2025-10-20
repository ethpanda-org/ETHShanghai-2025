// 页面切换工具
const screens = ['home','risk','recommend','invest','sign','success'];
function show(screen) {
  screens.forEach(id => {
    document.getElementById(`screen-${id}`).classList.toggle('active', id === screen);
  });
}

// WalletConnect / 以太坊钱包连接（无项目ID时优先使用浏览器钱包）
let connectedAddress = null;

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
          await loadEthBalance(connectedAddress);
        }
      } catch (e) {
        addrEl.textContent = '连接失败';
        balEl.textContent = '—';
      }
    } else {
      // 无浏览器钱包时，提示使用 WalletConnect（演示）
      const qr = document.getElementById('qr-overlay');
      qr.classList.remove('hidden');
      qr.querySelector('.overlay-title').textContent = 'WalletConnect 提示（演示）';
      qr.querySelector('.qr-box').textContent = '请使用支持 WalletConnect 的钱包扫码连接（未配置项目ID）';
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
        await loadEthBalance(connectedAddress);
      }
    } catch {}

    // 监听账户与网络变化
    window.ethereum.on && window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts && accounts.length) {
        connectedAddress = accounts[0];
        const short = `${connectedAddress.slice(0,4)}...${connectedAddress.slice(-4)}`;
        addrEl.textContent = short;
        await loadEthBalance(connectedAddress);
      } else {
        connectedAddress = null;
        addrEl.textContent = '未连接';
        balEl.textContent = '—';
      }
    });
  }
}

async function loadEthBalance(address) {
  const el = document.getElementById('wallet-balance');
  el.textContent = '加载中…';
  try {
    const balanceHex = await window.ethereum.request({ method: 'eth_getBalance', params: [address, 'latest'] });
    const wei = BigInt(balanceHex);
    // 将 wei 转为 ETH（简化展示）
    const eth = Number(wei) / 1e18;
    el.textContent = `${eth.toFixed(4)} ETH`;
  } catch (e) {
    el.textContent = '0.0000 ETH（演示）';
  }
}

// 支付相关（Fiat24 与二维码）
function initPayments() {
  const qr = document.getElementById('qr-overlay');
  document.getElementById('btnFiat24').addEventListener('click', () => {
    qr.classList.remove('hidden');
    qr.querySelector('.overlay-title').textContent = 'Fiat24 支付（演示）';
    qr.querySelector('.qr-box').textContent = 'Fiat24 链接二维码';
  });
  document.getElementById('btnQRPay').addEventListener('click', () => {
    qr.classList.remove('hidden');
    qr.querySelector('.overlay-title').textContent = '二维码支付（演示）';
    qr.querySelector('.qr-box').textContent = '付款二维码';
  });
  document.getElementById('btnCloseQR').addEventListener('click', () => qr.classList.add('hidden'));
}

// 风险评估提交
function initRisk() {
  document.getElementById('btnStartRisk').addEventListener('click', () => show('risk'));
  document.getElementById('btnRiskSubmit').addEventListener('click', () => {
    const form = document.getElementById('risk-form');
    const values = ['q1','q2','q3','q4','q5','q6'].map(n => new FormData(form).get(n));
    const score = { conservative: 0, balanced: 0, aggressive: 0 };
    values.forEach(v => { score[v]++; });
    let profile = 'balanced';
    if (score.conservative >= 3) profile = 'conservative';
    else if (score.aggressive >= 3) profile = 'aggressive';
    // 展示推荐
    buildDefiList(profile);
    show('recommend');
  });
}

// DeFi 推荐（示例 APY）
const protocols = [
  { name: 'Morpho Blue（ETH链）', apy: 6.7, url: 'https://app.morpho.org/' },
  { name: 'Fluid（ETH链）', apy: 6.0, url: 'https://fluid.finance/' },
  { name: 'AAVE v3（ETH链）', apy: 5.2, url: 'https://app.aave.com/' },
  { name: 'Compound v3（ETH链）', apy: 4.8, url: 'https://app.compound.finance/' }
];

function buildDefiList(profile) {
  const list = document.getElementById('defi-list');
  list.innerHTML = '';
  // 按 APY 从高到低排序
  const sorted = [...protocols].sort((a, b) => b.apy - a.apy);
  sorted.forEach(p => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div><div class="name">${p.name}</div><div class="label">适配画像：${profile === 'conservative' ? '保守型优先选择成熟协议' : profile === 'balanced' ? '均衡型兼顾收益与风险' : '风险型追求更高收益'}</div></div><div class="apy">${p.apy.toFixed(1)}% APY</div>`;
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

(function init() {
  initWallet();
  initPayments();
  initRisk();
  initInvestFlow();
})();