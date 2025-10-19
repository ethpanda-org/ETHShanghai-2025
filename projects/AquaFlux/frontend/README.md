# AquaFlux App

AquaFlux 是一个集成的 RWA (Real World Assets) DeFi 平台线框原型，支持资产市场、代币交换和结构化产品操作。

## 功能特性

- **Markets (市场)**: 浏览和分析 RWA 资产，支持 P/C/S 三层结构
- **Swap (交换)**: 快速交换稳定币与资产代币
- **Structure (结构)**: 拆分/合并和包装/解包操作

## 技术栈

- ⚛️ React 18
- ⚡ Vite
- 🎨 Tailwind CSS
- 📦 ESLint

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 在浏览器中打开 `http://localhost:3000`

## 项目结构

```
src/
├── components/     # 共享组件
├── pages/         # 页面组件
├── hooks/         # 自定义 hooks
├── utils/         # 工具函数
├── data/          # Mock 数据
├── App.jsx        # 主应用组件
├── main.jsx       # 应用入口
└── index.css      # 全局样式
```

## 核心概念

- **P (Principal)**: 本金层，固定到期收益
- **C (Coupon)**: 票息层，可波动收益  
- **S (Shield)**: 护盾层，高收益/高风险

等式恒成立：**1P + 1C + 1S = 1 RWA**

## 开发

- 开发模式: `npm run dev`
- 构建: `npm run build`
- 预览构建: `npm run preview`
- 代码检查: `npm run lint`

## 说明

这是一个线框原型 (Wireframe)，所有的价格、交易和数据都是模拟的，仅用于演示 UX/UI 流程。
