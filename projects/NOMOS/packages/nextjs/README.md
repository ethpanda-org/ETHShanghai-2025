使用说明：Next.js 前端（针对本项目）

Yarn (Berry) 国内镜像配置

本项目使用 Yarn 3 (berry)，已在项目根（packages/nextjs）添加 `.yarnrc.yml`：

npmRegistryServer: "https://registry.npmmirror.com"

这会使 `yarn install` 从国内镜像（npmmirror）下载包，提高国内网络速度。

常用命令

- 安装依赖：
  yarn install

- 启动开发服务器：
  yarn dev

- 构建：
  yarn build

- 生产运行：
  yarn start

如果你想临时使用官方 npm registry（不修改文件）：

YARN_NPM_REGISTRY_SERVER="https://registry.npmjs.org" yarn install

或恢复 `.yarnrc.yml` 的默认值，删除该文件或改回官方地址。
