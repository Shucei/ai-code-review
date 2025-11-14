#!/bin/bash

# 手动触发代码审查的脚本

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "用法: $0 <project_id> <merge_request_iid>"
  echo "示例: $0 123 45"
  exit 1
fi

PROJECT_ID=$1
MR_IID=$2
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "触发代码审查..."
echo "  项目 ID: $PROJECT_ID"
echo "  MR IID: $MR_IID"
echo ""

curl -X POST "$SERVER_URL/review" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\": $PROJECT_ID, \"mergeRequestIid\": $MR_IID}"

echo ""
echo ""
echo "完成！"

