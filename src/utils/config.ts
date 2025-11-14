import dotenv from "dotenv";
import { Config } from "../types";
import { logger } from "./logger";

dotenv.config();

const GITLAB_URL = process.env.CI_SERVER_URL || "https://jihulab.com";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const AI_API_KEY = process.env.AI_API_KEY || "sk-86ae4c04a8ca46c2b3794ead512877be";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o";
const PORT = parseInt(process.env.PORT || "3000", 10);
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const TARGET_BRANCHES = process.env.TARGET_BRANCHES
  ? process.env.TARGET_BRANCHES.split(",").map((b) => b.trim())
  : ["master", "main"];
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com";

export const config: Config = {
  gitlabUrl: GITLAB_URL,
  gitlabToken: GITLAB_TOKEN,
  webhookSecret: WEBHOOK_SECRET,
  aiApiKey: AI_API_KEY,
  aiModel: AI_MODEL,
  port: PORT,
  logLevel: LOG_LEVEL,
  targetBranches: TARGET_BRANCHES,
  aiBaseURL: AI_BASE_URL,
};

export function validateConfig(): void {
  const errors: string[] = [];

  logger.info(`配置信息: ${JSON.stringify(config)}`);
  if (!config.gitlabUrl) {
    errors.push("GITLAB_URL 是必需的");
  }

  if (!config.gitlabToken) {
    errors.push("GITLAB_TOKEN 是必需的");
  }

  if (!config.aiApiKey) {
    errors.push("AI_API_KEY 是必需的");
  }

  if (errors.length > 0) {
    throw new Error(`配置验证失败:\n${errors.join("\n")}`);
  }
}
