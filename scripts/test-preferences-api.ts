#!/usr/bin/env npx ts-node

/**
 * Integration test script for Network Preferences API
 *
 * Run with: npx ts-node scripts/test-preferences-api.ts
 *
 * Requires a running API server at http://localhost:3001
 */

import { Wallet, HDNodeWallet } from 'ethers';

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string): void {
  console.log(message);
}

function pass(test: string): void {
  console.log(`${colors.green}PASS${colors.reset} ${test}`);
}

function fail(test: string, error?: string): void {
  console.log(`${colors.red}FAIL${colors.reset} ${test}`);
  if (error) {
    console.log(`${colors.dim}     ${error}${colors.reset}`);
  }
}

function section(title: string): void {
  console.log(`\n${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

async function request(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const url = `${API_BASE_URL}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  return { status: response.status, data };
}

async function signPreferencesMessage(wallet: HDNodeWallet, timestamp: number): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:preferences:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

async function signUsernameMessage(
  wallet: HDNodeWallet,
  username: string,
  action: 'claim' | 'update' | 'delete',
  timestamp: number,
): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:${action}:@${username}:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

// Test Results Tracking
let passed = 0;
let failed = 0;

async function runTests(): Promise<void> {
  log(`${colors.blue}Network Preferences API Integration Tests${colors.reset}`);
  log(`${colors.dim}API URL: ${API_BASE_URL}${colors.reset}`);

  // Create test wallets
  const wallet1 = Wallet.createRandom();
  const wallet2 = Wallet.createRandom();
  const address1 = wallet1.address.toLowerCase();
  const address2 = wallet2.address.toLowerCase();

  log(`\n${colors.dim}Test Wallet 1: ${address1}${colors.reset}`);
  log(`${colors.dim}Test Wallet 2: ${address2}${colors.reset}`);

  // ==========================================
  section('1. GET Preferences (Unknown Address)');
  // ==========================================

  try {
    const { status, data } = await request('GET', `/api/address/${address1}/preferences`);

    if (status === 404 && (data as { success: boolean }).success === false) {
      pass('Returns 404 for unknown address');
      passed++;
    } else {
      fail('Returns 404 for unknown address', `Got status ${status}`);
      failed++;
    }
  } catch (err) {
    fail('Returns 404 for unknown address', String(err));
    failed++;
  }

  // ==========================================
  section('2. GET Preferences (Invalid Address Format)');
  // ==========================================

  try {
    const { status, data } = await request('GET', `/api/address/invalid-address/preferences`);

    if (status === 400) {
      pass('Returns 400 for invalid address format');
      passed++;
    } else {
      fail('Returns 400 for invalid address format', `Got status ${status}`);
      failed++;
    }
  } catch (err) {
    fail('Returns 400 for invalid address format', String(err));
    failed++;
  }

  // ==========================================
  section('3. PUT Preferences (Create New)');
  // ==========================================

  try {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1, timestamp);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'polygon',
      tokenOverrides: { USDC: 'arbitrum', USDT: 'ethereum' },
      signature,
      timestamp,
    });

    const responseData = data as { success: boolean; data?: { preferences?: { defaultNetwork: string } } };

    if (status === 200 && responseData.success && responseData.data?.preferences?.defaultNetwork === 'polygon') {
      pass('Creates preferences with valid signature');
      passed++;
    } else {
      fail('Creates preferences with valid signature', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Creates preferences with valid signature', String(err));
    failed++;
  }

  // ==========================================
  section('4. GET Preferences (After Creation)');
  // ==========================================

  try {
    const { status, data } = await request('GET', `/api/address/${address1}/preferences`);

    const responseData = data as {
      success: boolean;
      data?: {
        preferences?: {
          defaultNetwork: string;
          tokenOverrides: Record<string, string>
        }
      }
    };

    if (
      status === 200 &&
      responseData.success &&
      responseData.data?.preferences?.defaultNetwork === 'polygon' &&
      responseData.data?.preferences?.tokenOverrides?.USDC === 'arbitrum'
    ) {
      pass('Returns preferences for known address');
      passed++;
    } else {
      fail('Returns preferences for known address', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Returns preferences for known address', String(err));
    failed++;
  }

  // ==========================================
  section('5. PUT Preferences (Invalid Signature)');
  // ==========================================

  try {
    const timestamp = Date.now();
    const invalidSignature = '0x' + '00'.repeat(65);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'ethereum',
      tokenOverrides: {},
      signature: invalidSignature,
      timestamp,
    });

    const responseData = data as { success: boolean; error?: { code: string } };

    if (status === 400 && responseData.error?.code === 'INVALID_SIGNATURE') {
      pass('Returns 400 for invalid signature');
      passed++;
    } else {
      fail('Returns 400 for invalid signature', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Returns 400 for invalid signature', String(err));
    failed++;
  }

  // ==========================================
  section('6. PUT Preferences (Expired Timestamp)');
  // ==========================================

  try {
    // 6 minutes ago
    const expiredTimestamp = Date.now() - 6 * 60 * 1000;
    const signature = await signPreferencesMessage(wallet1, expiredTimestamp);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'ethereum',
      tokenOverrides: {},
      signature,
      timestamp: expiredTimestamp,
    });

    const responseData = data as { success: boolean; error?: { code: string } };

    if (status === 400 && responseData.error?.code === 'TIMESTAMP_EXPIRED') {
      pass('Returns 400 for expired timestamp');
      passed++;
    } else {
      fail('Returns 400 for expired timestamp', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Returns 400 for expired timestamp', String(err));
    failed++;
  }

  // ==========================================
  section('7. PUT Preferences (Invalid Network ID)');
  // ==========================================

  try {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1, timestamp);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'invalid-network-id',
      tokenOverrides: {},
      signature,
      timestamp,
    });

    if (status === 400) {
      pass('Returns 400 for invalid network ID');
      passed++;
    } else {
      fail('Returns 400 for invalid network ID', `Got status ${status}`);
      failed++;
    }
  } catch (err) {
    fail('Returns 400 for invalid network ID', String(err));
    failed++;
  }

  // ==========================================
  section('8. PUT Preferences (Update Existing)');
  // ==========================================

  try {
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet1, timestamp);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet1.address,
      defaultNetwork: 'base',
      tokenOverrides: { DAI: 'optimism' },
      signature,
      timestamp,
    });

    const responseData = data as {
      success: boolean;
      data?: {
        preferences?: {
          defaultNetwork: string;
          tokenOverrides: Record<string, string>;
        }
      }
    };

    if (
      status === 200 &&
      responseData.success &&
      responseData.data?.preferences?.defaultNetwork === 'base' &&
      responseData.data?.preferences?.tokenOverrides?.DAI === 'optimism'
    ) {
      pass('Updates existing preferences');
      passed++;
    } else {
      fail('Updates existing preferences', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Updates existing preferences', String(err));
    failed++;
  }

  // ==========================================
  section('9. Verify Update Persisted');
  // ==========================================

  try {
    const { status, data } = await request('GET', `/api/address/${address1}/preferences`);

    const responseData = data as {
      success: boolean;
      data?: {
        preferences?: {
          defaultNetwork: string;
          tokenOverrides: Record<string, string>;
        }
      }
    };

    if (
      status === 200 &&
      responseData.data?.preferences?.defaultNetwork === 'base'
    ) {
      pass('Updated preferences persisted correctly');
      passed++;
    } else {
      fail('Updated preferences persisted correctly', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Updated preferences persisted correctly', String(err));
    failed++;
  }

  // ==========================================
  section('10. Username Lookup with Preferences');
  // ==========================================

  try {
    // Register a username for wallet2
    const username = 'preftest' + Date.now().toString().slice(-6);
    const usernameTimestamp = Date.now();
    const usernameSignature = await signUsernameMessage(wallet2, username, 'claim', usernameTimestamp);

    const registerResult = await request('POST', '/api/username', {
      username,
      address: wallet2.address,
      signature: usernameSignature,
      timestamp: usernameTimestamp,
    });

    if (registerResult.status !== 201) {
      fail('Username registration for preferences test', `Status: ${registerResult.status}`);
      failed++;
      return;
    }

    // Create preferences for wallet2
    const prefTimestamp = Date.now();
    const prefSignature = await signPreferencesMessage(wallet2, prefTimestamp);

    await request('PUT', '/api/preferences', {
      address: wallet2.address,
      defaultNetwork: 'arbitrum',
      tokenOverrides: { WETH: 'ethereum' },
      signature: prefSignature,
      timestamp: prefTimestamp,
    });

    // Lookup username - should include preferences
    const { status, data } = await request('GET', `/api/username/${username}`);

    const responseData = data as {
      success: boolean;
      data?: {
        username: string;
        preferences?: {
          defaultNetwork: string;
        } | null;
      }
    };

    if (
      status === 200 &&
      responseData.success &&
      responseData.data?.preferences?.defaultNetwork === 'arbitrum'
    ) {
      pass('Username lookup includes preferences');
      passed++;
    } else {
      fail('Username lookup includes preferences', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Username lookup includes preferences', String(err));
    failed++;
  }

  // ==========================================
  section('11. Username Lookup without Preferences');
  // ==========================================

  try {
    // Register a username for a new wallet without preferences
    const wallet3 = Wallet.createRandom();
    const username = 'nopref' + Date.now().toString().slice(-6);
    const usernameTimestamp = Date.now();
    const usernameSignature = await signUsernameMessage(wallet3, username, 'claim', usernameTimestamp);

    const registerResult = await request('POST', '/api/username', {
      username,
      address: wallet3.address,
      signature: usernameSignature,
      timestamp: usernameTimestamp,
    });

    if (registerResult.status !== 201) {
      fail('Username registration (no prefs)', `Status: ${registerResult.status}`);
      failed++;
      return;
    }

    // Lookup username - preferences should be null
    const { status, data } = await request('GET', `/api/username/${username}`);

    const responseData = data as {
      success: boolean;
      data?: {
        username: string;
        preferences?: unknown | null;
      }
    };

    if (
      status === 200 &&
      responseData.success &&
      responseData.data?.preferences === null
    ) {
      pass('Username lookup returns null preferences when none set');
      passed++;
    } else {
      fail('Username lookup returns null preferences when none set', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Username lookup returns null preferences when none set', String(err));
    failed++;
  }

  // ==========================================
  section('12. PUT Preferences with null defaultNetwork');
  // ==========================================

  try {
    const wallet4 = Wallet.createRandom();
    const timestamp = Date.now();
    const signature = await signPreferencesMessage(wallet4, timestamp);

    const { status, data } = await request('PUT', '/api/preferences', {
      address: wallet4.address,
      defaultNetwork: null,
      tokenOverrides: { USDC: 'polygon' },
      signature,
      timestamp,
    });

    const responseData = data as {
      success: boolean;
      data?: {
        preferences?: {
          defaultNetwork: string | null;
        }
      }
    };

    if (status === 200 && responseData.data?.preferences?.defaultNetwork === null) {
      pass('Accepts null as defaultNetwork');
      passed++;
    } else {
      fail('Accepts null as defaultNetwork', JSON.stringify(data));
      failed++;
    }
  } catch (err) {
    fail('Accepts null as defaultNetwork', String(err));
    failed++;
  }

  // ==========================================
  // Summary
  // ==========================================

  console.log('\n' + '='.repeat(50));
  console.log(`${colors.blue}Test Results${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${passed + failed}`);
  console.log('='.repeat(50) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
