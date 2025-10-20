# AquaFlux 项目脚本

> 项目级别的工具脚本和自动化脚本集合

---

## 📁 目录说明

本目录用于存放 **项目级别** 的工具脚本，用于自动化开发、部署和维护流程。

各模块的专用脚本分别位于：
- **合约部署、测试交互脚本**: [`contracts/scripts/`](../contracts/scripts/) 
- **前端构建脚本**: [`frontend/package.json`](../frontend/package.json) 
- **后端运维脚本**: [`backend/package.json`](../backend/package.json)

---

## 🚀 快速开始脚本（规划中）

以下是建议添加的项目级脚本：

### `quick-start.sh` - 一键启动
```bash
#!/bin/bash
# 一键启动所有服务（合约部署 + 后端 + 前端）

echo "🚀 Starting AquaFlux Full Stack..."

# 1. 启动本地 Hardhat 网络
cd contracts
npx hardhat node &
sleep 5

# 2. 部署合约
npx hardhat run scripts/deploy/deploy-all.ts --network localhost

# 3. 启动后端
cd ../backend
docker-compose up -d
pnpm install
pnpm prisma:migrate
pnpm dev &

# 4. 启动前端
cd ../frontend
npm install
npm run dev

echo "✅ All services started!"
echo "📝 Frontend: http://localhost:5173"
echo "📝 Backend: http://localhost:3001"
```

### `setup.sh` - 初始化环境
```bash
#!/bin/bash
# 安装所有依赖

echo "📦 Installing dependencies..."

cd contracts && pnpm install && cd ..
cd backend && pnpm install && cd ..
cd frontend && npm install && cd ..

echo "✅ All dependencies installed!"
```

### `cleanup.sh` - 清理环境
```bash
#!/bin/bash
# 清理编译产物和缓存

echo "🧹 Cleaning up..."

cd contracts && rm -rf artifacts cache && cd ..
cd backend && docker-compose down && cd ..
cd frontend && rm -rf dist node_modules/.vite && cd ..

echo "✅ Cleanup complete!"
```

### `test-all.sh` - 运行全部测试
```bash
#!/bin/bash
# 运行所有测试套件

echo "🧪 Running all tests..."

cd contracts
pnpm test

cd ../backend
pnpm test

echo "✅ All tests passed!"
```

---

## 🔗 相关链接

- **合约部署文档**: [contracts/scripts/deploy/README.md](../contracts/scripts/deploy/README.md)
- **项目文档中心**: [docs/README.md](../docs/README.md)
- **快速开始指南**: [deployments/QUICK_START.md](../deployments/QUICK_START.md)

---

## 💡 使用建议

**对于评委/新开发者**:
- 推荐使用 [deployments/QUICK_START.md](../deployments/QUICK_START.md) 获取详细的分步指南

**对于团队成员**:
- 可以根据需要在本目录添加自动化脚本
- 脚本命名建议: `动词-名词.sh` (如 `deploy-all.sh`)
- 添加脚本后请更新本 README

---

**最后更新**: 2025-10-20  
**维护者**: AquaFlux Team

