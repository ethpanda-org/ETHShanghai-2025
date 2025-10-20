# 使用官方 Python 运行时作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt requirements_realtime.txt* ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir websockets

# 复制项目文件
COPY audit/ ./audit/
COPY ws_server.py ./
COPY ws_client.html ./

# 创建数据目录
RUN mkdir -p data

# 暴露 WebSocket 端口
EXPOSE 8765

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 启动命令
CMD ["python", "ws_server.py", "--host", "0.0.0.0", "--port", "8765"]

