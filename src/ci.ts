import { CodeChecker } from "./checker/code-checker";
import { config, validateConfig } from "./utils/config";
import { logger } from "./utils/logger";

async function main() {
  logger.info("Starting AI Code Review in CI mode...");

  // 1. Validate configuration
  try {
    validateConfig();
    logger.info("Configuration validated successfully.");
  } catch (error) {
    logger.error("Configuration validation failed.", { error });
    process.exit(1);
  }

  // 2. Get project and MR info from GitLab CI environment variables
  const projectId = process.env.CI_PROJECT_ID;
  const mergeRequestIid = process.env.CI_MERGE_REQUEST_IID;
  const gitlabUrl = process.env.CI_SERVER_URL;

  if (!projectId || !mergeRequestIid || !gitlabUrl) {
    logger.error(
      "Missing required GitLab CI environment variables (CI_PROJECT_ID, CI_MERGE_REQUEST_IID, CI_SERVER_URL)."
    );
    logger.error("This script should be run within a GitLab CI job for a merge request.");
    // In a CI context for a merge request, these variables should always be present.
    // If they are not, it's a configuration issue, but we will exit gracefully.
    logger.info("Exiting gracefully. This may not be a merge request pipeline.");
    process.exit(0);
  }

  logger.info(`Reviewing MR !${mergeRequestIid} in project ${projectId}`);

  // 3. Initialize and run the code checker
  try {
    const codeChecker = new CodeChecker(
      gitlabUrl, // Use the CI server URL
      config.gitlabToken,
      config.aiApiKey,
      config.aiModel
    );

    const result = await codeChecker.reviewMergeRequest(Number(projectId), Number(mergeRequestIid));

    logger.info("Review completed successfully.", { summary: result.summary });
    process.exit(0);
  } catch (error) {
    logger.error("An error occurred during the review process.", { error });
    process.exit(1);
  }
}

// 简单测试一下

main();
