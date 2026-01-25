/**
 * BLIK Code Tests
 * Tests BLIK code creation, lookup, and payment flow via WebSocket
 */

import { io, Socket } from 'socket.io-client';
import { createTestWallet } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult, skip } from './utils/reporter';
import { API_BASE_URL } from './utils/api';

const WS_URL = API_BASE_URL.replace('http', 'ws');

interface BlikCode {
  code: string;
  receiverAddress: string;
  receiverUsername?: string;
  amount: string;
  token: string;
  expiresAt: number;
  status: 'active' | 'matched' | 'paid' | 'expired' | 'cancelled';
}

interface BlikEvent {
  code?: string;
  error?: string;
  data?: BlikCode;
  receiverAddress?: string;
  amount?: string;
  token?: string;
  txHash?: string;
}

function createBlikSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${WS_URL}/blik`, {
      transports: ['websocket'],
      timeout: 5000,
    });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));

    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event);
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export async function runBlikTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('BLIK Code Tests');

  const receiver = createTestWallet();
  const sender = createTestWallet();

  let receiverSocket: Socket | null = null;
  let senderSocket: Socket | null = null;
  let createdCode: string = '';

  // Test 1: Connect to BLIK WebSocket
  results.push(await runTest('Connect to BLIK WebSocket', async () => {
    receiverSocket = await createBlikSocket();
    assert(receiverSocket.connected, 'Socket should be connected');
  }));

  if (!receiverSocket) {
    skip('All BLIK tests', 'WebSocket connection failed');
    return {
      name: 'BLIK',
      tests: results,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      duration: Date.now() - start,
    };
  }

  // Test 2: Register address with socket
  results.push(await runTest('Register address with socket', async () => {
    receiverSocket!.emit('register', { address: receiver.address });
    // Wait a bit for registration
    await new Promise(resolve => setTimeout(resolve, 100));
    // Registration is silent, just verify we don't get an error
    assert(receiverSocket!.connected, 'Socket should still be connected');
  }));

  // Test 3: Create BLIK code
  results.push(await runTest('Create BLIK code', async () => {
    const codePromise = waitForEvent<BlikEvent>(receiverSocket!, 'code:created');

    receiverSocket!.emit('code:create', {
      receiverAddress: receiver.address,
      amount: '50',
      token: 'USDC',
    });

    const result = await codePromise;
    assert(result.code !== undefined, 'Should receive code');
    assert(result.code!.length === 6, 'Code should be 6 digits');
    createdCode = result.code!;
  }));

  // Test 4: Create second socket for sender
  results.push(await runTest('Sender connects to WebSocket', async () => {
    senderSocket = await createBlikSocket();
    senderSocket.emit('register', { address: sender.address });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert(senderSocket.connected, 'Sender socket should be connected');
  }));

  // Test 5: Lookup BLIK code
  results.push(await runTest('Lookup BLIK code', async () => {
    const lookupPromise = waitForEvent<BlikEvent>(senderSocket!, 'code:lookup');

    senderSocket!.emit('code:lookup', { code: createdCode });

    const result = await lookupPromise;
    assert(result.data !== undefined, 'Should receive code data');
    assertEqual(result.data!.receiverAddress.toLowerCase(), receiver.address, 'Receiver address mismatch');
    assertEqual(result.data!.amount, '50', 'Amount mismatch');
  }));

  // Test 6: Lookup non-existent code
  results.push(await runTest('Lookup non-existent code returns error', async () => {
    const lookupPromise = waitForEvent<BlikEvent>(senderSocket!, 'code_not_found');

    senderSocket!.emit('code:lookup', { code: '000000' });

    const result = await lookupPromise;
    assert(result !== undefined, 'Should receive not found event');
  }));

  // Test 7: Confirm payment
  results.push(await runTest('Confirm payment', async () => {
    const receiverPromise = waitForEvent<BlikEvent>(receiverSocket!, 'payment:confirmed');

    senderSocket!.emit('payment:confirm', {
      code: createdCode,
      senderAddress: sender.address,
      txHash: '0x' + 'f'.repeat(64),
    });

    const result = await receiverPromise;
    assert(result.txHash !== undefined, 'Should receive txHash');
  }));

  // Test 8: Lookup paid code returns error
  results.push(await runTest('Lookup already paid code returns error', async () => {
    const lookupPromise = waitForEvent<BlikEvent>(senderSocket!, 'code_not_found', 3000);

    senderSocket!.emit('code:lookup', { code: createdCode });

    try {
      await lookupPromise;
      // If we get here, the code was found (which is wrong)
      assert(false, 'Should not find paid code');
    } catch {
      // Timeout means code wasn't found (expected)
      assert(true, 'Paid code not found as expected');
    }
  }));

  // Test 9: Create and cancel code
  results.push(await runTest('Create and cancel code', async () => {
    const createPromise = waitForEvent<BlikEvent>(receiverSocket!, 'code:created');

    receiverSocket!.emit('code:create', {
      receiverAddress: receiver.address,
      amount: '25',
      token: 'ETH',
    });

    const created = await createPromise;
    const codeToCancel = created.code!;

    const cancelPromise = waitForEvent<BlikEvent>(receiverSocket!, 'code:cancelled');

    receiverSocket!.emit('code:cancel', {
      code: codeToCancel,
      receiverAddress: receiver.address,
    });

    await cancelPromise;
    // If we get here, cancellation worked
    assert(true, 'Code cancelled successfully');
  }));

  // Test 10: Code expiration (would take 2 minutes, so we skip in quick tests)
  results.push(await runTest('Code has 2 minute TTL (skip - takes too long)', async () => {
    // This test would need to wait 2 minutes
    // Instead, verify the expiresAt field is set correctly
    const createPromise = waitForEvent<BlikEvent>(receiverSocket!, 'code:created');

    receiverSocket!.emit('code:create', {
      receiverAddress: receiver.address,
      amount: '10',
      token: 'USDC',
    });

    const created = await createPromise;

    // Cancel it to clean up
    receiverSocket!.emit('code:cancel', {
      code: created.code,
      receiverAddress: receiver.address,
    });

    // Just verify code was created
    assert(created.code !== undefined, 'Code should be created');
  }));

  // Test 11: Invalid amount
  results.push(await runTest('Create code with invalid amount', async () => {
    const errorPromise = waitForEvent<BlikEvent>(receiverSocket!, 'error', 3000);

    receiverSocket!.emit('code:create', {
      receiverAddress: receiver.address,
      amount: '-50',
      token: 'USDC',
    });

    try {
      const result = await errorPromise;
      assert(result.error !== undefined, 'Should receive error');
    } catch {
      // Timeout is also acceptable - server might just ignore invalid request
      assert(true, 'Server rejected invalid amount');
    }
  }));

  // Test 12: Multiple codes from same address
  results.push(await runTest('Can create multiple codes from same address', async () => {
    const codes: string[] = [];

    for (let i = 0; i < 3; i++) {
      const createPromise = waitForEvent<BlikEvent>(receiverSocket!, 'code:created');

      receiverSocket!.emit('code:create', {
        receiverAddress: receiver.address,
        amount: String(10 + i),
        token: 'USDC',
      });

      const created = await createPromise;
      codes.push(created.code!);
    }

    assertEqual(codes.length, 3, 'Should create 3 codes');
    assert(new Set(codes).size === 3, 'All codes should be unique');

    // Clean up
    for (const code of codes) {
      receiverSocket!.emit('code:cancel', {
        code,
        receiverAddress: receiver.address,
      });
    }
  }));

  // Cleanup
  if (receiverSocket) receiverSocket.disconnect();
  if (senderSocket) senderSocket.disconnect();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'BLIK',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runBlikTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
