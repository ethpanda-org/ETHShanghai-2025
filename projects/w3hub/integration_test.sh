#!/bin/bash

# 集成测试脚本
set -e

echo "启动测试环境..."
docker-compose -f test/docker-compose.yml up -d

echo "等待服务就绪..."
sleep 10

echo "运行单元测试..."
go test -v ./...

echo "运行集成测试..."
go test -tags=integration -v ./test/integration

echo "清理测试环境..."
docker-compose -f test/docker-compose.yml down