import express, { Request, Response, NextFunction } from "express";
import { CodeChecker } from "./checker/code-checker";
import { config, validateConfig } from "./utils/config";
import { logger } from "./utils/logger";
import { GitLabMergeRequestEvent } from "./types";

// 验证配置
try {
  validateConfig();
  logger.info("配置验证通过");
} catch (error) {
  logger.error("配置验证失败", { error });
  process.exit(1);
}

const app = express();
app.use(express.json());

// 创建 CodeChecker 实例
const codeChecker = new CodeChecker(
  config.gitlabUrl,
  config.gitlabToken,
  config.aiApiKey,
  config.aiModel
);

/**
 * 健康检查端点
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ai-code-review",
  });
});

/**
 * GitLab Webhook 端点
 */
app.post("/webhook/gitlab", async (req: Request, res: Response) => {
  try {
    const event = req.body as GitLabMergeRequestEvent;
    const eventType = req.headers["x-gitlab-event"];

    logger.info("收到 GitLab Webhook 事件", {
      eventType,
      objectKind: event.object_kind,
      action: event.object_attributes?.action,
    });

    // 验证 webhook secret（如果配置了）
    if (config.webhookSecret) {
      const token = req.headers["x-gitlab-token"];
      if (token !== config.webhookSecret) {
        logger.warn("Webhook secret 验证失败");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    // 只处理 Merge Request 事件
    if (event.object_kind !== "merge_request") {
      logger.info("跳过非 MR 事件", { objectKind: event.object_kind });
      res.json({ message: "Event ignored" });
      return;
    }

    // 立即返回 200，避免 GitLab 超时
    res.json({ message: "Event received" });

    // 异步处理审查任务
    setImmediate(async () => {
      try {
        await codeChecker.handleMergeRequestEvent(event);
      } catch (error) {
        logger.error("处理 MR 事件失败", { error });
      }
    });
  } catch (error) {
    logger.error("Webhook 处理失败", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 手动触发审查端点（用于测试）
 */
app.post("/review", async (req: Request, res: Response) => {
  try {
    const { projectId, mergeRequestIid } = req.body;

    if (!projectId || !mergeRequestIid) {
      res.status(400).json({
        error: "Missing required parameters: projectId, mergeRequestIid",
      });
      return;
    }

    logger.info("手动触发审查", { projectId, mergeRequestIid });

    const result = await codeChecker.reviewMergeRequest(Number(projectId), Number(mergeRequestIid));

    res.json({
      message: "Review completed",
      result,
    });
  } catch (error) {
    logger.error("手动审查失败", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 错误处理中间件
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("未处理的错误", { error: err });
  res.status(500).json({ error: "Internal server error" });
});

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 AI Code Review 服务已启动`);
  logger.info(`📍 端口: ${PORT}`);
  logger.info(`🔗 GitLab URL: ${config.gitlabUrl}`);
  logger.info(`🤖 AI Model: ${config.aiModel}`);
  logger.info(`\n服务端点：`);
  logger.info(`  - GET  /health              健康检查`);
  logger.info(`  - POST /webhook/gitlab      GitLab Webhook`);
  logger.info(`  - POST /review              手动触发审查`);
});

// 优雅关闭
process.on("SIGTERM", () => {
  logger.info("收到 SIGTERM 信号，正在关闭服务...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("收到 SIGINT 信号，正在关闭服务...");
  process.exit(0);
});
