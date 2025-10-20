# Foxhole AI (ETHShanghai 2025）

Foxhole AI 是一个端到端的开源原型，面向交易者与研究员，实时监控影响力社交账号，提供关键词检测、合约地址验证与基础风险审计，并实时推送结果，帮助用户更快识别潜在交易机会与风险。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库：包含完整代码与本 README（当前目录）
- [x] Demo 视频（≤ 3 分钟，中文）
- [x] 在线演示链接（如有）
- [ ] 合约部署信息（如有）（本项目当前不含链上合约）
- [x] 可选材料：Pitch Deck（不计分）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：Foxhole AI
- **一句话介绍**：实时监控影响力 Twitter 账号（CZ、Heyi、Elon Musk 等）的加密关键词，即时推送经过 AI 验证的合约地址，让交易者无需手动搜索，实现一键代币购买。
- **目标用户**：加密货币交易者（量化/手动）、链上狙击手、加密研究员、信息流机器人开发者。
- **核心问题与动机（Pain Points）**：
  - **通知延迟问题**：交易者错过关键意见领袖（KOL）的重要关键词提及，失去早期入场机会。
  - **手动猎寻合约地址**：耗时的合约地址查找过程导致错失交易，甚至遭遇诈骗项目与 Rug Pull。
  - **信息过载**：人工同时监控多个高影响力社交账号在规模化运作中根本不可能。
  - **速度劣势**：手动流程无法与毫秒级执行交易的自动化系统竞争。在加密货币世界，几秒钟就可能意味着盈利与亏损的差别。
- **解决方案（Solution）**：

  - **实时情报引擎**：先进的关键词检测算法 7×24 小时监控高影响力账号（CZ、Heyi、Elon Musk 等），零延迟响应。
  - Monitor 子系统持续抓取 Dex Screener token 数据（高频、去重、CSV 持久化）。

  - Extractor 子系统（BERT/TF-IDF/规则/正则/NER）对文本做关键词与实体抽取。

  - **验证合约地址**：AI 驱动的验证机制确保用户获得合法 CA，防范 Rug Pull 与诈骗项目。
  - **即时通知推送**：关键词检测的瞬间，交易机会直接通过 WebSocket 推送到用户设备。
  - **自动化优势**：采用与专业狙击机器人相同的高频交易技术，毫秒级响应。
  - **风险缓释**：内置安全功能在推荐前分析代币合法性与市场状况。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：暂缺（如需可在 `docs/` 或 Issue 补充）
- **关键模块**：
  - 前端（Frontend）：https://github.com/yidongw/foxhole-bot-frontend
  - 监控（Monitor）：`monitor/token_monitor.py`、`monitor/config.py`、`monitor/start.sh`
  - 社媒监听：`monitor/twitter_listener.py`、`twitter_ws_monitor.py`
  - 抽取（Extractor）：`extractor/bert_extractor.py`、`spacy_ner_extractor.py`、`tfidf_extractor.py`、`rule_based_extractor.py`、`regex_extractor.py`
  - 审计（Audit）：`audit/realtime_auditor.py`、`audit/audit_tokens.py`
  - 实时分发：`ws_server.py`、`ws_client.html`、`simple_client_test.py`
  - 辅助/示例：`realtime_audit_monitor.py`、`realtime_ca_detector.py`、`simple_test.py`、`test_connection.py`
- **依赖与技术栈**：
  - 语言与运行时：Python 3.10+（仓库内自带 `venv/` 示例，建议本地新建虚拟环境）
  - 监控依赖：见 `projects/foxhole/monitor/requirements.txt`
  - 抽取依赖：见 `projects/foxhole/extractor/requirements_extractor.txt`
  - 异步与网络：`asyncio`、`aiohttp`、`websockets`
  - NLP：`transformers`/`torch`（如使用 BERT）、`spaCy`、`scikit-learn`
  - 部署：Docker、docker-compose（可选）

### 3) 合约与部署 (Contracts & Deployment)

- 本项目当前不含链上合约，后续如扩展链上审计将补充该部分。

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：

  - Python 3.10+ 与 `pip`
  - 可选：Docker / docker-compose
  - 稳定的网络连接

- **环境变量样例（如启用社媒监听）**：

```bash
# .env（示例，按需创建并在相关脚本中读取）
TWITTER_BEARER_TOKEN=xxxxx
PROXY_URL= # 如需
```

