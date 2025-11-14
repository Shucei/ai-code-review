# AI Code Review 使用指南

## 快速开始

### 1. 安装和配置

#### 安装依赖

```bash
cd ai-code-review
pnpm install
```

#### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下必需的配置项：

```env
# GitLab 配置
GITLAB_URL=https://your-gitlab.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxx

# AI 配置（使用 OpenAI GPT）
AI_API_KEY=sk-xxxxxxxxxxxx
AI_MODEL=gpt-4o

# 服务器端口
PORT=3000
```

### 2. 启动服务

#### 开发模式（带热重载）

```bash
pnpm dev
```

#### 生产模式

```bash
# 编译
pnpm build

# 启动
pnpm start
```

服务启动后会显示：

```
🚀 AI Code Review 服务已启动
📍 端口: 3000
🔗 GitLab URL: https://your-gitlab.com
🤖 AI Model: gpt-4o

服务端点：
  - GET  /health              健康检查
  - POST /webhook/gitlab      GitLab Webhook
  - POST /review              手动触发审查
```

### 3. 配置 GitLab Webhook

#### 步骤 1：确保服务可以从 GitLab 访问

如果是本地开发，可以使用 ngrok 等工具暴露本地端口：

```bash
ngrok http 3000
```

会得到一个公网地址，例如：`https://abc123.ngrok.io`

#### 步骤 2：在 GitLab 项目中添加 Webhook

1. 进入你的 GitLab 项目
2. 点击 **Settings** → **Webhooks**
3. 填写 Webhook 信息：
   - **URL**: `https://abc123.ngrok.io/webhook/gitlab` (或你的服务器地址)
   - **Secret token**: （可选）填写你在 `.env` 中设置的 `WEBHOOK_SECRET`
   - **Trigger**: 勾选 **Merge request events**
   - 取消勾选其他不需要的事件
4. 点击 **Add webhook**

#### 步骤 3：测试 Webhook

在 GitLab Webhook 页面，点击刚创建的 Webhook 的 **Test** 按钮，选择 **Merge Request events**。

如果配置正确，会看到返回 200 状态码。

### 4. 使用效果

#### 创建或更新 MR 时

当你创建或更新一个 Merge Request 时：

1. GitLab 会自动发送 Webhook 到你的服务
2. 服务会获取 MR 的代码变更
3. AI 会根据代码规范分析代码
4. 自动在 MR 中添加审查评论

#### 评论格式

**总体评论**（在 MR 讨论区）：

```markdown
## 🤖 AI Code Review 结果

总计发现 5 个问题：

- ❌ 错误: 2
- ⚠️ 警告: 2
- ℹ️ 建议: 1

### ❌ 错误

**1. src/components/UserList.tsx:15**

规则: `@moka-fe/const-variable-name`

常量名称必须全部大写，单词之间使用下划线分隔

💡 建议: 将 `maxCount` 改为 `MAX_COUNT`

---

**2. src/utils/api.ts:23**

规则: `@typescript-eslint/no-explicit-any`

禁止使用 any 类型

💡 建议: 为函数参数添加明确的类型定义
```

**行内评论**（在具体代码行）：

对于错误级别的问题，还会在对应的代码行添加评论，方便定位。

## 手动触发审查

如果需要手动触发代码审查（例如重新审查某个 MR），有两种方式：

### 方式 1：使用脚本

```bash
bash scripts/manual-review.sh <项目ID> <MR的IID>
```

例如：

```bash
bash scripts/manual-review.sh 123 45
```

### 方式 2：使用 API

```bash
curl -X POST http://localhost:3000/review \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 123,
    "mergeRequestIid": 45
  }'
```

## 代码规范说明

本项目基于 **hcm-platform-fe** 项目的实际编码规范，主要检查以下方面：

### 1. 命名规范

#### 常量命名

```typescript
// ✅ 正确
const MAX_COUNT = 100;
const API_BASE_URL = "https://api.example.com";

// ❌ 错误
const maxCount = 100;
const apiBaseUrl = "https://api.example.com";
```

#### 组件命名

```typescript
// 文件名: UserProfile.tsx

// ✅ 正确
interface UserProfileProps {
  userId: string;
}

const UserProfile: React.FC<UserProfileProps> = (props) => {
  // ...
};

// ❌ 错误
interface Props {
  // 应该是 UserProfileProps
  userId: string;
}
```

### 2. TypeScript 规范

#### 禁止 any

```typescript
// ✅ 正确
function getUser(id: string): Promise<User | null> {
  return api.fetchUser(id);
}

// ❌ 错误
function getUser(id: any): any {
  return api.fetchUser(id);
}
```

#### 枚举初始化

```typescript
// ✅ 正确
enum Status {
  Pending = 0,
  Active = 1,
  Completed = 2,
}

// ❌ 错误
enum Status {
  Pending,
  Active,
  Completed,
}
```

#### 避免魔法数字

```typescript
// ✅ 正确
const MAX_RETRY_COUNT = 3;

function retry() {
  for (let i = 0; i < MAX_RETRY_COUNT; i++) {
    // ...
  }
}

// ❌ 错误
function retry() {
  for (let i = 0; i < 3; i++) {
    // 魔法数字
    // ...
  }
}
```

