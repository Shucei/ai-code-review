import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { CodeReviewComment, DiffChange } from "../types";
import { logger } from "../utils/logger";

export interface MergeRequestInfo {
  title: string;
  description?: string;
  authorName: string;
  webUrl: string;
}

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
        max_tokens: 4096, // 适当调整以适应更复杂的输出
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
        return this.parseReviewResponse(content, changes);
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
    return `你是一个专业的代码审查专家，专注于代码质量审查和 Bug 检测。
你的任务是：
1. 根据提供的代码规范，审查代码变更，识别违反规范的代码
2. 代码可能存在潜在的bug，代码冗余、逻辑差及坏味道
3. 对于每个问题，指出具体的文件路径、行号、违反的原则和修改建议

代码规范：
${this.codingStandards}

输出要求：
- 使用 Markdown 格式输出
- 如果没有发现 Bug 或违反规范的问题，输出：未发现Bug
- 如果发现问题，使用以下格式：
  - 文件路径:行号 | 严重性 | 违反的原则 | 修改建议
- 严重性级别必须是以下之一（必须严格按照要求输出）：
  - "error": 严重的错误，如潜在的 bug、安全漏洞、会导致程序崩溃的问题、逻辑错误
  - "warning": 警告，如代码风格问题、性能问题、可维护性问题、可能的改进点
  - "info": 建议，如代码优化建议、可读性改进建议、最佳实践建议
- 每行一个问题，行号必须是具体的数字
- 文件路径必须完整
- 违反的问题要简洁明了
- 修改建议要具体可操作`;
  }

  /**
   * 构建审查提示词
   */
  private buildReviewPrompt(changes: DiffChange[]): string {
    // 构建代码差异信息
    const diffInfo = changes
      .map((change) => {
        return {
          new_path: change.newPath,
          diff: this.formatDiff(change),
        };
      })
      .filter((item) => item.diff); // 过滤掉空的 diff

    // 构建提示词
    const rule = this.codingStandards;

    const diffText = diffInfo
      .map((change) => `文件: ${change.new_path}\n差异:\n${change.diff}`)
      .join("\n\n");

    return `请检查以下代码差异（diff），按照给你提供的任务要求进行检查并输出结果：
    ${rule}
    输出格式：
      - 文件路径:行号 | 严重性 | 违反的原则 | 修改建议
    严重性级别说明（必须选择其中一个）：
      - "error": 严重的错误，如潜在的 bug、安全漏洞、会导致程序崩溃的问题
      - "warning": 警告，如代码风格问题、性能问题、可维护性问题
      - "info": 建议，如代码优化建议、可读性改进建议
    代码信息：
         代码差异：${diffText}
         请按照上述要求进行检查并输出结果。`;
  }

  /**
   * 格式化 diff 内容
   */
  private formatDiff(change: DiffChange): string {
    if (change.isDeleted) {
      return "";
    }

    // 优先使用原始 diff，如果没有则构建
    if (change.rawDiff) {
      return change.rawDiff;
    }

    // 构建完整的 diff 内容，包含上下文
    const lines: string[] = [];

    // 添加文件信息
    if (change.isNew) {
      lines.push(`--- /dev/null`);
      lines.push(`+++ ${change.newPath}`);
    } else if (change.isRenamed) {
      lines.push(`--- ${change.oldPath}`);
      lines.push(`+++ ${change.newPath}`);
    } else {
      lines.push(`--- ${change.oldPath}`);
      lines.push(`+++ ${change.newPath}`);
    }

    // 添加变更内容
    let currentLine = 1;
    let inHunk = false;

    change.changes.forEach((c) => {
      if (!inHunk) {
        // 开始新的 hunk
        lines.push(`@@ -${currentLine},0 +${currentLine},0 @@`);
        inHunk = true;
      }

      if (c.type === "add") {
        lines.push(`+${c.content}`);
        currentLine++;
      } else if (c.type === "delete") {
        lines.push(`-${c.content}`);
      } else {
        lines.push(` ${c.content}`);
        currentLine++;
      }
    });

    return lines.join("\n");
  }

  /**
   * 解析 AI 返回的审查结果（Markdown 格式）
   */
  private parseReviewResponse(response: string, changes: DiffChange[]): CodeReviewComment[] {
    try {
      // 检查是否没有发现问题
      if (response.includes("未发现Bug") || response.includes("未发现") || response.trim() === "") {
        return [];
      }

      const comments: CodeReviewComment[] = [];
      const lines = response.split("\n");

      // 创建文件路径映射，用于根据行号查找文件
      const fileMap = new Map<string, DiffChange>();
      changes.forEach((change) => {
        fileMap.set(change.newPath, change);
      });

      // 解析 Markdown 列表格式：- 文件路径:行号 | 严重性 | 违反的原则 | 修改建议
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("-") && !trimmed.startsWith("*")) {
          continue;
        }

        // 移除开头的 "- " 或 "-" 或 "* " 或 "*"
        const content = trimmed.replace(/^[-*]\s*/, "");

        // 解析格式：文件路径:行号 | 严重性 | 违反的原则 | 修改建议
        const parts = content.split("|").map((p) => p.trim());

        if (parts.length < 3) {
          // 兼容旧格式：文件路径:行号 | 违反的原则 | 修改建议（没有严重性）
          if (parts.length >= 2) {
            // 尝试解析旧格式
            const linePart = parts[0];
            const colonMatch = linePart.match(/^(.+?):(\d+)$/);
            if (colonMatch) {
              const filePath = colonMatch[1].trim();
              const lineNumber = parseInt(colonMatch[2], 10);
              const rule = parts[1] || "代码规范";
              const suggestion = parts[2] || "";

              if (filePath && lineNumber > 0 && !isNaN(lineNumber)) {
                comments.push({
                  file: filePath,
                  line: lineNumber,
                  message: `违反原则: ${rule}`,
                  severity: "error", // 旧格式默认为 error
                  rule: rule,
                  suggestion: suggestion,
                });
              }
            }
          }
          continue;
        }

        let filePath = "";
        let lineNumber = 0;
        const severityRaw = parts[1]?.toLowerCase().trim() || "error";
        const rule = parts[2] || "代码规范";
        const suggestion = parts[3] || "";

        // 验证严重性级别
        const severity = ["error", "warning", "info"].includes(severityRaw) ? severityRaw : "error";

        // 解析行号部分
        const linePart = parts[0];

        // 尝试多种格式解析
        // 格式1: 文件路径:行号
        const colonMatch = linePart.match(/^(.+?):(\d+)$/);
        if (colonMatch) {
          filePath = colonMatch[1].trim();
          lineNumber = parseInt(colonMatch[2], 10);
        } else {
          // 格式2: 只有行号
          const numberMatch = linePart.match(/(\d+)/);
          if (numberMatch) {
            lineNumber = parseInt(numberMatch[1], 10);

            // 尝试从所有变更文件中找到包含该行号的文件
            for (const [path, change] of fileMap.entries()) {
              const hasLine = change.changes.some((c) => c.lineNumber === lineNumber);
              if (hasLine) {
                filePath = path;
                break;
              }
            }

            // 如果还是找不到，使用第一个文件
            if (!filePath && changes.length > 0) {
              filePath = changes[0].newPath;
            }
          }
        }

        if (filePath && lineNumber > 0 && !isNaN(lineNumber)) {
          comments.push({
            file: filePath,
            line: lineNumber,
            message: `违反原则: ${rule}`,
            severity: severity as "error" | "warning" | "info",
            rule: rule,
            suggestion: suggestion,
          });
        }
      }

      return comments;
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
      return "代码审查通过，未发现违反规范的问题。✅ ";
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
