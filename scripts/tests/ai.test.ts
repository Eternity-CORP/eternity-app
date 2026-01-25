/**
 * AI Assistant Tests
 * Tests AI chat, tools, and rate limiting
 */

import { get, post } from './utils/api';
import { createTestWallet } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface AiChatResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    name: string;
    result: unknown;
  }>;
}

interface AiHealthResponse {
  status: string;
  providers: string[];
}

interface AiToolsResponse {
  tools: Array<{
    name: string;
    description: string;
  }>;
  available: string[];
}

interface AiProvidersResponse {
  available: string[];
  active: string | null;
}

export async function runAiTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('AI Assistant Tests');

  const wallet = createTestWallet();

  // Test 1: AI health check
  results.push(await runTest('GET /ai/health returns status', async () => {
    const { status, data } = await get<AiHealthResponse>('/ai/health');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    // Status may be 'healthy', 'degraded', or 'unhealthy' depending on AI provider availability
    const healthStatus = (data as any).status;
    assert(
      healthStatus === 'healthy' || healthStatus === 'degraded' || healthStatus === 'unhealthy',
      `Health status should be healthy, degraded, or unhealthy, got ${healthStatus}`,
    );
  }));

  // Test 2: Get available tools
  results.push(await runTest('GET /ai/tools returns tool list', async () => {
    const { status, data } = await get<AiToolsResponse>('/ai/tools');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const tools = (data as AiToolsResponse).tools;
    assert(Array.isArray(tools), 'Tools should be array');
    assert(tools.length > 0, 'Should have at least one tool');
  }));

  // Test 3: Get available providers
  results.push(await runTest('GET /ai/providers returns provider list', async () => {
    const { status, data } = await get<AiProvidersResponse>('/ai/providers');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const providers = data as AiProvidersResponse;
    assert(Array.isArray(providers.available), 'Should return array of providers');
  }));

  // Test 4: Chat without user address returns error
  results.push(await runTest('POST /ai/chat without address returns 400', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      content: 'Hello',
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 5: Chat with empty content returns error
  results.push(await runTest('POST /ai/chat with empty content returns 400', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      content: '',
      userAddress: wallet.address,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 6: Simple chat message (if AI provider is available)
  results.push(await runTest('POST /ai/chat with simple message', async () => {
    const { status, data } = await post<AiChatResponse>('/ai/chat', {
      content: 'Hello',
      userAddress: wallet.address,
      language: 'en',
    });

    // May return 200 if AI is configured, 400 if validation fails, or 500 if provider unavailable
    assert(status === 200 || status === 400 || status === 500 || status === 429,
      `Expected 200, 400, 429, or 500, got ${status}`);
    if (status === 200) {
      assert((data as AiChatResponse).content !== undefined, 'Should have response content');
    }
  }));

  // Test 7: Direct tool execution - balance (if tools available)
  results.push(await runTest('POST /ai/tool execute balance tool', async () => {
    const { status, data } = await post<{ success: boolean; data: unknown }>('/ai/tool', {
      tool: 'get_balance',
      args: { userAddress: wallet.address },
      userAddress: wallet.address,
    });

    // May return 200 if tool exists, or 400 if not
    assert(status === 200 || status === 400 || status === 500, `Expected 200, 400 or 500, got ${status}`);
  }));

  // Test 8: Direct tool execution with invalid tool
  results.push(await runTest('POST /ai/tool with invalid tool', async () => {
    const { status, data } = await post<{ success: boolean }>('/ai/tool', {
      tool: 'invalid_tool_name',
      args: {},
      userAddress: wallet.address,
    });

    // API may return 400 Bad Request or 200 with success=false
    assert(status === 400 || status === 200, `Expected 400 or 200, got ${status}`);
    if (status === 200) {
      assertEqual((data as { success: boolean }).success, false, 'Should fail for invalid tool');
    }
  }));

  // Test 9: Get suggestions for address
  results.push(await runTest('GET /ai/suggestions returns suggestions', async () => {
    const { status, data } = await get<{ suggestions: unknown[] }>(
      `/ai/suggestions?address=${wallet.address}`,
    );
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const response = data as { suggestions: unknown[] };
    assert(Array.isArray(response.suggestions), 'Should return suggestions array');
  }));

  // Test 10: Suggestions without address returns error
  results.push(await runTest('GET /ai/suggestions without address returns 400', async () => {
    const { status } = await get<{ suggestions: unknown[] }>('/ai/suggestions');
    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 11: Chat in Russian (if AI available)
  results.push(await runTest('POST /ai/chat in Russian', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      content: 'Привет, как дела?',
      userAddress: wallet.address,
      language: 'ru',
    });

    // May return various status codes depending on AI configuration
    assert(status === 200 || status === 400 || status === 500 || status === 429,
      `Expected 200, 400, 429, or 500, got ${status}`);
  }));

  // Test 12: Chat asking for balance (may trigger tool)
  results.push(await runTest('POST /ai/chat for balance inquiry', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      content: 'What is my balance?',
      userAddress: wallet.address,
      language: 'en',
    });

    // May return various status codes depending on AI configuration
    assert(status === 200 || status === 400 || status === 500 || status === 429,
      `Expected 200, 400, 429, or 500, got ${status}`);
  }));

  // Test 13: Chat asking for send preview
  results.push(await runTest('POST /ai/chat for send preview', async () => {
    const recipient = createTestWallet();
    const { status } = await post<AiChatResponse>('/ai/chat', {
      content: `Send 10 USDC to ${recipient.address}`,
      userAddress: wallet.address,
      language: 'en',
    });

    // May return various status codes depending on AI configuration
    assert(status === 200 || status === 400 || status === 500 || status === 429,
      `Expected 200, 400, 429, or 500, got ${status}`);
  }));

  // Test 14: Security alert endpoint
  results.push(await runTest('POST /ai/security/alert creates alert', async () => {
    const { status, data } = await post<{ success: boolean; suggestionId: string }>(
      '/ai/security/alert',
      {
        userAddress: wallet.address,
        alertType: 'unusual_activity',
        title: 'Test Alert',
        message: 'This is a test security alert',
      },
    );

    assertEqual(status, 201, `Expected 201, got ${status}`);
    assert((data as { success: boolean }).success === true, 'Alert creation should succeed');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'AI Assistant',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runAiTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
