# 本地测试指南

## 环境准备

### 1. 安装依赖

```bash
cd /Users/esop/Desktop/ai-code-review
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# GitLab 配置
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your_gitlab_token

# AI 配置
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o

# 服务配置
PORT=3000
NODE_ENV=development
```

### 3. 获取必要的 Token

#### GitLab Token

1. 登录 GitLab
2. 进入 User Settings → Access Tokens
3. 创建 Personal Access Token
4. 权限选择：`api`, `read_api`, `read_repository`

#### OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录账户
3. 进入 API Keys 页面
4. 创建新的 API Key

## 启动服务

### 1. 启动开发服务器

```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动

### 2. 验证服务状态

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 测试方法

### 方法一：模拟 Webhook 请求

#### 1. 创建测试脚本

创建 `test-webhook.js`：

```javascript
const axios = require("axios");

async function testWebhook() {
  const webhookData = {
    object_kind: "merge_request",
    event_type: "merge_request",
    user: {
      id: 1,
      name: "Test User",
      username: "testuser",
    },
    project: {
      id: 123,
      name: "test-project",
      web_url: "https://gitlab.com/test/test-project",
    },
    object_attributes: {
      id: 456,
      iid: 1,
      title: "Test Merge Request",
      description: "This is a test MR",
      state: "opened",
      merge_status: "can_be_merged",
      url: "https://gitlab.com/test/test-project/-/merge_requests/1",
      source_branch: "feature-branch",
      target_branch: "main",
      last_commit: {
        id: "abc123",
        message: "Add new feature",
        url: "https://gitlab.com/test/test-project/-/commit/abc123",
      },
    },
    changes: {
      state: {
        previous: "closed",
        current: "opened",
      },
    },
  };

  try {
    const response = await axios.post("http://localhost:3000/webhook/gitlab", webhookData, {
      headers: {
        "Content-Type": "application/json",
        "X-Gitlab-Event": "Merge Request Hook",
      },
    });

    console.log("Webhook 测试成功:", response.status);
    console.log("响应:", response.data);
  } catch (error) {
    console.error("Webhook 测试失败:", error.response?.data || error.message);
  }
}

testWebhook();
```

#### 2. 运行测试

```bash
node test-webhook.js
```

### 方法二：使用 ngrok 暴露本地服务

#### 1. 安装 ngrok

```bash
# macOS
brew install ngrok

# 或下载二进制文件
# https://ngrok.com/download
```

#### 2. 启动 ngrok

```bash
ngrok http 3000
```

ngrok 会提供一个公网 URL，例如：`https://abc123.ngrok.io`

#### 3. 配置 GitLab Webhook

1. 进入你的 GitLab 项目
2. 进入 Settings → Integrations
3. 添加 Webhook URL: `https://abc123.ngrok.io/webhook/gitlab`
4. 选择触发事件：Merge request events
5. 保存配置

#### 4. 创建测试 Merge Request

1. 创建一个新分支
2. 添加一些测试代码
3. 推送分支并创建 Merge Request
4. 观察本地服务日志

### 方法三：直接测试 AI 审查功能

#### 1. 创建测试脚本

创建 `test-ai-review.js`：

```javascript
const { AIReviewer } = require("./src/reviewer/ai-reviewer");
const fs = require("fs");

async function testAIReview() {
  const reviewer = new AIReviewer();

  // 模拟代码变更
  const mockChanges = [
    {
      file: "src/components/Test.tsx",
      type: "add",
      content: `
import React from 'react';

interface Props {
  name: string;
}

const TestComponent: React.FC<Props> = ({ name }) => {
  const handleClick = () => {
    console.log('Hello', name);
  };

  return (
    <div>
      <h1>{name}</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};

export default TestComponent;
      `,
    },
  ];

  try {
    console.log("开始 AI 审查...");
    const comments = await reviewer.reviewChanges(mockChanges);

    console.log("审查完成，发现", comments.length, "个问题");

    if (comments.length > 0) {
      console.log("\n审查结果:");
      console.log(reviewer.formatCommentsAsMarkdown(comments));
    } else {
      console.log("✅ 代码审查通过，未发现违反规范的问题。");
    }
  } catch (error) {
    console.error("AI 审查失败:", error.message);
  }
}

testAIReview();
```

#### 2. 运行测试

```bash
node test-ai-review.js
```

## 调试技巧

### 1. 查看详细日志

```bash
# 启动时显示详细日志
DEBUG=* npm run dev

# 或设置环境变量
export DEBUG=*
npm run dev
```

### 2. 检查 AI API 调用

在 `src/reviewer/ai-reviewer.ts` 中添加调试日志：

```typescript
// 在 reviewChanges 方法中添加
console.log("发送给 AI 的提示词:", prompt);
console.log("AI 返回的原始响应:", response);
```

### 3. 验证 GitLab API 调用

在 `src/services/gitlab-service.ts` 中添加调试日志：

```typescript
// 在 getMergeRequestDiff 方法中添加
console.log("GitLab API 响应:", response.data);
```

## 常见问题排查

### 1. 服务启动失败

```bash
# 检查端口是否被占用
lsof -i :3000

# 杀死占用进程
kill -9 <PID>
```

### 2. AI API 调用失败

- 检查 API Key 是否正确
- 确认账户余额充足
- 检查网络连接

### 3. GitLab API 调用失败

- 检查 Token 权限
- 确认项目 ID 正确
- 检查网络连接

### 4. Webhook 接收失败

- 检查 ngrok 是否正常运行
- 确认 GitLab webhook 配置正确
- 查看服务日志

## 测试用例

### 1. 测试 TypeScript 代码

```typescript
// 故意违反规范的代码
const data: any = { name: "test" };
function process(input) {
  return input;
}
```

### 2. 测试 React 代码

```tsx
// 故意违反规范的代码
import React, { useState, useEffect } from "react";

const Component = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1);
  }, []); // 缺少依赖

  return <div>{count}</div>;
};
```

### 3. 测试错误处理

```typescript
// 故意违反规范的代码
async function fetchData() {
  const response = await fetch("/api/data");
  const data = await response.json();
  return data; // 缺少错误处理
}
```

## 性能测试

### 1. 测试大文件处理

```bash
# 创建大文件测试
dd if=/dev/zero of=large-file.ts bs=1M count=10
```

### 2. 测试批量处理

```bash
# 创建多个文件测试
for i in {1..10}; do
  echo "export const test$i = () => {};" > "test$i.ts"
done
```

## 监控和日志

### 1. 查看服务日志

```bash
# 实时查看日志
tail -f logs/app.log

# 查看错误日志
grep ERROR logs/app.log
```

### 2. 监控资源使用

```bash
# 查看内存使用
ps aux | grep node

# 查看 CPU 使用
top -p $(pgrep node)
```

## 下一步

1. **完善测试用例**: 添加更多边界情况测试
2. **性能优化**: 优化大文件处理性能
3. **错误处理**: 完善错误处理和恢复机制
4. **监控告警**: 添加监控和告警功能
5. **部署测试**: 在测试环境部署验证

通过以上测试方法，你可以全面验证 AI 代码审查系统的功能是否正常工作。
