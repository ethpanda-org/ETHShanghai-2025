# 部署指南 / Deployment Guide

## 部署环境准备 / Deployment Environment Preparation

部署项目需要进入frontend文件夹，并确保安装了Node.js环境。
To deploy the project, you need to enter the frontend folder and ensure that the Node.js environment is installed.

## 生产环境部署步骤 / Production Environment Deployment Steps

1. 进入frontend目录：
   Enter the frontend directory:
   ```bash
   cd frontend
   ```

2. 安装项目依赖：
   Install project dependencies:
   ```bash
   npm install
   ```

3. 构建生产版本：
   Build the production version:
   ```bash
   npm run build
   ```

4. 构建完成后，在`dist`文件夹中会生成编译后的前端文件
   After the build is complete, the compiled frontend files will be generated in the `dist` folder

5. 将`dist`文件夹中的所有文件部署到您的Web服务器上
   Deploy all files in the `dist` folder to your Web server

## 开发环境临时部署 / Development Environment Temporary Deployment

如果需要在局域网中临时部署进行测试，可以使用以下命令：
If you need to temporarily deploy for testing in a local area network, you can use the following command:

```bash
npm run dev
```

此命令会启动一个开发服务器，可以通过局域网IP地址访问项目。
This command will start a development server, and you can access the project through the local area network IP address.

开发环境部署的功能和生产环境完全相同
The functionality of the development environment deployment is exactly the same as the production environment