## 已知问题（P0/P1 之外暂不修复）

- 前端 Wallet 连接按钮：默认可见；如需隐藏可临时注释按钮。后续若切换至 wagmi/rainbowkit，不影响现有功能。
  - 影响：不影响当前 Demo（Exec 面板走后端 API）。
  - 建议：P1 可按需集成 wagmi/rainbowkit 做更完善的钱包体验。

- 详情页 Crash：`mockVault is not defined`（已修复）
  - 修复：替换残留 `mockVault.*` 为 `vault.*`，统一数据源。
  - 影响：已消除该报错；若出现其他 Hydration 警告，按下条处理。

- SSR Hydration mismatch（Next.js 提示）
  - 原因：客户端/服务端渲染分支、随机/时间变量或外部数据未快照
  - 影响：首次渲染警告与重渲染
  - 建议：移除随机/Date.now()；对外部数据 SSR 前注入快照或改为 CSR

- 事件监听（WS）依赖外网可用性与 SDK 行为
  - 若受限，则以 ack 驱动回写（服务端）仍能保证闭环
- Hyper Testnet 流动性稀薄
  - 现状：`ETH` 合约在测试网缺少对手单，`market_close` 或 reduce-only Ioc 可能报错（价格带/无成交）
  - 影响：实测已成功开仓 0.01 ETH，多次尝试平仓时出现“Price too far from oracle”/“could not match”提示，需等待流动性或改用挂单方式
  - 建议：演示前预热订单簿或准备手动挂单脚本，必要时联系评委说明测试网局限
