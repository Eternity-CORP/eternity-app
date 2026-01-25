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

interface SplitResponse {
  success: boolean;
  data?: SplitBill | SplitBill[];
  error?: {
    code: string;
    message: string;
  };
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
    const { status, data } = await post<SplitResponse>('/api/splits', {
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
    assert((data as SplitResponse).success === true, 'Creation failed');
    const split = (data as SplitResponse).data as SplitBill;
    assert(split.id !== undefined, 'Missing split ID');
    createdSplitId = split.id;
    assertEqual(split.participants.length, 3, 'Should have 3 participants');
    assertEqual(split.status, 'active', 'Status should be active');
  }));

  // Test 2: Get split bill by ID
  results.push(await runTest('GET split bill by ID', async () => {
    const { status, data } = await get<SplitResponse>(`/api/splits/${createdSplitId}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = (data as SplitResponse).data as SplitBill;
    assertEqual(split.id, createdSplitId, 'ID mismatch');
    assertEqual(split.totalAmount, '300', 'Total amount mismatch');
  }));

  // Test 3: List splits by creator
  results.push(await runTest('GET list splits by creator', async () => {
    const { status, data } = await get<SplitResponse>(`/api/splits/creator/${creator.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const splits = (data as SplitResponse).data as SplitBill[];
    assert(Array.isArray(splits), 'Should return array');
    assert(splits.length >= 1, 'Should have at least one split');
  }));

  // Test 4: List pending splits for participant
  results.push(await runTest('GET pending splits for participant', async () => {
    const { status, data } = await get<SplitResponse>(`/api/splits/pending/${participant1.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const splits = (data as SplitResponse).data as SplitBill[];
    assert(Array.isArray(splits), 'Should return array');
    assert(splits.some(s => s.id === createdSplitId), 'Should include created split');
  }));

  // Test 5: Mark participant as paid
  results.push(await runTest('POST mark participant paid', async () => {
    const { status, data } = await post<SplitResponse>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant1.address,
      txHash: '0x' + 'a'.repeat(64),
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = (data as SplitResponse).data as SplitBill;
    const participant = split.participants.find(p => p.address.toLowerCase() === participant1.address);
    assertEqual(participant?.status, 'paid', 'Participant should be paid');
  }));

  // Test 6: Verify paid status persisted
  results.push(await runTest('Paid status is persisted', async () => {
    const { status, data } = await get<SplitResponse>(`/api/splits/${createdSplitId}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = (data as SplitResponse).data as SplitBill;
    const participant = split.participants.find(p => p.address.toLowerCase() === participant1.address);
    assertEqual(participant?.status, 'paid', 'Status should be persisted');
    assert(participant?.paidTxHash !== undefined, 'Should have txHash');
  }));

  // Test 7: Cannot mark same participant paid twice
  results.push(await runTest('POST mark same participant paid again returns 400', async () => {
    const { status } = await post<SplitResponse>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant1.address,
      txHash: '0x' + 'b'.repeat(64),
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 8: Mark all participants paid completes split
  results.push(await runTest('All paid completes split', async () => {
    // Pay participant2
    await post<SplitResponse>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant2.address,
      txHash: '0x' + 'c'.repeat(64),
    });

    // Pay participant3
    const { status, data } = await post<SplitResponse>(`/api/splits/${createdSplitId}/pay`, {
      participantAddress: participant3.address,
      txHash: '0x' + 'd'.repeat(64),
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = (data as SplitResponse).data as SplitBill;
    assertEqual(split.status, 'completed', 'Split should be completed');
  }));

  // Test 9: Create split with invalid total (participants > total)
  results.push(await runTest('POST with invalid participant amounts returns 400', async () => {
    const { status } = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '60' },
        { address: participant2.address, amount: '60' }, // 120 > 100
      ],
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 10: Create split with no participants
  results.push(await runTest('POST with no participants returns 400', async () => {
    const { status } = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [],
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 11: Create and cancel split
  let cancelSplitId: string = '';
  results.push(await runTest('Create and cancel split', async () => {
    // Create
    const createRes = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '50',
      tokenSymbol: 'ETH',
      participants: [
        { address: participant1.address, amount: '25' },
        { address: participant2.address, amount: '25' },
      ],
    });

    cancelSplitId = ((createRes.data as SplitResponse).data as SplitBill).id;

    // Cancel
    const { status, data } = await del<SplitResponse>(`/api/splits/${cancelSplitId}`, {
      requesterAddress: creator.address,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    const split = (data as SplitResponse).data as SplitBill;
    assertEqual(split.status, 'cancelled', 'Status should be cancelled');
  }));

  // Test 12: Non-creator cannot cancel split
  results.push(await runTest('Non-creator cannot cancel split', async () => {
    // Create new split
    const createRes = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '50',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '50' },
      ],
    });

    const splitId = ((createRes.data as SplitResponse).data as SplitBill).id;

    // Try to cancel as non-creator
    const { status } = await del<SplitResponse>(`/api/splits/${splitId}`, {
      requesterAddress: participant1.address,
    });

    assertEqual(status, 403, `Expected 403, got ${status}`);
  }));

  // Test 13: Get non-existent split
  results.push(await runTest('GET non-existent split returns 404', async () => {
    const { status } = await get<SplitResponse>('/api/splits/non-existent-id');
    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 14: Mark non-existent participant paid
  results.push(await runTest('POST pay non-existent participant returns 404', async () => {
    const newSplit = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '100' },
      ],
    });
    const splitId = ((newSplit.data as SplitResponse).data as SplitBill).id;

    const { status } = await post<SplitResponse>(`/api/splits/${splitId}/pay`, {
      participantAddress: participant3.address, // Not in split
      txHash: '0x' + 'e'.repeat(64),
    });

    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 15: Create split with duplicate participants
  results.push(await runTest('POST with duplicate participants returns 400', async () => {
    const { status } = await post<SplitResponse>('/api/splits', {
      creatorAddress: creator.address,
      totalAmount: '100',
      tokenSymbol: 'USDC',
      participants: [
        { address: participant1.address, amount: '50' },
        { address: participant1.address, amount: '50' }, // Duplicate
      ],
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
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
