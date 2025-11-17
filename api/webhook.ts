import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config, validateConfig } from "../src/utils/config";
import { CodeChecker } from "../src/checker/code-checker";
import { GitLabMergeRequestEvent } from "../src/types";
import { logger } from "../src/utils/logger";

/**
 * Vercel 无服务器函数：处理 GitLab Webhook
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 只允许 POST 请求
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // 验证 webhook secret（如果配置了）
    if (config.webhookSecret) {
      const token = req.headers["x-gitlab-token"] as string;
      if (token !== config.webhookSecret) {
        logger.warn("Webhook secret 验证失败", {
          provided: token ? "已提供" : "未提供",
        });
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const event = req.body as GitLabMergeRequestEvent;

    // 验证事件类型
    if (event.object_kind !== "merge_request") {
      logger.info("跳过非 MR 事件", { object_kind: event.object_kind });
      res.status(200).json({ message: "Event ignored" });
      return;
    }

    logger.info("收到 GitLab Merge Request Webhook", {
      projectId: event.project.id,
      mergeRequestIid: event.object_attributes.iid,
      action: event.object_attributes.action,
    });

    // 验证配置
    validateConfig();

    // 创建 CodeChecker 实例
    const codeChecker = new CodeChecker(
      config.gitlabUrl,
      config.gitlabToken,
      config.aiApiKey,
      config.aiModel,
      config.aiBaseURL
    );

    // 处理 MR 事件
    await codeChecker.handleMergeRequestEvent(event);

    // 返回成功响应
    res.status(200).json({
      message: "Webhook processed successfully",
      projectId: event.project.id,
      mergeRequestIid: event.object_attributes.iid,
    });
  } catch (error) {
    logger.error("处理 webhook 失败", { error });
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
