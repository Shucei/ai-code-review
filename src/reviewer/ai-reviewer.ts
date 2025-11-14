import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { CodeReviewComment, DiffChange } from "../types";
import { logger } from "../utils/logger";

export class AIReviewer {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly codingStandards: string;

  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new OpenAI({
      baseURL: baseURL,
      apiKey,
    });
    this.model = model;

    // 加载代码规范文档
    const standardsPath = join(__dirname, "../../docs/coding-standards.md");
    this.codingStandards = readFileSync(standardsPath, "utf-8");
  }

  /**
   * 审查代码变更
   */
  async reviewChanges(changes: DiffChange[]): Promise<CodeReviewComment[]> {
    const allComments: CodeReviewComment[] = [];

    // 过滤掉删除的文件和非代码文件
    const filesToReview = changes.filter(
      (change) => !change.isDeleted && this.isCodeFile(change.newPath)
    );

    if (filesToReview.length === 0) {
      logger.info("没有需要审查的代码文件");
      return [];
    }

    logger.info(`开始审查 ${filesToReview.length} 个文件`);

    // 批量审查文件（每次最多5个，避免 token 超限）
    const BATCH_SIZE = 5;
    for (let i = 0; i < filesToReview.length; i += BATCH_SIZE) {
      const batch = filesToReview.slice(i, i + BATCH_SIZE);
      const batchComments = await this.reviewBatch(batch);
      allComments.push(...batchComments);
    }

    return allComments;
  }

  /**
   * 批量审查文件
   */
  private async reviewBatch(changes: DiffChange[]): Promise<CodeReviewComment[]> {
    const prompt = this.buildReviewPrompt(changes);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 8192,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: this.buildSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return this.parseReviewResponse(content);
      }

      return [];
    } catch (error) {
      logger.error("AI 审查失败", { error });
      throw error;
    }
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(): string {
    return `你是一个专业的代码审查专家，专注于 TypeScript/React 项目的代码质量审查。

你的任务是：
1. 根据提供的代码规范文档，审查代码变更
2. 识别违反规范的代码
3. 提供具体的改进建议
4. 对于每个问题，指出具体的文件名、行号和违反的规则

代码规范文档：
${this.codingStandards}

审查重点：
- 命名规范（常量、函数、组件、类型）
- TypeScript 类型安全（禁止 any，正确的类型声明）
- React 最佳实践（Hooks 依赖、禁止内联样式）
- 代码质量（函数复杂度、参数数量）
- Import 规范（顺序、扩展名、别名）
- 代码安全（避免危险操作）
- 代码格式（引号、注释）

请以 JSON 格式返回审查结果，格式如下：
\`\`\`json
{
  "comments": [
    {
      "file": "文件路径",
      "line": 行号,
      "message": "问题描述",
      "severity": "error|warning|info",
      "rule": "违反的规则名称",
      "suggestion": "改进建议"
    }
  ]
}
\`\`\`

重要要求：
- 只返回真正违反规范的问题，不要过于严格
- 优先关注错误级别的问题
- 对于警告和建议，只标注最重要的
- 如果代码没有问题，返回空的 comments 数组
- 确保返回的 JSON 格式正确
- file 字段必须使用完整的文件路径
- line 字段必须是具体的行号
- message 字段要简洁明了地描述问题
- suggestion 字段要提供具体的修改建议`;
  }

  /**
   * 构建审查提示词
   */
  private buildReviewPrompt(changes: DiffChange[]): string {
    const fileChanges = changes
      .map((change) => {
        const addedLines = change.changes
          .filter((c) => c.type === "add")
          .map((c) => `${c.lineNumber}: ${c.content}`)
          .join("\n");

        return `
文件: ${change.newPath}
${change.isNew ? "(新文件)" : ""}
${change.isRenamed ? `(重命名自: ${change.oldPath})` : ""}

新增/修改的代码:
\`\`\`typescript
${addedLines}
\`\`\`
`;
      })
      .join("\n---\n");

    return `请审查以下代码变更，识别违反代码规范的问题：

${fileChanges}

请严格按照 JSON 格式返回审查结果。`;
  }

  /**
   * 解析 AI 返回的审查结果
   */
  private parseReviewResponse(response: string): CodeReviewComment[] {
    try {
      // 尝试提取 JSON 代码块
      const jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      const result = JSON.parse(jsonStr);

      if (!result.comments || !Array.isArray(result.comments)) {
        logger.warn("AI 返回的结果格式不正确", { response });
        return [];
      }

      return result.comments;
    } catch (error) {
      logger.error("解析 AI 审查结果失败", { error, response });
      return [];
    }
  }

  /**
   * 判断是否是代码文件
   */
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".vue",
      ".css",
      ".less",
      ".scss",
      ".sass",
    ];

    const ext = filePath.substring(filePath.lastIndexOf("."));
    return codeExtensions.includes(ext);
  }

  /**
   * 格式化评论为表格形式的 Markdown
   */
  formatCommentsAsMarkdown(comments: CodeReviewComment[]): string {
    if (comments.length === 0) {
      return "✅ 代码审查通过，未发现违反规范的问题。";
    }

    const errors = comments.filter((c) => c.severity === "error");
    const warnings = comments.filter((c) => c.severity === "warning");
    const infos = comments.filter((c) => c.severity === "info");

    let markdown = "## 🤖 AI Code Review 结果\n\n";
    markdown += `总计发现 ${comments.length} 个问题：`;
    markdown += `\n- ❌ 错误: ${errors.length}`;
    markdown += `\n- ⚠️  警告: ${warnings.length}`;
    markdown += `\n- ℹ️  建议: ${infos.length}\n\n`;

    // 创建表格
    markdown += "| 文件路径 | 行号 | 问题类型 | 问题描述 | 修改建议 |\n";
    markdown += "|---------|------|----------|----------|----------|\n";

    // 按严重程度排序：错误 > 警告 > 建议
    const sortedComments = [...errors, ...warnings, ...infos];

    sortedComments.forEach((comment) => {
      const severityIcon =
        comment.severity === "error" ? "❌" : comment.severity === "warning" ? "⚠️" : "ℹ️";
      const severityText =
        comment.severity === "error" ? "错误" : comment.severity === "warning" ? "警告" : "建议";

      // 转义表格中的特殊字符
      const file = comment.file.replace(/\|/g, "\\|");
      const message = comment.message.replace(/\|/g, "\\|");
      const suggestion = (comment.suggestion || "无").replace(/\|/g, "\\|");

      markdown += `| ${file} | ${comment.line} | ${severityIcon} ${severityText} | ${message} | ${suggestion} |\n`;
    });

    return markdown;
  }
}
