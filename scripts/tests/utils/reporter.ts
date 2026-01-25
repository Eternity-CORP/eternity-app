/**
 * Test Reporter Utilities
 */

// Colors for terminal output
export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export function log(message: string): void {
  console.log(message);
}

export function pass(test: string, duration?: number): void {
  const time = duration ? ` ${colors.dim}(${duration}ms)${colors.reset}` : '';
  console.log(`${colors.green}✓${colors.reset} ${test}${time}`);
}

export function fail(test: string, error?: string): void {
  console.log(`${colors.red}✗${colors.reset} ${test}`);
  if (error) {
    console.log(`  ${colors.dim}${error}${colors.reset}`);
  }
}

export function skip(test: string, reason?: string): void {
  const reasonText = reason ? ` - ${reason}` : '';
  console.log(`${colors.yellow}○${colors.reset} ${colors.dim}${test}${reasonText}${colors.reset}`);
}

export function section(title: string): void {
  console.log(`\n${colors.cyan}━━━ ${title} ━━━${colors.reset}\n`);
}

export function header(title: string): void {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║${colors.reset}  ${title.padEnd(55)}${colors.bold}${colors.blue}║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

export function summary(results: TestSuiteResult[]): void {
  console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}                      TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const suite of results) {
    const status = suite.failed === 0 ? colors.green + '✓' : colors.red + '✗';
    const passedText = suite.passed > 0 ? `${colors.green}${suite.passed} passed${colors.reset}` : '';
    const failedText = suite.failed > 0 ? `${colors.red}${suite.failed} failed${colors.reset}` : '';
    const separator = passedText && failedText ? ', ' : '';

    console.log(`${status}${colors.reset} ${suite.name.padEnd(25)} ${passedText}${separator}${failedText} ${colors.dim}(${suite.duration}ms)${colors.reset}`);

    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalDuration += suite.duration;
  }

  console.log(`\n${colors.bold}───────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}Total:${colors.reset} ${colors.green}${totalPassed} passed${colors.reset}, ${colors.red}${totalFailed} failed${colors.reset} ${colors.dim}(${totalDuration}ms)${colors.reset}`);

  if (totalFailed === 0) {
    console.log(`\n${colors.green}${colors.bold}All tests passed! ✓${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bold}Some tests failed! ✗${colors.reset}\n`);
  }
}

/**
 * Test runner helper
 */
export async function runTest(
  name: string,
  testFn: () => Promise<void>,
): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    pass(name, duration);
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    fail(name, errorMessage);
    return { name, passed: false, error: errorMessage, duration };
  }
}

/**
 * Assert helper
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

export function assertNotNull<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
}
