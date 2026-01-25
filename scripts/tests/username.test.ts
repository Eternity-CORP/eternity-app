/**
 * Username Service Tests
 * Tests username registration, lookup, update, and delete
 */

import { get, post, put, del } from './utils/api';
import { createTestWallet, signUsernameMessage, generateRandomUsername } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface UsernameResponse {
  success: boolean;
  data?: {
    username: string;
    address: string;
    preferences?: unknown;
    createdAt?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function runUsernameTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('Username Service Tests');

  const wallet1 = createTestWallet();
  const wallet2 = createTestWallet();
  const testUsername = generateRandomUsername();
  const testUsername2 = generateRandomUsername();

  // Test 1: Check availability for new username
  results.push(await runTest('Check availability - new username is available', async () => {
    const { status, data } = await get<{ success: boolean; data: { available: boolean } }>(
      `/api/username/check/${testUsername}`
    );
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert(data.success === true, 'Request not successful');
    assert(data.data.available === true, 'Username should be available');
  }));

  // Test 2: Lookup non-existent username
  results.push(await runTest('Lookup non-existent username returns 404', async () => {
    const { status, data } = await get<UsernameResponse>(`/api/username/${testUsername}`);
    assertEqual(status, 404, `Expected 404, got ${status}`);
    assert((data as UsernameResponse).success === false, 'Should not be successful');
  }));

  // Test 3: Register username with valid signature
  results.push(await runTest('Register username with valid signature', async () => {
    const timestamp = Date.now();
    const signature = await signUsernameMessage(wallet1.wallet, testUsername, 'claim', timestamp);

    const { status, data } = await post<UsernameResponse>('/api/username', {
      username: testUsername,
      address: wallet1.address,
      signature,
      timestamp,
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    assert((data as UsernameResponse).success === true, 'Registration failed');
    assertEqual((data as UsernameResponse).data?.username, testUsername, 'Username mismatch');
  }));

  // Test 4: Lookup registered username
  results.push(await runTest('Lookup registered username returns data', async () => {
    const { status, data } = await get<UsernameResponse>(`/api/username/${testUsername}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as UsernameResponse).success === true, 'Lookup failed');
    assertEqual((data as UsernameResponse).data?.username, testUsername, 'Username mismatch');
    assertEqual((data as UsernameResponse).data?.address.toLowerCase(), wallet1.address, 'Address mismatch');
  }));

  // Test 5: Reverse lookup by address
  results.push(await runTest('Reverse lookup by address', async () => {
    const { status, data } = await get<UsernameResponse>(`/api/username/address/${wallet1.address}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assertEqual((data as UsernameResponse).data?.username, testUsername, 'Username mismatch');
  }));

  // Test 6: Check availability for taken username
  results.push(await runTest('Check availability - taken username is not available', async () => {
    const { status, data } = await get<{ success: boolean; data: { available: boolean } }>(
      `/api/username/check/${testUsername}`
    );
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert(data.data.available === false, 'Username should not be available');
  }));

  // Test 7: Register duplicate username fails
  results.push(await runTest('Register duplicate username returns 409', async () => {
    const timestamp = Date.now();
    const signature = await signUsernameMessage(wallet2.wallet, testUsername, 'claim', timestamp);

    const { status, data } = await post<UsernameResponse>('/api/username', {
      username: testUsername,
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 409, `Expected 409, got ${status}`);
    assert((data as UsernameResponse).error?.code === 'USERNAME_TAKEN', 'Expected USERNAME_TAKEN error');
  }));

  // Test 8: Register with invalid username format
  results.push(await runTest('Register with invalid format returns 400', async () => {
    const timestamp = Date.now();
    const invalidUsername = '123invalid'; // starts with number
    const signature = await signUsernameMessage(wallet2.wallet, invalidUsername, 'claim', timestamp);

    const { status } = await post<UsernameResponse>('/api/username', {
      username: invalidUsername,
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 9: Register with expired timestamp
  results.push(await runTest('Register with expired timestamp returns 400', async () => {
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const signature = await signUsernameMessage(wallet2.wallet, testUsername2, 'claim', timestamp);

    const { status, data } = await post<UsernameResponse>('/api/username', {
      username: testUsername2,
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
    assert(
      (data as UsernameResponse).error?.code === 'TIMESTAMP_EXPIRED' ||
      (data as UsernameResponse).error?.code === 'INVALID_SIGNATURE',
      'Expected timestamp or signature error'
    );
  }));

  // Test 10: Register with invalid signature
  results.push(await runTest('Register with invalid signature returns 400', async () => {
    const timestamp = Date.now();
    const invalidSignature = '0x' + '00'.repeat(65);

    const { status, data } = await post<UsernameResponse>('/api/username', {
      username: testUsername2,
      address: wallet2.address,
      signature: invalidSignature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
    assert((data as UsernameResponse).error?.code === 'INVALID_SIGNATURE', 'Expected INVALID_SIGNATURE error');
  }));

  // Test 11: Register second username for wallet2
  results.push(await runTest('Register second wallet username', async () => {
    const timestamp = Date.now();
    const signature = await signUsernameMessage(wallet2.wallet, testUsername2, 'claim', timestamp);

    const { status, data } = await post<UsernameResponse>('/api/username', {
      username: testUsername2,
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 201, `Expected 201, got ${status}`);
    assert((data as UsernameResponse).success === true, 'Registration failed');
  }));

  // Test 12: Update username
  results.push(await runTest('Update username with valid signature', async () => {
    const newUsername = generateRandomUsername();
    const timestamp = Date.now();
    const signature = await signUsernameMessage(wallet2.wallet, newUsername, 'update', timestamp);

    const { status, data } = await put<UsernameResponse>('/api/username', {
      newUsername,
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as UsernameResponse).success === true, 'Update failed');
    assertEqual((data as UsernameResponse).data?.username, newUsername, 'Username not updated');
  }));

  // Test 13: Delete username
  results.push(await runTest('Delete username with valid signature', async () => {
    const timestamp = Date.now();
    const signature = await signUsernameMessage(wallet2.wallet, '', 'delete', timestamp);

    const { status, data } = await del<UsernameResponse>('/api/username', {
      address: wallet2.address,
      signature,
      timestamp,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as UsernameResponse).success === true, 'Delete failed');
  }));

  // Test 14: Verify deleted username is available again
  results.push(await runTest('Deleted username is available again', async () => {
    const { status, data } = await get<UsernameResponse>(`/api/username/address/${wallet2.address}`);
    assertEqual(status, 404, `Expected 404, got ${status}`);
  }));

  // Test 15: Case insensitivity in lookup
  results.push(await runTest('Username lookup is case-insensitive', async () => {
    const upperUsername = testUsername.toUpperCase();
    const { status, data } = await get<UsernameResponse>(`/api/username/${upperUsername}`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assertEqual((data as UsernameResponse).data?.username, testUsername, 'Username should be lowercase');
  }));

  // Cleanup: Delete first wallet's username
  const cleanupTimestamp = Date.now();
  const cleanupSignature = await signUsernameMessage(wallet1.wallet, '', 'delete', cleanupTimestamp);
  await del('/api/username', {
    address: wallet1.address,
    signature: cleanupSignature,
    timestamp: cleanupTimestamp,
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'Username',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runUsernameTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
