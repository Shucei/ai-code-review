require('dotenv').config();
const { AIReviewer } = require('./dist/reviewer/ai-reviewer');

async function testAIReview () {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || 'demo_key';
  const model = process.env.AI_MODEL || 'gpt-4o';
  const baseURL = process.env.AI_BASE_URL || 'https://api.aicodemirror.com/api/claudecode';

  const reviewer = new AIReviewer(apiKey, model, baseURL);

  // 模拟代码变更 - 故意包含一些违反规范的代码
  const mockChanges = [
    {
      file: 'src/components/Test.tsx',
      oldPath: 'src/components/Test.tsx',
      newPath: 'src/components/Test.tsx',
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      changes: [
        {
          type: 'add',
          lineNumber: 1,
          content: `
import React from 'react';

// 违反规范：使用 any 类型
const data: any = { name: 'test' };

// 违反规范：函数参数没有类型
function process(input) {
  return input;
}

// 违反规范：组件没有明确的 Props 类型
const TestComponent = ({ name }) => {
  // 违反规范：useEffect 依赖数组不完整
  React.useEffect(() => {
    console.log('Component mounted');
  }, []);

  return (
    <div>
      <h1>{name}</h1>
      <button onClick={() => console.log('clicked')}>
        Click me
      </button>
    </div>
  );
};

export default TestComponent;
          `
        }
      ]
    },
    {
      file: 'src/utils/api.ts',
      oldPath: 'src/utils/api.ts',
      newPath: 'src/utils/api.ts',
      isNew: true,
      isDeleted: false,
      isRenamed: false,
      changes: [
        {
          type: 'add',
          lineNumber: 1,
          content: `
// 违反规范：缺少错误处理
async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}

// 违反规范：使用 any 类型
function processResponse(response: any) {
  return response.data;
}

export { fetchData, processResponse };
          `
        }
      ]
    }
  ];

  try {

    const comments = await reviewer.reviewChanges(mockChanges);

    console.log('\n📊 审查完成，发现', comments.length, '个问题');

    if (comments.length > 0) {
      console.log('\n📋 审查结果:');
      console.log(reviewer.formatCommentsAsMarkdown(comments));
    } else {
      console.log('✅ 代码审查通过，未发现违反规范的问题。');
    }
  } catch (error) {
    console.error('❌ AI 审查失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 检查环境变量
function checkEnvironment () {
  const required = ['AI_API_KEY', 'GITLAB_URL', 'GITLAB_TOKEN'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 缺少环境变量:', missing.join(', '));
    console.log('请检查 .env 文件是否配置正确');
    process.exit(1);
  }

  console.log('✅ 环境变量检查通过');
}

async function main () {
  console.log('🚀 开始 AI 代码审查测试\n');

  // 检查环境变量
  checkEnvironment();

  // 运行测试
  await testAIReview();

  console.log('\n✨ 测试完成');
}

main().catch(console.error);
