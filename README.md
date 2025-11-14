# AI Code Review for GitLab

一个基于 AI 的 GitLab Merge Request 代码审查工具，能够自动检查代码是否符合团队的编码规范。

## ✨ 特性

- 🤖 **AI 驱动**: 使用 OpenAI GPT-4o 进行智能代码审查
- 🔄 **自动触发**: 支持 GitLab Webhook，自动审查 MR 的创建和更新
- 💬 **智能评论**: 自动在 GitLab MR 中添加审查意见和改进建议
- 📊 **详细报告**: 提供问题统计和分类（错误、警告、建议）
- 🎯 **精准定位**: 支持行内评论，精确指出问题代码位置

## 📦 安装

### 环境要求

- Node.js >= 16.9.0
- pnpm >= 8.0.0（推荐）或 npm

### 克隆项目

```bash
git clone <your-repo-url>
cd ai-code-review
```

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# GitLab 配置
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your-gitlab-personal-access-token

# Webhook 安全验证（可选）
WEBHOOK_SECRET=your-webhook-secret

# AI 配置
AI_API_KEY=your-openai-api-key
AI_MODEL=gpt-4o

# 服务器配置
PORT=3000

# 日志级别
LOG_LEVEL=info
```

#### 获取 GitLab Personal Access Token

1. 登录 GitLab
2. 进入 `Settings` > `Access Tokens`
3. 创建新的 token，需要以下权限：
   - `api`
   - `read_api`
   - `read_repository`
   - `write_repository`

#### 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建 API Key

## 🚀 使用

### 开发模式

```bash
pnpm dev
# 或
npm run dev
```

### 生产模式

```bash
# 编译
pnpm build

# 启动
pnpm start
```

## 🔧 配置 GitLab Webhook

### 1. 启动服务

确保服务已经启动并可以从外网访问（可使用 ngrok 等工具）。

### 2. 在 GitLab 项目中配置 Webhook

1. 进入你的 GitLab 项目
2. 导航到 `Settings` > `Webhooks`
3. 添加新的 Webhook：
   - **URL**: `http://your-server:3000/webhook/gitlab`
   - **Secret token**: 与 `.env` 中的 `WEBHOOK_SECRET` 一致（可选）
   - **Trigger**: 勾选 `Merge request events`
   - **SSL verification**: 根据实际情况选择

### 3. 测试 Webhook

使用提供的测试脚本：

```bash
bash scripts/test-webhook.sh
```

或手动发送请求：

```bash
curl -X POST http://localhost:3000/webhook/gitlab \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Merge Request Hook" \
  -d @examples/webhook-payload.json
```

## 📝 API 接口

### 健康检查

```http
GET /health
```

响应：

```json
{
  "status": "ok",
  "timestamp": "2025-10-21T10:00:00.000Z",
  "service": "ai-code-review"
}
```

### GitLab Webhook

```http
POST /webhook/gitlab
Headers:
  Content-Type: application/json
  X-Gitlab-Event: Merge Request Hook
  X-Gitlab-Token: your-webhook-secret (可选)
```

### 手动触发审查

```http
POST /review
Content-Type: application/json

{
  "projectId": 123,
  "mergeRequestIid": 45
}
```

使用脚本触发：

```bash
bash scripts/manual-review.sh <project_id> <merge_request_iid>
```

示例：

```bash
bash scripts/manual-review.sh 123 45
```

## 📚 代码规范

本项目基于 hcm-platform-fe 项目的编码规范进行审查，主要包括：

### 1. 命名规范

- **常量**: 全大写，下划线分隔（`MAX_COUNT`, `API_BASE_URL`）
- **函数**: 小驼峰命名（`getUserInfo`, `calculateTotal`）
- **组件**: 大驼峰命名（`UserProfile`, `DataTable`）
- **组件 Props**: 组件名 + `Props`（`UserProfileProps`）

### 2. TypeScript 规范

- 禁止使用 `any` 类型
- 枚举必须显式初始化
- 避免魔法数字（除了 -1, 0, 1）
- 优先使用可选链操作符

### 3. React 规范

- 正确声明 Hooks 依赖
- 禁止使用内联样式
- 组件必须使用自闭合标签
- 列表渲染必须提供 key

### 4. Import 规范

- 正确的导入顺序（第三方库 > 内部模块 > 相对路径 > 样式）
- TypeScript/JavaScript 文件不包含扩展名
- 禁止直接导入大型库（需通过动态导入）

### 5. 代码质量

- 函数参数不超过 3 个
- 回调函数的第一个参数必须是 error
- Promise 链必须正确返回值

详细规范请查看 [docs/coding-standards.md](docs/coding-standards.md)

## 🔍 工作流程

```
1. GitLab MR 创建/更新
        ↓
2. GitLab 发送 Webhook 事件
        ↓
3. 服务接收并验证事件
        ↓
4. 获取 MR 的代码变更
        ↓
5. AI 分析代码并检查规范
        ↓
6. 生成审查报告
        ↓
7. 推送评论到 GitLab MR
```

## 📂 项目结构

```
ai-code-review/
├── docs/                       # 文档
│   └── coding-standards.md    # 代码规范文档
├── examples/                   # 示例文件
│   └── webhook-payload.json   # Webhook 示例数据
├── scripts/                    # 辅助脚本
│   ├── test-webhook.sh        # 测试 Webhook
│   └── manual-review.sh       # 手动触发审查
├── src/
│   ├── checker/               # 代码检查器
│   │   └── code-checker.ts
│   ├── reviewer/              # AI 审查器
│   │   └── ai-reviewer.ts
│   ├── types/                 # 类型定义
│   │   └── index.ts
│   ├── utils/                 # 工具函数
│   │   ├── config.ts          # 配置管理
│   │   ├── gitlab.ts          # GitLab API 客户端
│   │   └── logger.ts          # 日志工具
│   └── index.ts               # 主入口
├── .env.example               # 环境变量示例
├── .eslintrc.js               # ESLint 配置
├── .gitignore
├── package.json
├── tsconfig.json              # TypeScript 配置
└── README.md
```

## 🎯 审查示例

当代码违反规范时，AI 会在 MR 中添加类似以下的评论：

### 总体评论

```markdown
## 🤖 AI Code Review 结果

总计发现 3 个问题：

- ❌ 错误: 2
- ⚠️ 警告: 1
- ℹ️ 建议: 0

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

### 行内评论

AI 还会在具体的代码行添加评论，精确指出问题位置。

## 🛠️ 开发

### 编译项目

```bash
pnpm build
```

### 运行 Linter

```bash
pnpm lint
```

### 运行测试

```bash
pnpm test
```

## 💡 提示

1. **性能优化**: 对于大型 MR，建议调整 AI 审查的批次大小
2. **成本控制**: AI 调用会产生费用，建议监控 API 使用情况
3. **规范定制**: 可以根据团队需求修改 `docs/coding-standards.md`
4. **Webhook 安全**: 生产环境强烈建议配置 `WEBHOOK_SECRET`

---
