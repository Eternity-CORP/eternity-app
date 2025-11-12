import { ethers } from 'ethers';
import { rpcUrls, rpcFallbacks, defaultNetwork, type Network } from '../../constants/rpcUrls';
import { networkLogger } from '../networkLogger';
import { getSelectedNetwork } from '../networkService';

let cachedProviders: Partial<Record<Network, ethers.providers.JsonRpcProvider>> = {};

const networkConfig: Record<Network, { name: string; chainId: number }> = {
  mainnet: { name: 'homestead', chainId: 1 },
  sepolia: { name: 'sepolia', chainId: 11155111 },
  holesky: { name: 'holesky', chainId: 17000 },
};

// RPC connection timeout in milliseconds
const RPC_TIMEOUT_MS = 5000; // 5 seconds for faster fallback

/**
 * Find first working RPC URL from fallback list
 * Tests each URL with a timeout and returns the first one that responds
 */
async function findWorkingRpcUrl(network: Network): Promise<string> {
  const urls = rpcFallbacks[network];
  const config = networkConfig[network];

  console.log(`🔍 Testing ${urls.length} RPC endpoints for ${network}...`);

  for (const url of urls) {
    // Skip empty URLs from env vars
    if (!url) continue;

    const startTime = Date.now();

    try {
      // Create a simple provider
      const provider = new ethers.providers.JsonRpcProvider(url, {
        name: config.name,
        chainId: config.chainId,
      });

      // Quick test with timeout
      const blockNumberPromise = provider.getBlockNumber();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), RPC_TIMEOUT_MS)
      );

      const blockNumber = await Promise.race([blockNumberPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      if (blockNumber > 0) {
        console.log(`✅ RPC ${url} works! Block: ${blockNumber} (${duration}ms)`);
        networkLogger.logRpcCall(url, true, duration, undefined, { blockNumber, network });
        return url;
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ RPC ${url} failed: ${error.message} (${duration}ms)`);
      networkLogger.logRpcCall(url, false, duration, error?.message, { network });
      continue;
    }
  }

  // If all fail, return first non-empty URL and let it fail naturally
  const firstUrl = urls.find(url => url);
  console.warn(`⚠️ All RPC tests failed for ${network}, using first URL: ${firstUrl}`);
  return firstUrl || urls[0];
}

export function getProvider(network?: Network): ethers.providers.JsonRpcProvider {
  // Use provided network or default
  const targetNetwork = network || defaultNetwork;

  if (cachedProviders[targetNetwork]) {
    console.log(`♻️ Using cached provider for ${targetNetwork}`);
    return cachedProviders[targetNetwork]!;
  }

  // Get first non-empty URL from fallback list
  const urls = rpcFallbacks[targetNetwork];
  const url = urls.find(u => u) || urls[0];
  const config = networkConfig[targetNetwork];

  console.log(`🔌 Creating provider for ${targetNetwork} with ${url}`);

  const provider = new ethers.providers.JsonRpcProvider(url, {
    name: config.name,
    chainId: config.chainId,
  });

  cachedProviders[targetNetwork] = provider;
  return provider;
}

/**
 * Get provider for the currently selected network
 * Uses AsyncStorage-persisted network selection
 */
export async function getActiveProvider(): Promise<ethers.providers.JsonRpcProvider> {
  const selectedNetwork = await getSelectedNetwork();
  return getProvider(selectedNetwork);
}

export async function getProviderWithFallback(network?: Network): Promise<ethers.providers.JsonRpcProvider> {
  // Use provided network or default
  const targetNetwork = network || defaultNetwork;

  console.log(`🔄 Finding working RPC for ${targetNetwork}...`);

  // Clear cache to force reconnection
  delete cachedProviders[targetNetwork];

  // Find a working RPC URL
  const workingUrl = await findWorkingRpcUrl(targetNetwork);
  const config = networkConfig[targetNetwork];

  console.log(`✅ Creating provider with: ${workingUrl}`);

  const provider = new ethers.providers.JsonRpcProvider(workingUrl, {
    name: config.name,
    chainId: config.chainId,
  });

  cachedProviders[targetNetwork] = provider;
  return provider;
}

/**
 * Get provider with fallback for the currently selected network
 * Uses AsyncStorage-persisted network selection
 */
export async function getActiveProviderWithFallback(): Promise<ethers.providers.JsonRpcProvider> {
  const selectedNetwork = await getSelectedNetwork();
  return getProviderWithFallback(selectedNetwork);
}

// Export a function to clear cache manually
export function clearProviderCache(network?: Network) {
  if (network) {
    delete cachedProviders[network];
    console.log(`🗑️ Cleared provider cache for ${network}`);
  } else {
    cachedProviders = {};
    console.log(`🗑️ Cleared all provider caches`);
  }
}

export const provider = getProvider();
