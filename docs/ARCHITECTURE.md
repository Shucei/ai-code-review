# 系统架构文档

## 系统概览

AI Code Review 是一个基于 Node.js + TypeScript + OpenAI GPT 的自动化代码审查系统，专门针对 GitLab Merge Request 进行代码规范检查。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         GitLab                               │
│  ┌──────────────┐         ┌─────────────┐                   │
│  │ Merge Request│ ───────▶│   Webhook   │                   │
│  └──────────────┘         └──────┬──────┘                   │
└────────────────────────────────────┼───────────────────────┘
                                     │ HTTP POST
                                     │ (MR Event)
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Code Review Service                     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Express Server                         │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   /health   │  │/webhook/     │  │   /review    │  │  │
│  │  │             │  │  gitlab      │  │   (manual)   │  │  │
│  │  └─────────────┘  └──────┬───────┘  └──────────────┘  │  │
│  └─────────────────────────┼────────────────────────────┘  │
│                             │                                │
│                             ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Code Checker                             │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ 1. 验证事件类型 (open/update)                    │  │  │
│  │  │ 2. 获取 MR 变更文件                             │  │  │
│  │  │ 3. 解析 diff                                    │  │  │
│  │  │ 4. 调用 AI Reviewer                             │  │  │
│  │  │ 5. 发布审查结果                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────┬──────────────────────────┬─────────────────┘  │
│              │                          │                    │
│              ▼                          ▼                    │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │  GitLab Client      │    │     AI Reviewer            │  │
│  │                     │    │                            │  │
│  │ • 获取 MR Changes   │    │ • 加载代码规范文档          │  │
│  │ • 解析 Diff         │    │ • 构建提示词               │  │
│  │ • 添加评论          │    │ • 调用 OpenAI API         │  │
│  │ • 添加行内评论      │    │ • 解析审查结果             │  │
│  └──────┬──────────────┘    │ • 格式化 Markdown          │  │
│         │                   └────────┬───────────────────┘  │
│         │                            │                      │
└─────────┼────────────────────────────┼──────────────────────┘
          │                            │
          │                            │
          ▼                            ▼
┌─────────────────┐          ┌──────────────────┐
│  GitLab API     │          │  OpenAI API      │
│  (REST API)     │          │  (GPT)           │
└─────────────────┘          └──────────────────┘
```

## 核心组件

### 1. Express Server (`src/index.ts`)

主服务器，负责：

- 接收 GitLab Webhook 事件
- 提供健康检查端点
- 提供手动触发审查端点
- 错误处理和日志记录

**端点**:

- `GET /health` - 健康检查
- `POST /webhook/gitlab` - GitLab Webhook 接收器
- `POST /review` - 手动触发审查

### 2. Code Checker (`src/checker/code-checker.ts`)

代码检查协调器，负责：

- 处理 MR 事件
- 协调 GitLab 客户端和 AI Reviewer
- 发布审查结果

**工作流程**:

```typescript
handleMergeRequestEvent()
  ↓
验证事件类型 (open/update)
  ↓
reviewMergeRequest()
  ↓
获取 MR 变更 (GitLab Client)
  ↓
解析 Diff
  ↓
AI 审查 (AI Reviewer)
  ↓
发布结果到 GitLab
```

### 3. GitLab Client (`src/utils/gitlab.ts`)

GitLab API 客户端，负责：

- 获取 Merge Request 信息
- 获取代码变更 (diff)
- 解析 diff 内容
- 添加总体评论
- 添加行内评论

**主要方法**:

- `getMergeRequestChanges()` - 获取 MR 变更
- `getMergeRequest()` - 获取 MR 详情
- `addMergeRequestComment()` - 添加总体评论
- `addInlineComment()` - 添加行内评论
- `parseDiff()` - 解析 diff

### 4. AI Reviewer (`src/reviewer/ai-reviewer.ts`)

AI 代码审查器，负责：

- 加载代码规范文档
- 构建审查提示词
- 调用 OpenAI API
- 解析 AI 返回结果
- 格式化评论为 Markdown

**主要方法**:

- `reviewChanges()` - 审查代码变更
- `reviewBatch()` - 批量审查文件
- `buildReviewPrompt()` - 构建提示词
- `parseReviewResponse()` - 解析 AI 响应
- `formatCommentsAsMarkdown()` - 格式化评论

## 数据流

### 1. Webhook 触发流程

```
GitLab MR 创建/更新
  ↓
GitLab 发送 Webhook
  ↓
Express 接收 POST /webhook/gitlab
  ↓
验证 Webhook Secret (可选)
  ↓
验证事件类型 (merge_request)
  ↓
返回 200 OK (立即响应)
  ↓
异步处理审查任务
  ↓
Code Checker 开始工作
```

### 2. 代码审查流程

```
Code Checker.reviewMergeRequest()
  ↓
GitLab Client.getMergeRequestChanges()
  └─▶ GET /api/v4/projects/:id/merge_requests/:iid/changes
      返回 diff 数据
  ↓
解析每个文件的 diff
  └─▶ 提取新增/修改的代码行
  ↓
AI Reviewer.reviewChanges()
  ↓
