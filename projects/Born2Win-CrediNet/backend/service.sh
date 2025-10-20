#!/bin/bash

# CrediNet 服务管理脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/credinet.log"
PID_FILE="/tmp/credinet.pid"

cd "$SCRIPT_DIR"

case "$1" in
  start)
    # 检查是否已经运行
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "❌ 服务已经在运行中 (PID: $(cat $PID_FILE))"
      exit 1
    fi
    
    # 检查端口是否被占用
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "❌ 端口 8080 已被占用"
      echo "使用 '$0 kill' 强制清理端口"
      exit 1
    fi
    
    echo "🚀 启动 CrediNet 服务..."
    cargo run > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # 等待服务启动
    sleep 3
    
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ 服务已启动 (PID: $(cat $PID_FILE))"
      echo "📋 日志文件: $LOG_FILE"
      echo "🌐 服务地址: http://127.0.0.1:8080"
      tail -5 "$LOG_FILE"
    else
      echo "❌ 服务启动失败，查看日志："
      cat "$LOG_FILE"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;
    
  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "⚠️  未找到运行的服务"
      exit 0
    fi
    
    PID=$(cat "$PID_FILE")
    echo "🛑 停止服务 (PID: $PID)..."
    kill "$PID" 2>/dev/null
    sleep 1
    
    if kill -0 "$PID" 2>/dev/null; then
      echo "⏳ 强制停止..."
      kill -9 "$PID" 2>/dev/null
    fi
    
    rm -f "$PID_FILE"
    echo "✅ 服务已停止"
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      PID=$(cat "$PID_FILE")
      echo "✅ 服务运行中 (PID: $PID)"
      echo "📋 最新日志："
      tail -10 "$LOG_FILE"
    else
      echo "❌ 服务未运行"
      [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
    ;;
    
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "❌ 日志文件不存在"
      exit 1
    fi
    ;;
    
  kill)
    echo "🔪 强制清理所有相关进程和端口..."
    pkill -f credinet-auth 2>/dev/null
    lsof -ti:8080 | xargs kill -9 2>/dev/null
    rm -f "$PID_FILE"
    sleep 1
    echo "✅ 清理完成"
    ;;
    
  test)
    echo "🧪 测试服务是否正常..."
    if curl -s -f http://127.0.0.1:8080/api/openapi.json > /dev/null 2>&1; then
      echo "✅ 服务正常运行"
      echo ""
      echo "测试发送验证码："
      curl -s -X POST http://127.0.0.1:8080/api/auth/send_code \
        -H "Content-Type: application/json" \
        -d '{"contact":"test@example.com"}' | python3 -m json.tool
    else
      echo "❌ 服务未运行或无响应"
      exit 1
    fi
    ;;
    
  *)
    echo "CrediNet 服务管理"
    echo ""
    echo "用法: $0 {start|stop|restart|status|logs|kill|test}"
    echo ""
    echo "命令说明："
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 实时查看日志"
    echo "  kill     - 强制清理所有进程"
    echo "  test     - 测试服务是否正常"
    exit 1
    ;;
esac

