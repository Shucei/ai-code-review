# AI 代码审查结果示例

## 表格格式输出

当 AI 审查代码时，会在 GitLab 的 Merge Request 中生成如下格式的评论：

```markdown
## 🤖 AI Code Review 结果

总计发现 5 个问题：

- ❌ 错误: 2
- ⚠️ 警告: 2
- ℹ️ 建议: 1

| 文件路径                       | 行号 | 问题类型 | 问题描述                                   | 修改建议                                                    |
| ------------------------------ | ---- | -------- | ------------------------------------------ | ----------------------------------------------------------- |
| src/components/UserProfile.tsx | 15   | ❌ 错误  | 使用了 any 类型，违反类型安全规范          | 使用具体的类型定义，如 `User: { id: number; name: string }` |
| src/utils/api.ts               | 23   | ❌ 错误  | 缺少错误处理，可能导致未捕获的异常         | 添加 try-catch 块或使用 .catch() 处理 Promise 错误          |
| src/hooks/useAuth.ts           | 8    | ⚠️ 警告  | useEffect 依赖数组不完整，可能导致无限循环 | 将 `user` 添加到依赖数组中：`[user, setUser]`               |
| src/components/Button.tsx      | 12   | ⚠️ 警告  | 函数参数过多，建议重构                     | 将相关参数合并为对象参数：`{ variant, size, disabled }`     |
| src/utils/helpers.ts           | 5    | ℹ️ 建议  | 函数名不够描述性，建议使用更清晰的命名     | 将 `process` 重命名为 `processUserData` 或 `validateInput`  |
```

## 功能特点

### 1. 仅在新建合并请求时触发

- 系统只会在 GitLab 发送 `open` 或 `update` 事件的 webhook 时进行代码审查
- 避免不必要的审查，提高效率

### 2. AI 审查 Git diff

- 自动获取 Merge Request 的代码变更
- 解析 diff 文件，提取新增和修改的代码
- 使用 AI 模型进行智能审查

### 3. 表格格式输出

- 清晰的表格展示所有问题
- 包含文件路径、行号、问题类型、问题描述和修改建议
- 按严重程度排序：错误 > 警告 > 建议

### 4. 行内评论

- 对于错误级别的问题，会在具体代码行添加行内评论
- 最多添加 10 条行内评论，避免刷屏
- 行内评论包含问题描述和修改建议

## 使用流程

1. **创建 Merge Request**

   ```bash
   git push origin feature-branch
   # 在 GitLab 中创建 Merge Request
   ```

2. **自动触发审查**

   - GitLab 发送 webhook 到代码审查服务
   - 服务接收 `open` 事件
   - 开始 AI 代码审查

3. **生成审查结果**

   - AI 分析代码变更
   - 生成表格格式的审查报告
   - 发布到 Merge Request 评论

4. **查看结果**
   - 在 Merge Request 页面查看总体评论
   - 点击具体行号查看行内评论
   - 根据建议修改代码

## 配置要求

### 环境变量

```env
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your_gitlab_token
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o
```

### GitLab Webhook 配置

1. 进入项目设置 → Integrations
2. 添加 Webhook URL: `https://your-domain.com/webhook/gitlab`
3. 选择触发事件：Merge request events
4. 保存配置

## 支持的代码类型

- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)
- Vue (.vue)
- CSS (.css, .less, .scss, .sass)

## 审查规则

### 错误级别 (❌)

- 使用 `any` 类型
- 缺少错误处理
- 安全漏洞
- 语法错误

### 警告级别 (⚠️)

- React Hooks 依赖问题
- 函数参数过多
- 代码复杂度高
- 性能问题

### 建议级别 (ℹ️)

- 命名不规范
- 代码风格问题
- 可读性改进
- 最佳实践建议

## 自定义配置

可以在 `src/reviewer/ai-reviewer.ts` 中自定义：

1. **审查规则**: 修改 `buildSystemPrompt()` 方法
2. **文件类型**: 修改 `isCodeFile()` 方法
3. **批量大小**: 修改 `BATCH_SIZE` 常量
4. **输出格式**: 修改 `formatCommentsAsMarkdown()` 方法

## 性能优化

- 批量处理文件（每次最多 5 个）
- 过滤非代码文件
- 限制行内评论数量
- 缓存代码规范文档

## 故障排除

### 常见问题

1. **Webhook 未触发**

   - 检查 GitLab webhook 配置
   - 确认服务 URL 可访问
   - 查看服务日志

2. **AI 审查失败**

   - 检查 API 密钥是否有效
   - 确认网络连接正常
   - 查看错误日志

3. **评论格式错误**
   - 检查 AI 返回的 JSON 格式
   - 确认解析逻辑正确
   - 查看解析错误日志

### 日志查看

```bash
# 查看服务日志
docker logs ai-code-review

# 查看详细日志
tail -f logs/app.log
```

## 总结

这个 AI 代码审查系统提供了：

✅ **自动化审查**: 仅在新建合并请求时触发  
✅ **智能分析**: AI 审查 Git diff 变更  
✅ **表格输出**: 清晰的表格格式展示问题  
✅ **精确定位**: 文件路径 + 行号 + 修改建议  
✅ **分级处理**: 错误、警告、建议三个级别  
✅ **行内评论**: 具体代码行的详细反馈

通过这个系统，开发团队可以获得高质量的代码审查反馈，提高代码质量和开发效率。
