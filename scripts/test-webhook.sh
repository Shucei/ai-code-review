#!/bin/bash

# 测试 Webhook 端点的脚本

SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "测试 Webhook 端点: $SERVER_URL/webhook/gitlab"
echo ""

curl -X POST "$SERVER_URL/webhook/gitlab" \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Merge Request Hook" \
  -d @examples/webhook-payload.json

echo ""
echo ""
echo "完成！"

