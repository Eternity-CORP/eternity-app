/**
 * Health Check Tests
 * Tests API availability and basic service health
 */

import { get } from './utils/api';
import { section, runTest, assert, TestSuiteResult } from './utils/reporter';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}

export async function runHealthTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('Health Check Tests');

  // Test 1: Basic health endpoint
  results.push(await runTest('GET /health returns 200', async () => {
    const { status, data } = await get<HealthResponse>('/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert((data as HealthResponse).status === 'ok', 'Health status not ok');
  }));

  // Test 2: Health response structure
  results.push(await runTest('Health response has correct structure', async () => {
    const { data } = await get<HealthResponse>('/health');
    const health = data as HealthResponse;
    assert(typeof health.status === 'string', 'Missing status field');
    assert(typeof health.timestamp === 'string', 'Missing timestamp field');
    assert(typeof health.service === 'string', 'Missing service field');
  }));

  // Test 3: Service name is correct
  results.push(await runTest('Service name is e-y-api', async () => {
    const { data } = await get<HealthResponse>('/health');
    assert((data as HealthResponse).service === 'e-y-api', 'Wrong service name');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'Health',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runHealthTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
