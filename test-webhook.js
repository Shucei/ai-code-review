const axios = require('axios');

async function testWebhook () {
  const webhookData = {
    object_kind: 'merge_request',
    event_type: 'merge_request',
    user: {
      id: 1,
      name: 'Test User',
      username: 'testuser'
    },
    project: {
      id: 123,
      name: 'test-project',
      web_url: 'https://gitlab.com/test/test-project'
    },
    object_attributes: {
      id: 456,
      iid: 1,
      title: 'Test Merge Request',
      description: 'This is a test MR',
      state: 'opened',
      merge_status: 'can_be_merged',
      url: 'https://gitlab.com/test/test-project/-/merge_requests/1',
      source_branch: 'feature-branch',
      target_branch: 'main',
      last_commit: {
        id: 'abc123',
        message: 'Add new feature',
        url: 'https://gitlab.com/test/test-project/-/commit/abc123'
      }
    },
    changes: {
      state: {
        previous: 'closed',
        current: 'opened'
      }
    }
  };

  try {
    console.log('发送 webhook 测试请求...');
    const response = await axios.post('http://localhost:3000/webhook/gitlab', webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Gitlab-Event': 'Merge Request Hook'
      }
    });

    console.log('✅ Webhook 测试成功:', response.status);
    console.log('响应:', response.data);
  } catch (error) {
    console.error('❌ Webhook 测试失败:', error.response?.data || error.message);
  }
}

testWebhook();
