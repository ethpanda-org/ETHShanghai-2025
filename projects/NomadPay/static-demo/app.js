// 初始化 Mermaid
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' });

// 提供的流程图（保持原意，适当转义）
const chart = `flowchart TD
     A[User deposits USDC/USDT via App] --> RiskProfile[Risk Assessment]
     
     RiskProfile --> Strategy[Fund Allocation Strategy]
     A --> Buffer[Buffer Layer for Instant Payments<br>Hold 5-20% of Funds]
     A --> RiskDisclosure[Risk Disclosure]
     
     Buffer --> D[Register/Generate Fiat24 U-Card NFT Account + Visa Virtual Card]
     
     %% Three parallel strategies
     Strategy --> Conservative[Conservative Strategy<br>Aave/Compound<br>Low-risk Stablecoin Pool<br>APY 3-8%]
     Strategy --> Balanced[Balanced Strategy<br>Yearn<br>Medium-risk Strategy Pool<br>APY 6-12%]
     Strategy --> Aggressive[Aggressive Strategy<br>AI Optimized High Yield Pool<br>High-risk Strategy<br>APY 8-20%+]
     
     %% Risk disclosure connects to all strategies
     RiskDisclosure -.-> Conservative
     RiskDisclosure -.-> Balanced
     RiskDisclosure -.-> Aggressive
     
     %% Strategy results converge
     Conservative --> Yield[Yield Accumulation]
     Balanced --> Yield
     Aggressive --> Yield
     
     %% Payment process
     D --> PaymentDecision{Payment Trigger}
     PaymentDecision -->|Small Payment ≤50 USD| SmallPayment[Direct Payment from Buffer<br>Instant Confirmation]
     PaymentDecision -->|Large Payment >50 USD| LargePayment[Automatically Withdraw from DeFi Pool]
     
     SmallPayment --> Spend[Offline Payments<br>AEON Pay QR Code or U-Card/ATM Instant Fiat Spending]
     LargePayment --> Spend
     
     Spend --> Rebalance[Rebalance Funds<br>Auto-replenish Buffer Layer when Funds Run Low]
     Rebalance --> Buffer
     
     %% AI monitoring and strategy updates
     Yield --> AIMonitor[AI Monitoring APY Fluctuations and Risks<br>Suggest Switching Pools or Adjusting Strategy]
     AIMonitor --> StrategyUpdate[Strategy Update Suggestion<br>Execute after User Confirmation]
     StrategyUpdate --> Conservative
     StrategyUpdate --> Balanced
     StrategyUpdate --> Aggressive`;

async function renderChart() {
  const el = document.getElementById('flowchart');
  try {
    const { svg } = await mermaid.render('nomadpay-flow', chart);
    el.innerHTML = svg;
  } catch (e) {
    el.textContent = 'Mermaid 渲染失败：' + e.message;
  }
}

// 简易资金模型（仅用于演示）
const state = {
  deposited: 0,
  bufferPercent: 10,
  bufferFunds: 0,
  strategyFunds: 0,
  riskProfile: 'balanced',
  cardGenerated: false,
  apy: { conservative: 0.05, balanced: 0.09, aggressive: 0.15 }, // 示例 APY
};

function formatUSD(n) {
  return '$' + (Number(n).toFixed(2));
}

