import { config, validateConfig } from "./utils/config";
import { CodeChecker } from "./checker/code-checker";
import { logger } from "./utils/logger";

async function main() {
  logger.info("正在以 CI 模式启动 AI 代码审查...");

  try {
    validateConfig();
  } catch (error) {
    logger.error("配置验证失败。", { error });
    process.exit(1);
  }

  // 2. 从 GitLab CI 环境变量中获取项目和合并请求信息
  const projectId = process.env.CI_PROJECT_ID;
  const mergeRequestIid = process.env.CI_MERGE_REQUEST_IID;
  const gitlabUrl = process.env.CI_SERVER_URL;

  if (!projectId || !mergeRequestIid || !gitlabUrl) {
    logger.error(
      "缺少必要的 GitLab CI 环境变量 (CI_PROJECT_ID, CI_MERGE_REQUEST_IID, CI_SERVER_URL)。"
    );

    process.exit(0);
  }

  logger.info(`正在审查项目 ${projectId} 中的合并请求 !${mergeRequestIid}`);

  // 3. 初始化并运行代码检查器
  try {
    const codeChecker = new CodeChecker(
      gitlabUrl, // 使用 CI 服务器 URL
      config.gitlabToken,
      config.aiApiKey,
      config.aiModel,
      config.aiBaseURL
    );

    const result = await codeChecker.reviewMergeRequest(Number(projectId), Number(mergeRequestIid));

    logger.info("审查成功完成。", { summary: result.summary });
    process.exit(0);
  } catch (error) {
    logger.error("在审查过程中发生错误。", { error });
    process.exit(1);
  }
}

main();