- **安装依赖（分模块）**：

```bash
# 进入项目根目录
cd projects/foxhole

# Monitor 依赖
pip install -r monitor/requirements.txt

# Extractor 依赖（按需）
pip install -r extractor/requirements_extractor.txt
```

- **快速体验（仅运行行情监控）**：

```bash
cd projects/foxhole/monitor
python token_monitor.py
# 运行中会在同目录生成/追加 tokens_data.csv，并打印实时统计
```

- **启动 WebSocket 服务器并测试**：

```bash
cd projects/foxhole
python ws_server.py            # 启动 WS 服务器（默认端口见脚本）
python simple_client_test.py   # 以简单客户端连接并接收推送
# 或在浏览器打开 ws_client.html
```

- **运行抽取与审计（示例流程）**：

```bash
# 运行一个实时审计/监控示例（具体脚本按需选择）
python realtime_audit_monitor.py
python realtime_ca_detector.py
# 或运行 audit 与 extractor 目录下的独立脚本进行批处理
```

- **一键脚本（如有）**：

```bash
cd projects/foxhole/monitor
bash start.sh
```

- **Docker 运行（可选）**：

```bash
cd projects/foxhole
# 直接构建
docker build -t foxhole:latest .
# 或使用 compose
docker compose up -d
# 或使用仓库脚本
bash run_docker.sh
```

- **数据与样例**：

  - 数据目录：`projects/foxhole/data/`
    - 示例推文：`user_tweets_*.json`
    - 示例数据库：`meme_coins.db`
    - 其他：`ws.json`、`json_tree.md`

- **在线 Demo（如有）**：待补充
- **账号与测试说明（如需要）**：待补充

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：https://drive.google.com/drive/folders/1F8KGB4kgC0MV6KLvVgxTB3NARpgsb1IL?usp=sharing
- **关键用例步骤**：
  - 用例 1：启动 Monitor，实时监控影响力 Twitter 账号（CZ、Heyi、Elon Musk 等），检测加密关键词提及。
  - 用例 2：运行 Extractor 与 CA Detector，对推文/消息做关键词抽取与合约地址验证，过滤诈骗项目与 Rug Pull 风险。
  - 用例 3：运行 Audit，聚合潜在交易机会与风险信号，通过 WebSocket 即时推送到客户端，支持一键查看与购买。

### 6) 可验证边界 (Verifiable Scope)

- 本仓库包含用于复现的核心代码与脚本：
  - 可验证：Monitor 抓取与去重、Extractor 多策略抽取（关键词检测、合约地址提取）、WS 服务端与客户端、基础审计示例、合约地址验证。
  - 需自备：第三方 API Key（如 Twitter Bearer Token）。未提供的密钥相关功能需用户本地配置后使用。
  - 暂不公开：无。

### 7) 路线图与影响 (Roadmap & Impact)

- **1-3 周**：
  - 优化关键词检测算法，增加更多影响力账号监控。
  - 增强合约地址验证机制（流动性检查、持有者分析、蜜罐检测）。
  - 完善实时推送与告警策略，支持多渠道分发（TG/Discord）。
- **1-3 个月**：
  - 接入链上数据源（Etherscan/DexScreener API），实现全面的代币安全评分系统。
  - 推出前端仪表盘与移动端告警机器人（TG/Discord/微信）。
  - 开发一键交易集成（DEX 聚合器对接，如 1inch/Uniswap）。
  - 引入向量数据库与长期记忆，支持历史模式识别与智能推荐。
- **对以太坊生态的价值**：
  - 降低普通交易者的信息不对称，提供机构级的实时监控与狙击能力。
  - 提升链上交易安全性，减少诈骗项目与 Rug Pull 造成的资金损失。
  - 为开源社区提供可复用的社交情报采集、实时分发与风控基础设施。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：foxhole ai
- **成员与分工**：Alan 负责推特监控前端跟交易，Neo 负责 ai 关键词提取
- **联系方式（Email/TG/X）**：alan_ywang
- **可演示时段（时区）**：北京时间

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行（Monitor 子系统），关键用例可复现（基础示例）
- [ ] （如有）测试网合约地址与验证链接（当前无合约）
- [x] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [ ] 联系方式与可演示时段已填写
