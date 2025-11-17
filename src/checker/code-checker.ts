import { GitLabClient } from "../utils/gitlab";
import { AIReviewer } from "../reviewer/ai-reviewer";
import { ReviewResult, GitLabMergeRequestEvent } from "../types";
import { logger } from "../utils/logger";
import { config } from "../utils/config";

export class CodeChecker {
  private readonly gitlabClient: GitLabClient;
  private readonly aiReviewer: AIReviewer;
  private readonly targetBranches: string[];

  constructor(
    gitlabUrl: string,
    gitlabToken: string,
    aiApiKey: string,
    aiModel: string,
    baseURL: string
  ) {
    this.gitlabClient = new GitLabClient(gitlabUrl, gitlabToken);
    this.aiReviewer = new AIReviewer(aiApiKey, aiModel, baseURL);
    this.targetBranches = config.targetBranches || ["master", "main"];
  }

  /**
   * 处理 Merge Request 事件
   */
  async handleMergeRequestEvent(event: GitLabMergeRequestEvent): Promise<void> {
    const { object_attributes, project } = event;
    const action = object_attributes.action;
    const targetBranch = object_attributes.target_branch;

    // 只处理 open 和 update 事件
    if (action !== "open" && action !== "update") {
      logger.info(`跳过 MR 事件: ${action}`, {
        projectId: project.id,
        mergeRequestIid: object_attributes.iid,
      });
      return;
    }

    // 只处理合并到目标分支的 MR（默认为 master 或 main）
    if (!this.targetBranches.includes(targetBranch)) {
      logger.info(`跳过 MR: 目标分支 ${targetBranch} 不在审查列表中`, {
        projectId: project.id,
        mergeRequestIid: object_attributes.iid,
        targetBranch,
        allowedBranches: this.targetBranches,
      });
      return;
    }

    logger.info(`处理 MR ${action} 事件`, {
      projectId: project.id,
      mergeRequestIid: object_attributes.iid,
      title: object_attributes.title,
      sourceBranch: object_attributes.source_branch,
      targetBranch: object_attributes.target_branch,
    });

    await this.reviewMergeRequest(project.id, object_attributes.iid);
  }

  /**
   * 审查 Merge Request
   */
  async reviewMergeRequest(projectId: number, mergeRequestIid: number): Promise<ReviewResult> {
    try {
      // 1. 获取 MR 详细信息
      // const mrInfo = await this.gitlabClient.getMergeRequest(projectId, mergeRequestIid);

      // 2. 获取 MR 变更
      const diffFiles = await this.gitlabClient.getMergeRequestChanges(projectId, mergeRequestIid);

      logger.info(`获取到 ${diffFiles.length} 个变更文件`);

      // 3. 解析 diff
      const changes = diffFiles.map((file) => this.gitlabClient.parseDiff(file));

      // 4. AI 审查
      const comments = await this.aiReviewer.reviewChanges(changes);

      logger.info(`AI 审查完成，发现 ${comments.length} 个问题`);

      // 6. 发布审查结果
      await this.publishReviewResults(projectId, mergeRequestIid, comments);

      // 7. 返回结果统计
      const result: ReviewResult = {
        projectId,
        mergeRequestIid,
        comments,
        summary: {
          totalIssues: comments.length,
          errors: comments.filter((c) => c.severity === "error").length,
          warnings: comments.filter((c) => c.severity === "warning").length,
          infos: comments.filter((c) => c.severity === "info").length,
        },
      };

      logger.info("MR 审查完成", result.summary);

      return result;
    } catch (error) {
      logger.error("审查 MR 失败", { error, projectId, mergeRequestIid });
      throw error;
    }
  }

  /**
   * 发布审查结果到 GitLab
   */
  private async publishReviewResults(
    projectId: number,
    mergeRequestIid: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: any[]
  ): Promise<void> {
    // 1. 生成总体评论
    const summaryComment = this.aiReviewer.formatCommentsAsMarkdown(comments);
    await this.gitlabClient.addMergeRequestComment(projectId, mergeRequestIid, summaryComment);

    // 2. 添加行内评论（只针对错误级别）
    const errorComments = comments.filter((c) => c.severity === "error").slice(0, 10); // 最多添加 10 条行内评论，避免刷屏

    if (errorComments.length > 0) {
      await this.gitlabClient.addBatchComments(
        projectId,
        mergeRequestIid,
        errorComments.map((c) => ({
          file: c.file,
          line: c.line,
          message: `❌ **${c.rule || "代码规范"}**\n\n${c.message}\n\n${
            c.suggestion ? `💡 **建议**: ${c.suggestion}` : ""
          }`,
        }))
      );
    }

    logger.info("审查结果已发布", {
      projectId,
      mergeRequestIid,
      totalComments: comments.length,
      inlineComments: errorComments.length,
    });
  }
}
