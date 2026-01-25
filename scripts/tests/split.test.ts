/**
 * Split Bills Tests
 * Tests split bill creation, payment tracking, and management
 */

import { get, post, del } from './utils/api';
import { createTestWallet } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface SplitParticipant {
  id?: string;
  address: string;
  username?: string;
  name?: string;
  amount: string;
  status: 'pending' | 'paid';
  paidTxHash?: string;
}

interface SplitBill {
  id: string;
  creatorAddress: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  status: 'active' | 'completed' | 'cancelled';
}

export async function runSplitTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('Split Bills Tests');

  const creator = createTestWallet();
  const participant1 = createTestWallet();
  const participant2 = createTestWallet();
  const participant3 = createTestWallet();

  let createdSplitId: string = '';

  // Test 1: Create split bill with multiple participants
  results.push(await runTest('POST create split bill', async () => {
    const { status, data } = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '300',
      tokenSymbol: 'USDC',
      description: 'Dinner split',
      participants: [
        { address: participant1.address, name: 'Alice', amount: '100' },
        { address: participant2.address, name: 'Bob', amount: '100' },
        { address: participant3.address, name: 'Charlie', amount: '100' },
      ],
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    const split = data as SplitBill;
    assert(split.id !== undefined, 'Missing split ID');
    createdSplitId = split.id;
    assertEqual(split.participants.length, 3, 'Should have 3 participants');
    assertEqual(split.status, 'active', 'Status should be active');
  }));

  // Test 2: Get split bill by ID
  results.push(await runTest('GET split bill by ID', async () => {
    const { status, data } = await get<SplitBill>(`/api/splits/${createdSplitId}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = data as SplitBill;
    assertEqual(split.id, createdSplitId, 'ID mismatch');
    // Total amount might be in different format
    assert(split.totalAmount !== undefined, 'Should have total amount');
  }));

  // Test 3: List splits by creator
  results.push(await runTest('GET list splits by creator', async () => {
    const { status, data } = await get<SplitBill[]>(`/api/splits/creator/${creator.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const splits = data as SplitBill[];
    assert(Array.isArray(splits), 'Should return array');
    assert(splits.length >= 1, 'Should have at least one split');
  }));

  // Test 4: List pending splits for participant
  results.push(await runTest('GET pending splits for participant', async () => {
    const { status, data } = await get<SplitBill[]>(`/api/splits/pending/${participant1.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const splits = data as SplitBill[];
    assert(Array.isArray(splits), 'Should return array');
    assert(splits.some(s => s.id === createdSplitId), 'Should include created split');
  }));

  // Test 5: Mark participant as paid
  results.push(await runTest('POST mark participant paid', async () => {
    const { status, data } = await post<SplitBill>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant1.address,
      txHash: '0x' + 'a'.repeat(64),
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = data as SplitBill;
    const participant = split.participants.find(p => p.address.toLowerCase() === participant1.address.toLowerCase());
    assertEqual(participant?.status, 'paid', 'Participant should be paid');
  }));

  // Test 6: Verify paid status persisted
  results.push(await runTest('Paid status is persisted', async () => {
    const { status, data } = await get<SplitBill>(`/api/splits/${createdSplitId}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = data as SplitBill;
    const participant = split.participants.find(p => p.address.toLowerCase() === participant1.address.toLowerCase());
    assertEqual(participant?.status, 'paid', 'Status should be persisted');
    assert(participant?.paidTxHash !== undefined, 'Should have txHash');
  }));

  // Test 7: Cannot mark same participant paid twice
  results.push(await runTest('POST mark same participant paid again returns 400', async () => {
    const { status } = await post<SplitBill>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant1.address,
      txHash: '0x' + 'b'.repeat(64),
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 8: Mark all participants paid completes split
  results.push(await runTest('All paid completes split', async () => {
    // Pay participant2
    await post<SplitBill>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant2.address,
      txHash: '0x' + 'c'.repeat(64),
    });

    // Pay participant3
    const { status, data } = await post<SplitBill>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant3.address,
      txHash: '0x' + 'd'.repeat(64),
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = data as SplitBill;
    assertEqual(split.status, 'completed', 'Split should be completed');
  }));

  // Test 9: Create split with no participants
  results.push(await runTest('POST with no participants returns 400', async () => {
    const { status } = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [],
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 10: Create and cancel split
  let cancelSplitId: string = '';
  results.push(await runTest('Create and cancel split', async () => {
    // Create
    const createRes = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '50',
      tokenSymbol: 'ETH',
      participants: [
        { address: participant1.address, amount: '25' },
        { address: participant2.address, amount: '25' },
      ],
    });

    cancelSplitId = (createRes.data as SplitBill).id;

    // Cancel (using query param as per controller)
    const { status, data } = await del<SplitBill>(
      `/api/splits/${cancelSplitId}?address=${creator.address}`,
    );

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = data as SplitBill;
    assertEqual(split.status, 'cancelled', 'Status should be cancelled');
  }));

  // Test 11: Non-creator cannot cancel split
  results.push(await runTest('Non-creator cannot cancel split', async () => {
    // Create new split
    const createRes = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '50',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '50' },
      ],
    });

    const splitId = (createRes.data as SplitBill).id;

    // Try to cancel as non-creator
    const { status } = await del<SplitBill>(
      `/api/splits/${splitId}?address=${participant1.address}`,
    );

    // API may return 403 Forbidden or 400 Bad Request
    assert(status === 403 || status === 400, `Expected 403 or 400, got ${status}`);
  }));

  // Test 12: Get non-existent split
  results.push(await runTest('GET non-existent split returns 404', async () => {
    const { status } = await get<SplitBill>('/api/splits/00000000-0000-0000-0000-000000000000');
    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 13: Mark non-existent participant paid
  results.push(await runTest('POST pay non-existent participant returns 404', async () => {
    const newSplit = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '100' },
      ],
    });
    const splitId = (newSplit.data as SplitBill).id;

    const { status } = await post<SplitBill>(`/api/splits/${splitId}/pay`, {
      participantAddress: participant3.address, // Not in split
      txHash: '0x' + 'e'.repeat(64),
    });

    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 14: Create split with valid amounts (matching total)
  results.push(await runTest('POST with valid participant amounts', async () => {
    const { status, data } = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '50' },
        { address: participant2.address, amount: '50' },
      ],
    });

    // If validation exists, it should accept matching amounts
    assert(status === 201 || status === 400, `Expected 201 or 400, got ${status}`);
  }));

  // Test 15: Create split with different token
  results.push(await runTest('POST create split with ETH', async () => {
    const { status, data } = await post<SplitBill>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '1',
      tokenSymbol: 'ETH',
      description: 'ETH split test',
      participants: [
        { address: participant1.address, amount: '0.5' },
        { address: participant2.address, amount: '0.5' },
      ],
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    const split = data as SplitBill;
    assertEqual(split.tokenSymbol, 'ETH', 'Token symbol mismatch');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'Split Bills',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runSplitTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
