/**
 * Network Preferences Tests
 * Tests preferences CRUD and signature verification
 */

import { get, put } from './utils/api';
import { createTestWallet, signPreferencesMessage } from './utils/wallet';
import { section, runTest, assert, assertEqual, TestSuiteResult } from './utils/reporter';

interface PreferencesResponse {
  success: boolean;
  data?: {
    address: string;
    preferences: {
      defaultNetwork: string | null;
      tokenOverrides: Record<string, string>;
      updatedAt?: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function runPreferencesTests(): Promise<TestSuiteResult> {
  const results: Awaited<ReturnType<typeof runTest>>[] = [];
  const start = Date.now();

  section('Network Preferences Tests');

  const wallet1 = createTestWallet();
  const wallet2 = createTestWallet();

  // Test 1: GET unknown address returns 404
  results.push(await runTest('GET unknown address returns 404', async () => {
    const { status, data } = await get<PreferencesResponse>(`/api/address/${wallet1.address}/preferences`);
    assertEqual(status, 404, `Expected 404, got ${status}`);
    assert((data as PreferencesResponse).success === false, 'Should not be successful');
    assertEqual((data as PreferencesResponse).error?.code, 'PREFERENCES_NOT_FOUND', 'Wrong error code');
  }));

  // Test 2: GET invalid address format returns 400
  results.push(await runTest('GET invalid address format returns 400', async () => {
    const { status } = await get<PreferencesResponse>('/api/address/invalid-address/preferences');
    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 3: PUT create preferences with valid signature
  results.push(await runTest('PUT create preferences with valid signature', async () => {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1.wallet, timestamp);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'polygon',
      tokenOverrides: { USDC: 'arbitrum', USDT: 'ethereum' },
      signature,
      timestamp,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as PreferencesResponse).success === true, 'Request failed');
    assertEqual((data as PreferencesResponse).data?.preferences.defaultNetwork, 'polygon', 'Network mismatch');
  }));

  // Test 4: GET created preferences
  results.push(await runTest('GET returns created preferences', async () => {
    const { status, data } = await get<PreferencesResponse>(`/api/address/${wallet1.address}/preferences`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as PreferencesResponse).success === true, 'Request failed');
    assertEqual((data as PreferencesResponse).data?.preferences.defaultNetwork, 'polygon', 'Network mismatch');
    assertEqual((data as PreferencesResponse).data?.preferences.tokenOverrides.USDC, 'arbitrum', 'Token override mismatch');
  }));

  // Test 5: PUT invalid signature returns 400
  results.push(await runTest('PUT invalid signature returns 400', async () => {
    const timestamp = Date.now();
    const invalidSignature = '0x' + '00'.repeat(65);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'ethereum',
      tokenOverrides: {},
      signature: invalidSignature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
    assertEqual((data as PreferencesResponse).error?.code, 'INVALID_SIGNATURE', 'Wrong error code');
  }));

  // Test 6: PUT expired timestamp returns 400
  results.push(await runTest('PUT expired timestamp returns 400', async () => {
    const expiredTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const signature = await signPreferencesMessage(wallet1.wallet, expiredTimestamp);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'ethereum',
      tokenOverrides: {},
      signature,
      timestamp: expiredTimestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
    assertEqual((data as PreferencesResponse).error?.code, 'TIMESTAMP_EXPIRED', 'Wrong error code');
  }));

  // Test 7: PUT invalid network ID returns 400
  results.push(await runTest('PUT invalid network ID returns 400', async () => {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1.wallet, timestamp);

    const { status } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'invalid_network',
      tokenOverrides: {},
      signature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
  }));

  // Test 8: PUT update existing preferences
  results.push(await runTest('PUT updates existing preferences', async () => {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1.wallet, timestamp);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'base',
      tokenOverrides: { ETH: 'ethereum', WBTC: 'arbitrum' },
      signature,
      timestamp,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assertEqual((data as PreferencesResponse).data?.preferences.defaultNetwork, 'base', 'Network not updated');
    assertEqual((data as PreferencesResponse).data?.preferences.tokenOverrides.ETH, 'ethereum', 'Override not updated');
  }));

  // Test 9: Verify update persisted
  results.push(await runTest('Updates are persisted', async () => {
    const { status, data } = await get<PreferencesResponse>(`/api/address/${wallet1.address}/preferences`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assertEqual((data as PreferencesResponse).data?.preferences.defaultNetwork, 'base', 'Network not persisted');
    assertEqual((data as PreferencesResponse).data?.preferences.tokenOverrides.ETH, 'ethereum', 'Override not persisted');
  }));

  // Test 10: PUT with null defaultNetwork
  results.push(await runTest('PUT accepts null as defaultNetwork', async () => {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet2.wallet, timestamp);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet2.address,
      defaultNetwork: null,
      tokenOverrides: { USDC: 'polygon' },
      signature,
      timestamp,
    });

    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as PreferencesResponse).data?.preferences.defaultNetwork === null, 'defaultNetwork should be null');
  }));

  // Test 11: PUT with wrong wallet signature returns 400
  results.push(await runTest('PUT with signature from different wallet returns 400', async () => {
    const timestamp = Date.now();
    // Sign with wallet2 but send wallet1's address
    const signature = await signPreferencesMessage(wallet2.wallet, timestamp);

    const { status, data } = await put<PreferencesResponse>('/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'optimism',
      tokenOverrides: {},
      signature,
      timestamp,
    });

    assertEqual(status, 400, `Expected 400, got ${status}`);
    assertEqual((data as PreferencesResponse).error?.code, 'INVALID_SIGNATURE', 'Wrong error code');
  }));

  // Test 12: GET with mixed case address
  results.push(await runTest('GET is case-insensitive for address', async () => {
    const mixedCaseAddress = wallet1.address.replace(/[a-f]/g, c => c.toUpperCase());
    const { status, data } = await get<PreferencesResponse>(`/api/address/${mixedCaseAddress}/preferences`);
    assertEqual(status, 200, `Expected 200, got ${status}`);
    assert((data as PreferencesResponse).success === true, 'Request failed');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    name: 'Preferences',
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  };
}

// Run standalone
if (require.main === module) {
  runPreferencesTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
