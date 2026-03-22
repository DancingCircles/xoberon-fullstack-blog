#!/bin/bash
set -euo pipefail

echo "=== XOBERON Server 部署脚本 ==="
echo "时间: $(date)"

echo "[1/5] 拉取最新代码..."
git pull origin main

echo "[2/5] 构建 Docker 镜像..."
docker compose build api

echo "[3/5] 执行数据库迁移..."
source .env
export DB_DSN="postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=${DB_SSLMODE:-disable}"
make migrate-up || echo "迁移已是最新版本"

echo "[4/5] 重启服务..."
docker compose up -d api nginx

echo "[5/5] 等待服务启动..."
sleep 5
if curl -sf http://localhost:8080/api/health > /dev/null; then
    echo "✓ 部署成功！服务健康。"
else
    echo "✗ 部署失败！服务未响应。"
    docker compose logs api --tail 50
    exit 1
fi
