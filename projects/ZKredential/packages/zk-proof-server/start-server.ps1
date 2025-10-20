# ZK 证明服务器启动脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ZK 证明服务器启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本所在目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "当前目录: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# 检查 Node.js
Write-Host "检查 Node.js..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# 检查依赖
Write-Host "检查依赖..." -ForegroundColor Green
if (!(Test-Path "node_modules")) {
    Write-Host "⚠️ 未找到 node_modules，正在安装依赖..." -ForegroundColor Yellow
    npm install
}
Write-Host ""

# 启动服务器
Write-Host "正在启动 ZK 服务器..." -ForegroundColor Green
Write-Host "服务器将监听端口: 8080" -ForegroundColor Yellow
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host "" 
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

node server.js

Write-Host ""
Write-Host "服务器已停止" -ForegroundColor Yellow
pause