分批处理文件 (每批最多 5 个)
  ↓
对每一批：
  ├─ buildReviewPrompt() - 构建提示词
  ├─ 调用 OpenAI API
  │   └─▶ POST https://api.openai.com/v1/chat/completions
  │       包含：代码规范 + 代码变更
  ├─ parseReviewResponse() - 解析 JSON 结果
  └─ 返回审查意见列表
  ↓
合并所有批次的结果
  ↓
Code Checker.publishReviewResults()
  ↓
GitLab Client.addMergeRequestComment()
  └─▶ POST /api/v4/projects/:id/merge_requests/:iid/notes
      发布总体评论
  ↓
GitLab Client.addBatchComments()
  └─▶ POST /api/v4/projects/:id/merge_requests/:iid/discussions
      发布行内评论 (仅错误级别)
  ↓
完成
```

## 技术栈

### 后端框架

- **Node.js**: 运行时环境
- **TypeScript**: 编程语言
- **Express**: Web 框架

### AI 服务

- **OpenAI GPT-4o**: 代码审查 AI

### GitLab 集成

- **GitLab REST API v4**: 获取 MR 数据、发布评论
- **GitLab Webhooks**: 接收 MR 事件

### 工具库

- **axios**: HTTP 客户端
- **winston**: 日志管理
- **dotenv**: 环境变量管理

## 配置管理

### 环境变量 (`src/utils/config.ts`)

```typescript
{
  gitlabUrl: string;       // GitLab 实例 URL
  gitlabToken: string;     // GitLab Personal Access Token
  webhookSecret?: string;  // Webhook 验证密钥
  aiApiKey: string;        // OpenAI API Key
  aiModel: string;         // AI 模型名称
  port: number;            // 服务器端口
  logLevel: string;        // 日志级别
}
```

## 错误处理

### 日志级别

- **error**: 错误和异常
- **warn**: 警告信息
- **info**: 一般信息
- **debug**: 调试信息

### 日志文件

- `logs/error.log` - 仅错误
- `logs/combined.log` - 所有日志

### 错误恢复策略

1. **Webhook 处理失败**: 记录错误日志，不影响其他请求
2. **GitLab API 失败**: 抛出异常，记录详细错误
3. **AI API 失败**: 抛出异常，记录详细错误
4. **评论发布失败**: 记录错误，继续处理其他评论

## 性能优化

### 1. 批处理

- AI 审查按批次处理（每批 5 个文件）
- 避免单次请求过大，减少 token 消耗

### 2. 异步处理

- Webhook 立即返回 200，异步处理审查任务
- 避免 GitLab Webhook 超时

### 3. 文件过滤

- 只审查代码文件（.ts, .tsx, .js, .jsx, .vue, .css, .less 等）
- 跳过删除的文件
- 跳过二进制文件

### 4. 行内评论限制

- 最多添加 10 条行内评论
- 仅对错误级别问题添加行内评论

## 安全考虑

### 1. Webhook 验证

- 使用 `X-Gitlab-Token` 验证 Webhook 来源
- 配置 `WEBHOOK_SECRET` 环境变量

### 2. Token 安全

- GitLab Token 存储在环境变量中
- 不记录 Token 到日志
- Token 只授予必要的权限

### 3. API 限流

- 监控 GitLab API 调用频率
- 监控 OpenAI API 使用量

### 4. 输入验证

- 验证 Webhook 事件格式
- 验证 MR 参数

## 扩展性

### 支持更多平台

可以添加新的 Git 平台支持（GitHub、Bitbucket）：

1. 创建对应的客户端类（类似 `GitLabClient`）
2. 实现统一的接口
3. 添加对应的 Webhook 处理器

### 自定义规范

可以通过修改 `docs/coding-standards.md` 来自定义代码规范。

### 插件系统

未来可以考虑添加插件系统，支持：

- 自定义检查器
- 自定义报告格式
- 自定义通知方式

## 监控指标

建议监控以下指标：

### 业务指标

- MR 审查数量
- 发现的问题数量
- 问题类型分布
- 平均审查时间

### 技术指标

- API 调用次数
- API 响应时间
- 错误率
- Token 使用量

### 资源指标

- CPU 使用率
- 内存使用量
- 网络流量

## 部署架构

### 推荐部署方案

```
┌─────────────────┐
│   Nginx/Caddy   │ (反向代理 + HTTPS)
│   :80/:443      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Code Review │ (PM2/Docker/Systemd)
│     :3000       │
└────────┬────────┘
         │
         ├─────────▶ GitLab API
         │
         └─────────▶ OpenAI API
```

### 高可用部署

```
           ┌──────────────┐
           │ Load Balancer│
           └───────┬──────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
   ┌──────┐    ┌──────┐    ┌──────┐
   │ App 1│    │ App 2│    │ App 3│
   └──────┘    └──────┘    └──────┘
```

## 总结

AI Code Review 系统采用模块化设计，各组件职责清晰：

- **Express Server**: 接收请求，路由分发
- **Code Checker**: 业务流程编排
- **GitLab Client**: GitLab API 封装
- **AI Reviewer**: AI 审查逻辑

这种架构保证了系统的可维护性、可扩展性和可测试性。
