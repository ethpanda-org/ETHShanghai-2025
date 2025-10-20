#!/bin/bash

# WebSocket 服务 Docker 管理脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================================================"
echo "WebSocket 审计服务 - Docker 管理"
echo "======================================================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到 Docker${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    echo "请启动 Docker Desktop"
    exit 1
fi

# 显示帮助
show_help() {
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  build   - 构建 Docker 镜像"
    echo "  start   - 启动服务"
    echo "  stop    - 停止服务"
    echo "  restart - 重启服务"
    echo "  logs    - 查看日志"
    echo "  status  - 查看状态"
    echo "  clean   - 清理容器和镜像"
    echo "  help    - 显示帮助"
    echo ""
}

# 构建镜像
build_image() {
    echo -e "${YELLOW}构建 Docker 镜像...${NC}"
    docker build -t nlpmeme-ws-server .
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 镜像构建成功${NC}"
    else
        echo -e "${RED}✗ 镜像构建失败${NC}"
        exit 1
    fi
}

# 启动服务
start_service() {
    echo -e "${YELLOW}启动服务...${NC}"
    
    # 检查容器是否已存在
    if [ "$(docker ps -aq -f name=nlpmeme-ws-server)" ]; then
        if [ "$(docker ps -q -f name=nlpmeme-ws-server)" ]; then
            echo -e "${YELLOW}服务已在运行${NC}"
            return
        else
            echo "删除旧容器..."
            docker rm nlpmeme-ws-server
        fi
    fi
    
    # 启动容器
    docker run -d \
        --name nlpmeme-ws-server \
        -p 8765:8765 \
        -v "$(pwd)/data:/app/data" \
        -e PYTHONUNBUFFERED=1 \
        --restart unless-stopped \
        nlpmeme-ws-server
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 服务启动成功${NC}"
        echo ""
        echo "WebSocket 地址: ws://localhost:8765"
        echo "Web 客户端: 在浏览器中打开 ws_client.html"
        echo ""
        echo "查看日志: ./run_docker.sh logs"
    else
        echo -e "${RED}✗ 服务启动失败${NC}"
        exit 1
    fi
}

# 停止服务
stop_service() {
    echo -e "${YELLOW}停止服务...${NC}"
    if [ "$(docker ps -q -f name=nlpmeme-ws-server)" ]; then
        docker stop nlpmeme-ws-server
        echo -e "${GREEN}✓ 服务已停止${NC}"
    else
        echo "服务未运行"
    fi
}

# 重启服务
restart_service() {
    stop_service
    sleep 2
    start_service
}

# 查看日志
view_logs() {
    if [ "$(docker ps -q -f name=nlpmeme-ws-server)" ]; then
        docker logs -f nlpmeme-ws-server
    else
        echo -e "${RED}服务未运行${NC}"
        exit 1
    fi
}

# 查看状态
check_status() {
    echo "======================================================================"
    echo "服务状态"
    echo "======================================================================"
    
    if [ "$(docker ps -q -f name=nlpmeme-ws-server)" ]; then
        echo -e "状态: ${GREEN}运行中${NC}"
        echo ""
        docker ps -f name=nlpmeme-ws-server --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "容器资源使用:"
        docker stats --no-stream nlpmeme-ws-server
    else
        echo -e "状态: ${RED}已停止${NC}"
        if [ "$(docker ps -aq -f name=nlpmeme-ws-server)" ]; then
            echo ""
            echo "最后运行状态:"
            docker ps -a -f name=nlpmeme-ws-server --format "table {{.Names}}\t{{.Status}}"
        fi
    fi
}

# 清理
clean_all() {
    echo -e "${YELLOW}清理容器和镜像...${NC}"
    
    # 停止并删除容器
    if [ "$(docker ps -aq -f name=nlpmeme-ws-server)" ]; then
        docker rm -f nlpmeme-ws-server
        echo "✓ 容器已删除"
    fi
    
    # 删除镜像
    if [ "$(docker images -q nlpmeme-ws-server)" ]; then
        docker rmi nlpmeme-ws-server
        echo "✓ 镜像已删除"
    fi
    
    echo -e "${GREEN}✓ 清理完成${NC}"
}

# 主逻辑
case "${1:-help}" in
    build)
        build_image
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

