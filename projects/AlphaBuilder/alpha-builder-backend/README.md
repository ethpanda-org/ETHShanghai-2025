# Prisma 操作指南

本项目使用 [Prisma](https://www.prisma.io/) 作为 ORM。以下命令均在 `alpha-builder-backend` 目录下执行，默认使用 `pnpm`，你也可以将 `pnpm` 替换为 `npm` 或 `yarn`。

## 环境准备
- 复制 `.env.example` 为 `.env`，并根据实际数据库连接信息调整 `DATABASE_URL`。
- 确保 PostgreSQL 服务已经启动（可使用仓库内的 `Dockerfile` 运行一个本地实例，默认数据库名为 `alpha-builder-db`，用户名 `user`，密码 `password`）。

## 常用命令
- 安装依赖：`pnpm install`
- 生成 Prisma Client：`npx prisma generate`（或 `pnpm prisma:generate`）
- 快速将 schema 结构同步到数据库（不生成迁移文件）：`npx prisma db push`
- 创建迁移并在开发数据库执行（示例中迁移名为 `init`）：`npx prisma migrate dev --name init`
- 将已有迁移部署到其它环境：`npx prisma migrate deploy`
- 查看数据库状态：`npx prisma migrate status`
- 打开 Prisma Studio（可视化管理数据）：`npx prisma studio`

## 运行流程建议
1. 确保 `.env` 和数据库服务配置正确。
2. 如有 schema 变更，先运行 `npx prisma db push`（演示或临时代码时使用），或使用 `npx prisma migrate dev --name <name>` 创建并应用迁移。
3. 运行 `npx prisma generate` 确保生成的 Prisma Client 最新。
4. 在 NestJS 应用中使用 `PrismaService`（或自定义服务）访问数据库。

> 提示：生产环境请根据实际需求调整数据库账号和密码，并妥善保存迁移记录。

## 数据库推送

npx prisma db push

## 迁移文件并应用到数据库, init 是迁移的名字

npx prisma migrate dev --name init

## 生成 Prisma Client

npx prisma generate

## 查看数据库内容

npx prisma studio
