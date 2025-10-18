// ecosystem.config.js
module.exports = {
  apps : [
    {
      // 生产环境配置
      name   : "backend-prod", // 应用名称
      script : "pnpm",                     // 要执行的命令
      args   : "run start",                // pnpm 的参数，执行 "start" 脚本
      cwd    : "./",                       // 应用的当前工作目录
      instances: 1,                        // 启动实例数量 (可以是 'max' 来利用所有核心)
      autorestart: true,                   // 应用崩溃后自动重启
      watch  : false,                      // 生产环境通常禁用 watch
      max_memory_restart: '1G',            // 内存超过1G则重启
      env_production: {                    // 为生产环境设置的环境变量
         NODE_ENV: "production"
      }
    },
  ]
};
