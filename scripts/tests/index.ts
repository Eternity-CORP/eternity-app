#!/usr/bin/env npx tsx

/**
 * E-Y Integration Test Runner
 *
 * Usage:
 *   pnpm test:all              - Run all tests
 *   pnpm test:module health    - Run specific module
 *   pnpm test:module username  - Run username tests
 *
 * Available modules:
 *   - health
 *   - username
 *   - preferences
 *   - scheduled
 *   - split
 *   - blik
 *   - ai
 */

import { checkApiHealth } from './utils/api';
import { header, summary, log, colors, TestSuiteResult } from './utils/reporter';

// Import test modules
import { runHealthTests } from './health.test';
import { runUsernameTests } from './username.test';
import { runPreferencesTests } from './preferences.test';
import { runScheduledTests } from './scheduled.test';
import { runSplitTests } from './split.test';
import { runBlikTests } from './blik.test';
import { runAiTests } from './ai.test';

const TEST_MODULES: Record<string, () => Promise<TestSuiteResult>> = {
  health: runHealthTests,
  username: runUsernameTests,
  preferences: runPreferencesTests,
  scheduled: runScheduledTests,
  split: runSplitTests,
  blik: runBlikTests,
  ai: runAiTests,
};

async function runAllTests(): Promise<TestSuiteResult[]> {
  const results: TestSuiteResult[] = [];

  for (const [name, runTests] of Object.entries(TEST_MODULES)) {
    try {
      const result = await runTests();
      results.push(result);
    } catch (error) {
      log(`${colors.red}Error running ${name} tests: ${error}${colors.reset}`);
      results.push({
        name,
        tests: [],
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  return results;
}

async function runModuleTests(moduleName: string): Promise<TestSuiteResult[]> {
  const runTests = TEST_MODULES[moduleName];

  if (!runTests) {
    log(`${colors.red}Unknown module: ${moduleName}${colors.reset}`);
    log(`Available modules: ${Object.keys(TEST_MODULES).join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await runTests();
    return [result];
  } catch (error) {
    log(`${colors.red}Error running ${moduleName} tests: ${error}${colors.reset}`);
    return [{
      name: moduleName,
      tests: [],
      passed: 0,
      failed: 1,
      duration: 0,
    }];
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const moduleName = args[0];

  header('E-Y Integration Tests');

  // Check API availability
  log(`${colors.dim}Checking API availability...${colors.reset}`);
  const apiHealthy = await checkApiHealth();

  if (!apiHealthy) {
    log(`${colors.red}✗ API is not available at http://localhost:3000${colors.reset}`);
    log(`${colors.yellow}Please start the API server first: pnpm api${colors.reset}`);
    process.exit(1);
  }

  log(`${colors.green}✓ API is available${colors.reset}\n`);

  let results: TestSuiteResult[];

  if (moduleName) {
    log(`Running module: ${colors.cyan}${moduleName}${colors.reset}\n`);
    results = await runModuleTests(moduleName);
  } else {
    log(`Running all test modules...\n`);
    results = await runAllTests();
  }

  // Print summary
  summary(results);

  // Exit with appropriate code
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
