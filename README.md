# AI Code Review for GitLab

一个基于 AI 的 GitLab Merge Request 代码审查工具，能够自动检查代码是否符合团队的编码规范。

## ✨ 特性

- [object Object]驱动\*\*: 使用 OpenAI GPT-4o 或 DeepSeek 进行智能代码审查
- 🔄 **自动触发**: 通过 GitLab CI/CD 自动审查 MR 的创建和更新
- 💬 **智能评论**: 自动在 GitLab MR 中添加审查意见和改进建议 -[object Object]告**: 提供问题统计和分类（错误、警告、建议） -[object Object]定位**: 支持行内评论，精确指出问题代码位置
- 🚀 **零部署**: 无需部署服务器，直接在 GitLab CI/CD 中运行

## 📦 快速开始

### 1. 将项目添加到你的 GitLab 仓库

你可以选择以下两种方式之一：

**方式 A: 作为独立项目（推荐用于多项目共享）**

将此项目作为独立的 GitLab 项目，然后在其他项目中通过 CI/CD 引用它。

**方式 B: 集成到现有项目（推荐用于单项目使用）**

将此项目的文件复制到你的现有项目中。

### 2. 配置 GitLab CI/CD 变量

在你的 GitLab 项目中设置以下 CI/CD 变量：

1. 进入项目的 **Settings > CI/CD > Variables**
2. 添加以下变量：

| 变量名         | 说明                                                          | 是否必需 | 是否 Mask |
| -------------- | ------------------------------------------------------------- | -------- | --------- |
| `GITLAB_TOKEN` | GitLab Personal Access Token（需要 `api` 权限）               | ✅ 必需  | ✅ 是     |
| `AI_API_KEY`   | OpenAI 或 DeepSeek 的 API Key                                 | ✅ 必需  | ✅ 是     |
| `AI_MODEL`     | AI 模型名称（如 `gpt-4o` 或 `deepseek-chat`）                 | ✅ 必需  | ✅ 否     |
| `AI_BASE_URL`  | 自定义 AI API 地址（如 DeepSeek: `https://api.deepseek.com`） | ✅ 必需  | ✅ 否     |

#### 获取 GitLab Personal Access Token

1. 登录 GitLab
2. 进入 `Settings` > `Access Tokens`
3. 创建新的 token，需要以下权限：
   - `api` (必需)

#### 获取 AI API Key

**OpenAI:**

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建 API Key

**DeepSeek (推荐，更便宜):**