### 3. React 规范

#### Hooks 依赖

```typescript
// ✅ 正确
useEffect(() => {
  fetchData(userId);
}, [userId]); // 正确声明依赖

// ❌ 错误
useEffect(() => {
  fetchData(userId);
}, []); // 缺少依赖项
```

#### 禁止内联样式

```typescript
// ✅ 正确
import styles from './User.module.less';

<div className={styles.container}>
  <UserCard className={styles.card} />
</div>

// ❌ 错误
<div style={{ padding: 10 }}>
  <UserCard style={{ margin: 10 }} />
</div>
```

#### 列表 Key

```typescript
// ✅ 正确
{
  users.map((user) => <UserCard key={user.id} user={user} />);
}

// ❌ 错误
{
  users.map((user) => (
    <UserCard user={user} /> // 缺少 key
  ));
}
```

### 4. Import 规范

#### 导入顺序

```typescript
// ✅ 正确
import React, { useState } from "react";
import { message } from "antd";
import moment from "moment";

import { UserService } from "@/services/user";
import { formatDate } from "@/utils/time";

import { Header } from "./components/Header";

import styles from "./index.less";
```

#### 禁止的导入

某些大型库必须通过动态导入使用：

```typescript
// ❌ 错误
import XLSX from "xlsx";
import AliOSS from "ali-oss";

// ✅ 正确
import { loadXLSX } from "@/dynamicImports/xlsx";
import { loadAliOSS } from "@/dynamicImports/aliOss";

const XLSX = await loadXLSX();
const AliOSS = await loadAliOSS();
```

### 5. 代码质量

#### 函数参数数量

```typescript
// ✅ 正确
interface CreateUserOptions {
  name: string;
  email: string;
  role: string;
  department: string;
}

function createUser(options: CreateUserOptions) {
  // ...
}

// ❌ 错误
function createUser(name: string, email: string, role: string, department: string) {
  // 参数超过 3 个
}
```

#### 回调函数规范

```typescript
// ✅ 正确
function fetchData(url: string, callback: (error: Error | null, data?: any) => void) {
  // error 作为第一个参数
  // callback 作为最后一个参数
}

// ❌ 错误
function fetchData(callback: (data: any, error: Error) => void, url: string) {
  // callback 不是最后一个参数
  // error 不是第一个参数
}
```

完整的规范说明请查看 [docs/coding-standards.md](coding-standards.md)

## 常见问题

### 1. 如何调整审查的严格程度？

修改 `src/reviewer/ai-reviewer.ts` 中的系统提示词，可以调整 AI 的审查严格程度。

### 2. 如何添加自定义规范？

编辑 `docs/coding-standards.md`，添加你的团队规范。AI 会根据这个文档进行审查。

### 3. 审查速度慢怎么办？

- 调整 `src/reviewer/ai-reviewer.ts` 中的 `BATCH_SIZE` 参数
- 大型 MR 建议分成多个小的 MR

### 4. 如何查看日志？

日志文件位于 `logs/` 目录：

- `logs/error.log` - 错误日志
- `logs/combined.log` - 所有日志

也可以在控制台实时查看（开发模式）。

### 5. 成本控制

AI 调用会产生费用，建议：

- 监控 OpenAI API 使用情况
- 设置月度预算限制
- 对于非重要项目，可以只审查特定分支的 MR

### 6. 如何跳过某些文件的审查？

目前系统会自动跳过：

- 删除的文件
- 非代码文件（根据扩展名判断）

如需更精细的控制，可以修改 `src/reviewer/ai-reviewer.ts` 中的 `isCodeFile` 方法。

## 部署建议

### Docker 部署

可以创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t ai-code-review .
docker run -d -p 3000:3000 --env-file .env ai-code-review
```

### 使用 PM2 部署

```bash
npm install -g pm2
pm2 start dist/index.js --name ai-code-review
pm2 save
pm2 startup
```

### 使用 systemd 部署

创建 `/etc/systemd/system/ai-code-review.service`：

```ini
[Unit]
Description=AI Code Review Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ai-code-review
ExecStart=/usr/bin/node /path/to/ai-code-review/dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-code-review
sudo systemctl start ai-code-review
```

## 安全建议

1. **使用 WEBHOOK_SECRET**: 生产环境务必配置 Webhook 密钥
2. **HTTPS**: 使用 HTTPS 保护通信
3. **防火墙**: 限制只允许 GitLab 服务器访问 Webhook 端点
4. **Token 权限**: GitLab Token 只授予必要的权限
5. **定期更新**: 定期更新依赖包

## 监控和维护

### 日志监控

```bash
# 实时查看日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

### 健康检查

```bash
curl http://localhost:3000/health
```

### 性能监控

建议集成以下工具：

- Prometheus + Grafana（指标监控）
- Sentry（错误追踪）
- ELK Stack（日志分析）

## 贡献

欢迎提交 Issue 和 Pull Request！如果你有好的想法或改进建议，请随时联系我们。

## 许可证

MIT
