@echo off
echo ========================================
echo   ZK 证明服务器启动脚本
echo ========================================
echo.

cd /d %~dp0
echo 当前目录: %CD%
echo.

echo 正在启动 ZK 服务器...
node server.js

pause

