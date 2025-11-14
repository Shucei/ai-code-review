import axios, { AxiosInstance } from "axios";
import { GitLabDiffFile, GitLabComment, DiffChange } from "../types";
import { logger } from "./logger";

export class GitLabClient {
  private readonly client: AxiosInstance;

  constructor(gitlabUrl: string, token: string) {
    this.client = axios.create({
      baseURL: `${gitlabUrl}/api/v4`,
      headers: {
        "PRIVATE-TOKEN": token,
      },
    });
  }

  /**
   * 获取 Merge Request 的变更文件列表
   */
  async getMergeRequestChanges(
    projectId: number,
    mergeRequestIid: number
  ): Promise<GitLabDiffFile[]> {
    try {
      const response = await this.client.get(
        `/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`
      );
      return response.data.changes || [];
    } catch (error) {
      logger.error("获取 MR 变更失败", { error, projectId, mergeRequestIid });
      throw error;
    }
  }

  /**
   * 获取 Merge Request 的详细信息
   */
  async getMergeRequest(projectId: number, mergeRequestIid: number) {
    try {
      const response = await this.client.get(
        `/projects/${projectId}/merge_requests/${mergeRequestIid}`
      );
      return response.data;
    } catch (error) {
      logger.error("获取 MR 详情失败", { error, projectId, mergeRequestIid });
      throw error;
    }
  }

  /**
   * 添加 Merge Request 评论
   */
  async addMergeRequestComment(
    projectId: number,
    mergeRequestIid: number,
    body: string
  ): Promise<void> {
    try {
      await this.client.post(`/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`, {
        body,
      });
      logger.info("成功添加 MR 评论", { projectId, mergeRequestIid });
    } catch (error) {
      logger.error("添加 MR 评论失败", { error, projectId, mergeRequestIid });
      throw error;
    }
  }

  /**
   * 添加行内评论（针对特定代码行）
   */
  async addInlineComment(
    projectId: number,
    mergeRequestIid: number,
    comment: GitLabComment
  ): Promise<void> {
    try {
      await this.client.post(
        `/projects/${projectId}/merge_requests/${mergeRequestIid}/discussions`,
        comment
      );
      logger.info("成功添加行内评论", { projectId, mergeRequestIid });
    } catch (error) {
      logger.error("添加行内评论失败", { error, projectId, mergeRequestIid });
      throw error;
    }
  }

  /**
   * 解析 diff 内容，提取变更信息
   */
  parseDiff(diffFile: GitLabDiffFile): DiffChange {
    const lines = diffFile.diff.split("\n");
    const changes: Array<{
      type: "add" | "delete" | "modify";
      lineNumber: number;
      content: string;
    }> = [];

    let currentLineNumber = 0;
    let inHunk = false;

    for (const line of lines) {
      // 解析 hunk 头部，例如: @@ -1,3 +1,4 @@
      if (line.startsWith("@@")) {
        const match = line.match(/\+(\d+)/);
        if (match) {
          currentLineNumber = parseInt(match[1], 10);
          inHunk = true;
        }
        continue;
      }

      if (!inHunk) {
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        changes.push({
          type: "add",
          lineNumber: currentLineNumber,
          content: line.substring(1),
        });
        currentLineNumber++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        changes.push({
          type: "delete",
          lineNumber: currentLineNumber,
          content: line.substring(1),
        });
      } else if (!line.startsWith("\\")) {
        // 上下文行
        currentLineNumber++;
      }
    }

    return {
      file: diffFile.new_path,
      oldPath: diffFile.old_path,
      newPath: diffFile.new_path,
      isNew: diffFile.new_file,
      isDeleted: diffFile.deleted_file,
      isRenamed: diffFile.renamed_file,
      changes,
    };
  }

  /**
   * 批量添加评论
   */
  async addBatchComments(
    projectId: number,
    mergeRequestIid: number,
    comments: Array<{
      file: string;
      line: number;
      message: string;
    }>
  ): Promise<void> {
    const mr = await this.getMergeRequest(projectId, mergeRequestIid);
    const baseSha = mr.diff_refs.base_sha;
    const headSha = mr.diff_refs.head_sha;
    const startSha = mr.diff_refs.start_sha;

    for (const comment of comments) {
      try {
        await this.addInlineComment(projectId, mergeRequestIid, {
          body: comment.message,
          position: {
            base_sha: baseSha,
            start_sha: startSha,
            head_sha: headSha,
            old_path: comment.file,
            new_path: comment.file,
            position_type: "text",
            new_line: comment.line,
          },
        });
      } catch (error) {
        logger.error("添加单个评论失败", { error, comment });
      }
    }
  }
}
