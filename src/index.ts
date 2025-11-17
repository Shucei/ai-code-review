import express, { Express, Request, Response } from "express";
import { config, validateConfig } from "./utils/config";
import { CodeChecker } from "./checker/code-checker";
import { GitLabMergeRequestEvent } from "./types";
import { logger } from "./utils/logger";

const app: Express = express();

// 中间件：解析 JSON 请求体
app.use(express.json());

// 健康检查端点
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Webhook 端点
app.post("/webhook/gitlab", async (req: Request, res: Response) => {
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

    // 异步处理，立即返回响应
    res.status(202).json({ message: "Webhook received, processing..." });

    // 在后台处理审查
    processWebhookEvent(event).catch((error) => {
      logger.error("处理 webhook 事件失败", { error, event });
    });
  } catch (error) {
    logger.error("Webhook 处理失败", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 处理 webhook 事件
 */
async function processWebhookEvent(event: GitLabMergeRequestEvent): Promise<void> {
  try {
    validateConfig();

    const codeChecker = new CodeChecker(
      config.gitlabUrl,
      config.gitlabToken,
      config.aiApiKey,
      config.aiModel,
      config.aiBaseURL
    );

    await codeChecker.handleMergeRequestEvent(event);
  } catch (error) {
    logger.error("处理 webhook 事件时发生错误", { error });
    throw error;
  }
}

// 启动服务器
if (require.main === module) {
  const port = config.port || 3000;
  app.listen(port, () => {
    logger.info(`Webhook 服务器启动在端口 ${port}`, {
      port,
      webhookEndpoint: `/webhook/gitlab`,
      healthEndpoint: `/health`,
    });
  });
}

export default app;
