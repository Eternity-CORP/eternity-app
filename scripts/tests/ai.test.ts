/**
 * AI Assistant Tests
 * Tests AI chat, tools, and rate limiting
 */

import { get, post } from './utils/api';
import { createTestWallet } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface AiChatResponse {
  success: boolean;
  data?: {
    message: string;
    toolCalls?: Array<{
      name: string;
      result: unknown;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface AiHealthResponse {
  status: string;
  providers: string[];
}

interface AiToolsResponse {
  success: boolean;
  data?: {
    tools: Array<{
      name: string;
      description: string;
    }>;
  };
}

export async function runAiTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('AI Assistant Tests');

  const wallet = createTestWallet();

  // Test 1: AI health check
  results.push(await runTest('GET /ai/health returns ok', async () => {
    const { status, data } = await get<AiHealthResponse>('/ai/health');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assertEqual((data as AiHealthResponse).status, 'ok', 'Health status not ok');
  }));

  // Test 2: Get available tools
  results.push(await runTest('GET /ai/tools returns tool list', async () => {
    const { status, data } = await get<AiToolsResponse>('/ai/tools');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as AiToolsResponse).success === true, 'Request failed');
    const tools = (data as AiToolsResponse).data?.tools;
    assert(Array.isArray(tools), 'Tools should be array');
    assert(tools!.length > 0, 'Should have at least one tool');
  }));

  // Test 3: Check rate limit
  results.push(await runTest('GET /ai/rate-limit returns limit info', async () => {
    const { status, data } = await get<{ success: boolean; data: { remaining: number } }>(
      `/ai/rate-limit?address=${wallet.address}`
    );
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert(typeof (data as any).data?.remaining === 'number', 'Should have remaining count');
  }));

  // Test 4: Simple chat message
  results.push(await runTest('POST /ai/chat with simple message', async () => {
    const { status, data } = await post<AiChatResponse>('/ai/chat', {
      message: 'Hello',
      userAddress: wallet.address,
      language: 'en',
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as AiChatResponse).success === true, 'Chat failed');
    assert((data as AiChatResponse).data?.message !== undefined, 'Should have response message');
  }));

  // Test 5: Chat with balance inquiry (triggers tool)
  results.push(await runTest('POST /ai/chat triggers balance tool', async () => {
    const { status, data } = await post<AiChatResponse>('/ai/chat', {
      message: 'What is my balance?',
      userAddress: wallet.address,
      language: 'en',
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as AiChatResponse).success === true, 'Chat failed');
    // Tool might or might not be called depending on AI decision
  }));

  // Test 6: Chat without user address returns error
  results.push(await runTest('POST /ai/chat without address returns 400', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      message: 'Hello',
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 7: Chat with empty message returns error
  results.push(await runTest('POST /ai/chat with empty message returns 400', async () => {
    const { status } = await post<AiChatResponse>('/ai/chat', {
      message: '',
      userAddress: wallet.address,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 8: Direct tool execution - balance
  results.push(await runTest('POST /ai/tool execute balance tool', async () => {
    const { status, data } = await post<{ success: boolean; data: unknown }>('/ai/tool', {
      tool: 'get_balance',
      params: { userAddress: wallet.address },
      userAddress: wallet.address,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as any).success === true, 'Tool execution failed');
  }));

  // Test 9: Direct tool execution - history
  results.push(await runTest('POST /ai/tool execute history tool', async () => {
    const { status, data } = await post<{ success: boolean; data: unknown }>('/ai/tool', {
      tool: 'get_transaction_history',
      params: { userAddress: wallet.address, limit: 5 },
      userAddress: wallet.address,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as any).success === true, 'Tool execution failed');
  }));

  // Test 10: Invalid tool returns error
  results.push(await runTest('POST /ai/tool with invalid tool returns 400', async () => {
    const { status } = await post<{ success: boolean }>('/ai/tool', {
      tool: 'invalid_tool_name',
      params: {},
      userAddress: wallet.address,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 11: Get suggestions
  results.push(await runTest('GET /ai/suggestions returns suggestions array', async () => {
    const { status, data } = await get<{ success: boolean; data: unknown[] }>(
      `/ai/suggestions?address=${wallet.address}`
    );
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert(Array.isArray((data as any).data), 'Should return array');
  }));

  // Test 12: Chat in Russian
  results.push(await runTest('POST /ai/chat in Russian', async () => {
    const { status, data } = await post<AiChatResponse>('/ai/chat', {
      message: 'Привет, как дела?',
      userAddress: wallet.address,
      language: 'ru',
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as AiChatResponse).success === true, 'Chat failed');
  }));

  // Test 13: Chat asking for send preview
  results.push(await runTest('POST /ai/chat for send preview', async () => {
    const recipient = createTestWallet();
    const { status, data } = await post<AiChatResponse>('/ai/chat', {
      message: `Send 10 USDC to ${recipient.address}`,
      userAddress: wallet.address,
      language: 'en',
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as AiChatResponse).success === true, 'Chat failed');
  }));

  // Test 14: Get available providers
  results.push(await runTest('GET /ai/providers returns provider list', async () => {
    const { status, data } = await get<{ success: boolean; data: string[] }>('/ai/providers');
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert(Array.isArray((data as any).data), 'Should return array of providers');
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
