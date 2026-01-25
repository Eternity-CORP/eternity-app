/**
 * Scheduled Payments Tests
 * Tests scheduled payment CRUD operations
 */

import { get, post, put, del } from './utils/api';
import { createTestWallet, generateRandomUsername } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: string;
  recurringInterval?: string;
  description?: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
}

interface ScheduledResponse {
  success: boolean;
  data?: ScheduledPayment | ScheduledPayment[];
  error?: {
    code: string;
    message: string;
  };
}

export async function runScheduledTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('Scheduled Payments Tests');

  const wallet1 = createTestWallet();
  const wallet2 = createTestWallet();
  let createdPaymentId: string = '';

  // Future date for scheduled payment
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

  // Test 1: Create scheduled payment
  results.push(await runTest('POST create scheduled payment', async () => {
    const { status, data } = await post<ScheduledResponse>('/api/scheduled', {
      creatorAddress: wallet1.address,
      recipient: wallet2.address,
      amount: '100',
      tokenSymbol: 'USDC',
      scheduledAt: futureDate,
      description: 'Test payment',
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    assert((data as ScheduledResponse).success === true, 'Creation failed');
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assert(payment.id !== undefined, 'Missing payment ID');
    createdPaymentId = payment.id;
    assertEqual(payment.status, 'pending', 'Status should be pending');
  }));

  // Test 2: Get scheduled payment by ID
  results.push(await runTest('GET scheduled payment by ID', async () => {
    const { status, data } = await get<ScheduledResponse>(`/api/scheduled/${createdPaymentId}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assertEqual(payment.id, createdPaymentId, 'ID mismatch');
    assertEqual(payment.amount, '100', 'Amount mismatch');
  }));

  // Test 3: List payments by creator
  results.push(await runTest('GET list payments by creator', async () => {
    const { status, data } = await get<ScheduledResponse>(`/api/scheduled?creatorAddress=${wallet1.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payments = (data as ScheduledResponse).data as ScheduledPayment[];
    assert(Array.isArray(payments), 'Should return array');
    assert(payments.length >= 1, 'Should have at least one payment');
  }));

  // Test 4: List pending payments
  results.push(await runTest('GET list pending payments', async () => {
    const { status, data } = await get<ScheduledResponse>(`/api/scheduled/pending?creatorAddress=${wallet1.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payments = (data as ScheduledResponse).data as ScheduledPayment[];
    assert(Array.isArray(payments), 'Should return array');
    payments.forEach(p => assertEqual(p.status, 'pending', 'All should be pending'));
  }));

  // Test 5: Create recurring payment
  results.push(await runTest('POST create recurring payment', async () => {
    const { status, data } = await post<ScheduledResponse>('/api/scheduled', {
      creatorAddress: wallet1.address,
      recipient: wallet2.address,
      amount: '50',
      tokenSymbol: 'ETH',
      scheduledAt: futureDate,
      recurringInterval: 'weekly',
      description: 'Weekly payment',
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assertEqual(payment.recurringInterval, 'weekly', 'Recurring interval mismatch');
  }));

  // Test 6: Create payment with invalid amount
  results.push(await runTest('POST with invalid amount returns 400', async () => {
    const { status } = await post<ScheduledResponse>('/api/scheduled', {
      creatorAddress: wallet1.address,
      recipient: wallet2.address,
      amount: '-100',
      tokenSymbol: 'USDC',
      scheduledAt: futureDate,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 7: Create payment with past date
  results.push(await runTest('POST with past date returns 400', async () => {
    const { status } = await post<ScheduledResponse>('/api/scheduled', {
      creatorAddress: wallet1.address,
      recipient: wallet2.address,
      amount: '100',
      tokenSymbol: 'USDC',
      scheduledAt: pastDate,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 8: Update scheduled payment
  results.push(await runTest('PUT update scheduled payment', async () => {
    const newFutureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { status, data } = await put<ScheduledResponse>(`/api/scheduled/${createdPaymentId}`, {
      walletAddress: wallet1.address,
      amount: '150',
      scheduledAt: newFutureDate,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assertEqual(payment.amount, '150', 'Amount not updated');
  }));

  // Test 9: Update payment by non-creator fails
  results.push(await runTest('PUT update by non-creator returns 403', async () => {
    const { status } = await put<ScheduledResponse>(`/api/scheduled/${createdPaymentId}`, {
      walletAddress: wallet2.address,
      amount: '200',
    });

    assertEqual(status, 403, `Expected 403, got ${status}`);
  }));

  // Test 10: Get non-existent payment
  results.push(await runTest('GET non-existent payment returns 404', async () => {
    const { status } = await get<ScheduledResponse>('/api/scheduled/non-existent-id');
    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 11: Mark payment as executed
  results.push(await runTest('POST execute payment', async () => {
    const { status, data } = await post<ScheduledResponse>(`/api/scheduled/${createdPaymentId}/execute`, {
      walletAddress: wallet1.address,
      txHash: '0x' + '1'.repeat(64),
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assertEqual(payment.status, 'executed', 'Status should be executed');
  }));

  // Test 12: Cannot execute already executed payment
  results.push(await runTest('POST execute already executed returns 400', async () => {
    const { status } = await post<ScheduledResponse>(`/api/scheduled/${createdPaymentId}/execute`, {
      walletAddress: wallet1.address,
      txHash: '0x' + '2'.repeat(64),
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 13: Create and cancel payment
  let cancelPaymentId: string = '';
  results.push(await runTest('POST create and cancel payment', async () => {
    // Create
    const createRes = await post<ScheduledResponse>('/api/scheduled', {
      creatorAddress: wallet1.address,
      recipient: wallet2.address,
      amount: '25',
      tokenSymbol: 'USDC',
      scheduledAt: futureDate,
    });

    cancelPaymentId = ((createRes.data as ScheduledResponse).data as ScheduledPayment).id;

    // Cancel
    const { status, data } = await post<ScheduledResponse>(`/api/scheduled/${cancelPaymentId}/cancel`, {
      walletAddress: wallet1.address,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payment = (data as ScheduledResponse).data as ScheduledPayment;
    assertEqual(payment.status, 'cancelled', 'Status should be cancelled');
  }));

  // Test 14: Delete scheduled payment
  results.push(await runTest('DELETE scheduled payment', async () => {
    const { status } = await del<ScheduledResponse>(`/api/scheduled/${cancelPaymentId}`, {
      walletAddress: wallet1.address,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
  }));

  // Test 15: Get upcoming payments
  results.push(await runTest('GET upcoming payments', async () => {
    const { status, data } = await get<ScheduledResponse>(`/api/scheduled/upcoming?creatorAddress=${wallet1.address}&days=7`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const payments = (data as ScheduledResponse).data as ScheduledPayment[];
    assert(Array.isArray(payments), 'Should return array');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'Scheduled Payments',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runScheduledTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
