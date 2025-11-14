const { GitLabService } = require('./dist/utils/gitlab');

async function testGitLabAPI () {
  const gitlabService = new GitLabService();

  try {
    console.log('🔍 测试 GitLab API 连接...');

    // 测试获取项目信息
    console.log('\n1. 测试获取项目信息...');
    const projects = await gitlabService.getProjects();
    console.log('✅ 成功获取项目列表，共', projects.length, '个项目');

    if (projects.length > 0) {
      const project = projects[0];
      console.log('项目名称:', project.name);
      console.log('项目 ID:', project.id);

      // 测试获取合并请求
      console.log('\n2. 测试获取合并请求...');
      const mergeRequests = await gitlabService.getMergeRequests(project.id);
      console.log('✅ 成功获取合并请求列表，共', mergeRequests.length, '个');

      if (mergeRequests.length > 0) {
        const mr = mergeRequests[0];
        console.log('MR 标题:', mr.title);
        console.log('MR ID:', mr.id);

        // 测试获取 diff
        console.log('\n3. 测试获取代码差异...');
        const diff = await gitlabService.getMergeRequestDiff(project.id, mr.iid);
        console.log('✅ 成功获取代码差异，共', diff.length, '个文件变更');

        if (diff.length > 0) {
          console.log('变更文件示例:');
          diff.slice(0, 3).forEach((change, index) => {
            console.log(`  ${index + 1}. ${change.file}`);
          });
        }

        // 测试发布评论
        console.log('\n4. 测试发布评论...');
        const comment = {
          body: '🤖 AI 代码审查测试评论\n\n这是一个测试评论，用于验证 GitLab API 功能。',
          position: {
            base_sha: mr.diff_refs.base_sha,
            head_sha: mr.diff_refs.head_sha,
            start_sha: mr.diff_refs.start_sha,
            old_path: diff[0]?.file || 'test.ts',
            new_path: diff[0]?.file || 'test.ts',
            position_type: 'text',
            new_line: 1
          }
        };

        await gitlabService.createMergeRequestNote(project.id, mr.iid, comment);
        console.log('✅ 成功发布测试评论');
      } else {
        console.log('ℹ️ 该项目没有合并请求，跳过 diff 和评论测试');
      }
    } else {
      console.log('ℹ️ 没有找到项目，跳过后续测试');
    }

  } catch (error) {
    console.error('❌ GitLab API 测试失败:', error.message);

    if (error.response) {
      console.error('HTTP 状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
    }

    // 提供解决建议
    console.log('\n💡 解决建议:');
    console.log('1. 检查 GITLAB_TOKEN 是否正确');
    console.log('2. 确认 Token 权限包含: api, read_api, read_repository');
    console.log('3. 检查 GITLAB_URL 是否正确');
    console.log('4. 确认网络连接正常');
  }
}

// 检查环境变量
function checkEnvironment () {
  const required = ['GITLAB_URL', 'GITLAB_TOKEN'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 缺少环境变量:', missing.join(', '));
    console.log('请检查 .env 文件是否配置正确');
    process.exit(1);
  }

  console.log('✅ 环境变量检查通过');
}

async function main () {
  console.log('🚀 开始 GitLab API 测试\n');

  // 检查环境变量
  checkEnvironment();

  // 运行测试
  await testGitLabAPI();

  console.log('\n✨ 测试完成');
}

main().catch(console.error);
