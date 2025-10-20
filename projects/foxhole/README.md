# Foxhole (ETHShanghai 2025）

Foxhole 是一个端到端的开源原型，面向交易者与研究员，聚合链下情报与行情监测，提供关键词/实体抽取与基础风险审计，并通过 WebSocket 实时推送结果，帮助用户更快识别潜在热点与风险。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库：包含完整代码与本 README（当前目录）
- [ ] Demo 视频（≤ 3 分钟，中文）
- [ ] 在线演示链接（如有）
- [ ] 合约部署信息（如有）（本项目当前不含链上合约）
- [ ] 可选材料：Pitch Deck（不计分）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：Foxhole
- **一句话介绍**：统一采集 Dex Screener 与社媒数据，做实时关键词/实体抽取与基础审计，并通过 WS 推送可操作情报。
- **目标用户**：量化/手动交易者、加密研究员、风控与审计团队、信息流机器人开发者。
- **核心问题与动机（Pain Points）**：
  - 实时信息分散：行情与舆情来源多、信噪比高，难以统一聚合与去重。
  - 情报不可操作：原始数据缺少结构化抽取与风控信号，难以直接用于策略。
  - 实时分发困难：缺少统一的低延迟消息通道供前端/机器人消费。
- **解决方案（Solution）**：
  - Monitor 子系统持续抓取 Dex Screener token 数据（高频、去重、CSV 持久化）。
  - Twitter Listener 与 WS 监听器收集推文/消息流。
  - Extractor 子系统（BERT/TF-IDF/规则/正则/NER）对文本做关键词与实体抽取。
  - Audit 子系统做基础风险审计与可疑信号聚合。
  - WebSocket 服务器向客户端实时推送处理结果。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：暂缺（如需可在 `docs/` 或 Issue 补充）
- **关键模块**：
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

- **视频链接（≤3 分钟，中文）**：待补充
- **关键用例步骤**：
  - 用例 1：启动 Monitor，高频抓取 Dex Screener token，CSV 持久化与实时统计。
  - 用例 2：运行 Extractor，对推文/消息做关键词与实体抽取，输出结构化文本。
  - 用例 3：运行 Audit，聚合潜在风险信号并通过 WS 推送到客户端。

### 6) 可验证边界 (Verifiable Scope)

- 本仓库包含用于复现的核心代码与脚本：
  - 可验证：Monitor 抓取与去重、Extractor 多策略抽取、WS 服务端与客户端、基础审计示例。
  - 需自备：第三方 API Key（如 Twitter）。未提供的密钥相关功能需用户本地配置后使用。
  - 暂不公开：无。

### 7) 路线图与影响 (Roadmap & Impact)

- **1-3 周**：
  - 增加多源行情（如 Gecko/CMC）与跨链数据采集。
  - 增强审计规则库与告警策略（黑名单/流动性/合约模式）。
- **1-3 个月**：
  - 接入向量数据库与长期记忆，支持相似度检索与画像。
  - 推出前端仪表盘与告警机器人（TG/Discord/X）。
  - 评估链上审计与溯源能力，必要时补充合约模块。
- **对以太坊生态的价值**：
  - 提升信息发现与风控效率，辅助更稳健的交易与研究活动。
  - 为开源社区提供可复用的实时数据/抽取/分发骨架。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：待补充
- **成员与分工**：待补充
- **联系方式（Email/TG/X）**：待补充
- **可演示时段（时区）**：待补充

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行（Monitor 子系统），关键用例可复现（基础示例）
- [ ] （如有）测试网合约地址与验证链接（当前无合约）
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [ ] 联系方式与可演示时段已填写

