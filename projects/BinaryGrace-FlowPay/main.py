#!/usr/bin/env python3
"""
FlowPay 主启动脚本
支持多种启动模式：前端、后端、完整服务
"""

import os
import sys
import argparse
import subprocess
import time
from pathlib import Path

def check_dependencies():
    """检查依赖是否安装"""
    try:
        import fastapi
        import uvicorn
        import web3
        import langchain
        print("✅ 所有依赖已安装")
        return True
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("请运行: pip install -r requirements.txt")
        return False

def start_backend(network="devnet", port=8000):
    """启动后端服务"""
    print(f"🚀 启动后端服务 (网络: {network}, 端口: {port})")
    
    # 设置环境变量
    os.environ["NETWORK_TYPE"] = network
    
    # 启动FastAPI服务
    import uvicorn
    from backend.main import app
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

def start_frontend(port=8000):
    """启动前端服务（通过后端提供静态文件）"""
    print(f"🌐 前端服务已集成到后端服务中 (端口: {port})")
    print(f"📱 访问地址: http://localhost:{port}")

def start_full_service(network="devnet", port=8000):
    """启动完整服务（前端+后端）"""
    print(f"🎯 启动完整服务 (网络: {network}, 端口: {port})")
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 设置环境变量
    os.environ["NETWORK_TYPE"] = network
    
    # 启动服务
    start_backend(network, port)

def main():
    parser = argparse.ArgumentParser(description="FlowPay 启动脚本")
    parser.add_argument("mode", choices=["frontend", "backend", "full"], 
                       help="启动模式: frontend(前端), backend(后端), full(完整服务)")
    parser.add_argument("--network", default="devnet", 
                       choices=["devnet", "testnet", "mainnet"],
                       help="区块链网络类型")
    parser.add_argument("--port", type=int, default=8000,
                       help="服务端口")
    
    args = parser.parse_args()
    
    print("🎉 FlowPay - 去中心化AI协作平台")
    print("=" * 50)
    
    if args.mode == "frontend":
        start_frontend(args.port)
    elif args.mode == "backend":
        start_backend(args.network, args.port)
    elif args.mode == "full":
        start_full_service(args.network, args.port)

if __name__ == "__main__":
    main()