function updateStatus() {
  const ul = document.getElementById('fundStatus');
  ul.innerHTML = '';
  const items = [
    `总存入资金: ${formatUSD(state.deposited)}`,
    `缓冲层比例: ${state.bufferPercent}%`,
    `缓冲层资金: ${formatUSD(state.bufferFunds)}`,
    `策略池资金: ${formatUSD(state.strategyFunds)}`,
    `风险画像: ${state.riskProfile}`,
    `U-Card/虚拟卡: ${state.cardGenerated ? '已生成' : '未生成'}`,
    `策略 APY（示例）: 保守 ${Math.round(state.apy.conservative*100)}% / 均衡 ${Math.round(state.apy.balanced*100)}% / 进取 ${Math.round(state.apy.aggressive*100)}%`,
  ];
  items.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

function simulateAIMetrics() {
  // 简单随机波动，模拟 APY 波动与风险提示
  const drift = () => (Math.random() - 0.5) * 0.02; // +/- 2%
  state.apy.conservative = Math.max(0.03, Math.min(0.08, state.apy.conservative + drift()));
  state.apy.balanced = Math.max(0.06, Math.min(0.12, state.apy.balanced + drift()));
  state.apy.aggressive = Math.max(0.08, Math.min(0.22, state.apy.aggressive + drift()));
  const aiDiv = document.getElementById('aiMetrics');
  aiDiv.innerHTML = `当前 APY 波动监测：<br>
    保守 ${Math.round(state.apy.conservative*100)}% ｜ 均衡 ${Math.round(state.apy.balanced*100)}% ｜ 进取 ${Math.round(state.apy.aggressive*100)}%<br>
    建议：当缓冲层资金偏低或均衡策略 APY 显著下降时，考虑增加保守策略占比，或在进取策略 APY 高于 18% 时进行增配。`;
}

function deposit() {
  const amount = Number(document.getElementById('depositAmount').value || 0);
  const percent = Number(document.getElementById('bufferPercent').value || 10);
  const profile = document.getElementById('riskProfile').value;
  state.riskProfile = profile;
  state.deposited += amount;
  state.bufferPercent = Math.min(20, Math.max(5, percent));
  const targetBuffer = state.deposited * state.bufferPercent / 100;
  // 将新增资金按比例流入缓冲与策略池
  const deltaBuffer = amount * state.bufferPercent / 100;
  const deltaStrategy = amount - deltaBuffer;
  state.bufferFunds += deltaBuffer;
  state.strategyFunds += deltaStrategy;
  document.getElementById('depositResult').textContent = `已存入 ${formatUSD(amount)}，缓冲层增加 ${formatUSD(deltaBuffer)}，策略池增加 ${formatUSD(deltaStrategy)}。目标缓冲 ${formatUSD(targetBuffer)}。`;
  updateStatus();
}

function generateCard() {
  state.cardGenerated = true;
  document.getElementById('cardStatus').textContent = 'U-Card NFT 账户与 Visa 虚拟卡已生成（演示）。';
  updateStatus();
}

function pay() {
  const amount = Number(document.getElementById('paymentAmount').value || 0);
  let message = '';
  if (amount <= 50) {
    // 小额直接从缓冲层支付
    if (state.bufferFunds >= amount) {
      state.bufferFunds -= amount;
      message = `小额支付（≤$50）已从缓冲层直接支付：${formatUSD(amount)}，即时确认。`;
    } else {
      message = `缓冲层资金不足以直接支付 ${formatUSD(amount)}，请执行再平衡或走策略池取款。`;
    }
  } else {
    // 大额自动从策略池取款
    if (state.strategyFunds >= amount) {
      state.strategyFunds -= amount;
      message = `大额支付（>$50）已自动从策略池取款：${formatUSD(amount)}。`;
    } else {
      message = `策略池资金不足以支付 ${formatUSD(amount)}，请补充存款或降低支付金额。`;
    }
  }
  document.getElementById('paymentResult').textContent = message;
  updateStatus();
}

function rebalance() {
  const targetBuffer = state.deposited * state.bufferPercent / 100;
  let moved = 0;
  if (state.bufferFunds < targetBuffer) {
    // 从策略池回补至缓冲层
    const need = targetBuffer - state.bufferFunds;
    const move = Math.min(need, state.strategyFunds);
    state.strategyFunds -= move;
    state.bufferFunds += move;
    moved = move;
  }
  const msg = moved > 0
    ? `已自动回补缓冲层 ${formatUSD(moved)}，当前缓冲 ${formatUSD(state.bufferFunds)}。`
    : `缓冲层已满足目标或策略池不足，未进行回补。`;
  document.getElementById('rebalanceResult').textContent = msg;
  updateStatus();
}

function applyStrategyUpdate() {
  // 简化策略更新：根据 APY 建议在用户确认后调整缓冲比例（演示）
  let suggestion = '';
  if (state.apy.aggressive > 0.18) {
    // 进取策略较高，降低缓冲比例以增加潜在收益
    const old = state.bufferPercent;
    state.bufferPercent = Math.max(5, old - 2);
    suggestion = `进取策略 APY 较高（>${Math.round(0.18*100)}%），已建议降低缓冲比例从 ${old}% 到 ${state.bufferPercent}%。`;
  } else if (state.apy.balanced < 0.08) {
    // 均衡策略走低，提高缓冲
    const old = state.bufferPercent;
    state.bufferPercent = Math.min(20, old + 2);
    suggestion = `均衡策略 APY 走低（<8%），已建议提高缓冲比例从 ${old}% 到 ${state.bufferPercent}% 以降低风险。`;
  } else {
    suggestion = '当前策略稳定，无需调整。';
  }
  document.getElementById('strategyUpdateResult').textContent = suggestion;
  updateStatus();
}

function bindEvents() {
  document.getElementById('btnDeposit').addEventListener('click', deposit);
  document.getElementById('btnGenerateCard').addEventListener('click', generateCard);
  document.getElementById('btnPay').addEventListener('click', pay);
  document.getElementById('btnRebalance').addEventListener('click', rebalance);
  document.getElementById('btnStrategyUpdate').addEventListener('click', applyStrategyUpdate);
}

(async function init() {
  await renderChart();
  bindEvents();
  simulateAIMetrics();
  updateStatus();
  // 周期性刷新 AI 指标，模拟监控
  setInterval(() => { simulateAIMetrics(); }, 3000);
})();