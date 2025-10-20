# ProteinFoldDAO

一个面向去中心化科研协作（DeSci）的蛋白质折叠预测与数据协作平台。

## 项目简介
- 结合链上协作与AI推理，提供可追溯的预测流程与数据资产管理。
- 包含 AI 推理、数据缓存、简单前端（Streamlit）与合约样例（Hardhat）。

## 代码结构（本仓库提交摘要）
- projects/proteinfolddao/metadata.json: 项目信息与参赛元数据
- projects/proteinfolddao/README.md: 本说明文件
- 代码主仓库：请见下方运行指南对应的本地结构描述

## 本地项目结构（提交者本地工作目录）
- ai/: 推理与数据库管理（Python）
- ui/: Streamlit 界面与查询工具（Python）
- contracts/: Hardhat 与 Solidity 合约示例

## 快速运行（本地）
### 1) 准备 Python 环境
- Python 3.10+
- 在 `ai/requirements.txt` 与 `ui/requirements.txt` 基础上安装依赖

```bash
# AI 服务依赖
pip install -r ai/requirements.txt
# UI 依赖
pip install -r ui/requirements.txt
```

### 2) 运行 AI 组件
```bash
# 示例：运行测试与推理
python tests/run_tests.py
# 或直接运行流式推理/数据库交互脚本
python ai/predictor.py
```

### 3) 运行前端（Streamlit）
```bash
streamlit run ui/app.py
```

### 4) 合约（可选）
```bash
cd contracts
npm install
npx hardhat test
```

## 功能要点
- 自定义序列预测、结果缓存与查询
- 简化的数据库管理与测试覆盖
- 与合约交互的占位示例（可扩展为结果上链/激励分发）

## 许可协议
MIT