1. 访问 [DeepSeek Platform](https://platform.deepseek.com/)
2. 创建 API Key
3. 设置 `AI_BASE_URL=https://api.deepseek.com` 和 `AI_MODEL=deepseek-chat`

### 3. 配置 `.gitlab-ci.yml`

项目已经包含了 `.gitlab-ci.yml` 文件。如果你是集成到现有项目，确保你的 `.gitlab-ci.yml` 包含以下内容：

```yaml
stages:
  - review

ai-code-review:
  stage: review
  image: node:18
  only:
    - merge_requests
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - pnpm run review:ci
  allow_failure: true
```

### 4. 创建 Merge Request 测试

现在，创建一个新的分支并提交一些代码改动，然后创建一个 Merge Request：

```bash
# 1. 创建新分支
git checkout -b feature/test-ai-review

# 2. 做一些代码改动
echo "console.log('test');" >> test.js

# 3. 提交并推送
git add test.js
git commit -m "feat: test AI code review"
git push origin feature/test-ai-review
```

然后在 GitLab 中创建 Merge Request，你会看到 CI/CD 流水线自动运行，AI 审查结果会自动发布到 MR 的评论中。

## 🔍 工作流程

```
1. 开发者创建/更新 Merge Request
        ↓
2. GitLab CI/CD 自动触发 ai-code-review 作业
        ↓
3. 作业读取 MR 的代码变更
        ↓
4. AI 分析代码并检查规范
        ↓
5. 生成审查报告
        ↓
6. 自动推送评论到 GitLab MR
```

## 📚 代码规范

本项目基于 前端 项目的编码规范进行审查，主要包括：

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

## 📂 项目结构

```
ai-code-review/
├── docs/                       # 文档
│   └── coding-standards.md    # 代码规范文档
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
│   └── ci.ts                  # CI/CD 入口
├── .env.example               # 环境变量示例（本地开发用）
├── .gitlab-ci.yml             # GitLab CI/CD 配置
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

## 🛠️ 本地开发

如果你想在本地测试或开发此工具：

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

# AI 配置
AI_API_KEY=your-openai-api-key
AI_MODEL=gpt-4o
# AI_BASE_URL=https://api.deepseek.com  # 如果使用 DeepSeek

# 日志级别
LOG_LEVEL=info
```

### 编译项目

```bash
pnpm build
```

### 运行 Linter

```bash
pnpm lint
```

## 💡 提示

1. **性能优化**: 对于大型 MR，AI 审查可能需要较长时间，建议合理拆分 MR
2. **成本控制**: AI 调用会产生费用，建议监控 API 使用情况
3. **规范定制**: 可以根据团队需求修改 `docs/coding-standards.md`
4. **失败处理**: CI 配置中设置了 `allow_failure: true`，即使审查失败也不会阻塞 MR

## 🚀 Webhook 方式部署（推荐用于 Vercel）

除了 CI/CD 方式，你还可以通过 Webhook 方式部署，这样可以在 Vercel 等无服务器平台上运行。

### 部署到 Vercel

#### 1. 安装 Vercel CLI（可选）

```bash
npm i -g vercel
```

#### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名                | 说明                                                          | 是否必需 |
| --------------------- | ------------------------------------------------------------- | -------- |
| `GITLAB_URL`          | GitLab 服务器地址（如 `https://jihulab.com`）                 | ✅ 必需  |
| `GITLAB_TOKEN`        | GitLab Personal Access Token（需要 `api` 权限）               | ✅ 必需  |
| `AI_API_KEY`          | OpenAI 或 DeepSeek 的 API Key                                 | ✅ 必需  |
| `AI_MODEL`            | AI 模型名称（如 `gpt-4o` 或 `deepseek-chat`）                 | ✅ 必需  |
| `AI_BASE_URL`         | 自定义 AI API 地址（如 DeepSeek: `https://api.deepseek.com`） | ✅ 必需  |
| `WEBHOOK_SECRET`      | Webhook 密钥（可选，用于验证请求）                            | ✅ 必需  |
| `TARGET_BRANCHES`     | 目标分支列表，逗号分隔（如 `main,master`）                    | ❌ 可选  |
| `MAX_INLINE_COMMENTS` | 最大行内评论数（默认 10）                                     | ❌ 可选  |

#### 3. 部署到 Vercel

**方式 A: 通过 Vercel Dashboard**

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 导入你的 Git 仓库
4. 配置环境变量（如上）
5. 点击 "Deploy"

**方式 B: 通过 CLI**

```bash
vercel
```

#### 4. 配置 GitLab Webhook

1. 进入你的 GitLab 项目
2. 进入 **Settings > Webhooks**
3. 添加新的 Webhook：
   - **URL**: `https://your-project.vercel.app/api/webhook` 或 `https://your-project.vercel.app/webhook/gitlab`
   - **Trigger**: 勾选 "Merge request events"
   - **Secret token** (可选): 如果设置了 `WEBHOOK_SECRET`，在这里填写相同的值
4. 点击 "Add webhook"

#### 5. 测试 Webhook

创建一个新的 Merge Request，系统会自动触发代码审查。

### 本地开发 Webhook 服务器

如果你想在本地测试 webhook 服务器：

```bash
# 安装依赖
pnpm install

# 配置环境变量（创建 .env 文件）
cp .env.example .env

# 启动开发服务器
pnpm dev

# 服务器会在 http://localhost:3000 启动
# Webhook 端点: http://localhost:3000/webhook/gitlab
```

### Webhook vs CI/CD 方式对比

| 特性       | CI/CD 方式           | Webhook 方式          |
| ---------- | -------------------- | --------------------- |
| 部署复杂度 | 低（无需额外部署）   | 中（需要部署服务器）  |
| 响应速度   | 较慢（需要等待 CI）  | 快（实时响应）        |
| 成本       | 低（使用 GitLab CI） | 中（Vercel 免费额度） |
| 灵活性     | 低（受 CI 限制）     | 高（可自定义）        |
| 推荐场景   | 单项目使用           | 多项目共享            |

## 🔧 高级配置

### 自定义审查规则

编辑 `docs/coding-standards.md` 文件来自定义你的代码规范。AI 会根据这个文档来审查代码。

### 调整 CI 触发条件

默认情况下，AI 审查会在所有 Merge Request 上运行。你可以在 `.gitlab-ci.yml` 中调整触发条件：

```yaml
ai-code-review:
  # 只在特定分支的 MR 上运行
  only:
    refs:
      - merge_requests
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
```

### 使用不同的 Node.js 版本

在 `.gitlab-ci.yml` 中修改 `image` 字段：

```yaml
ai-code-review:
  image: node:20 # 使用 Node.js 20
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

---

**💡 提示**: 如果你觉得这个工具有用，别忘了给项目点个 Star ⭐️
