import { BigNumber, ethers } from 'ethers';
import { getProvider, getProviderWithFallback, clearProviderCache } from './ethereumProvider';
import type { Network } from '../../constants/rpcUrls';

export async function getETHBalance(address: string, network?: Network, retryCount = 0): Promise<BigNumber> {
  const maxRetries = 2;

  try {
    console.log(`💰 Getting balance for ${address.slice(0, 6)}...${address.slice(-4)}`);

    // First try with cached provider
    let provider = getProvider(network);

    try {
      const balance = await provider.getBalance(address);
      console.log(`✅ Balance: ${ethers.utils.formatEther(balance)} ETH`);
      return balance;
    } catch (providerError: any) {
      console.warn(`⚠️ Cached provider failed: ${providerError.message}`);

      // Try with fallback
      console.log(`🔄 Trying fallback RPCs...`);
      provider = await getProviderWithFallback(network);
      const balance = await provider.getBalance(address);
      console.log(`✅ Balance (via fallback): ${ethers.utils.formatEther(balance)} ETH`);
      return balance;
    }
  } catch (error: any) {
    console.error(`❌ Failed to get balance: ${error.message}`);

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
      clearProviderCache(network);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return getETHBalance(address, network, retryCount + 1);
    }

    // If all retries fail, return zero balance instead of throwing
    console.error('⚠️ All balance attempts failed, returning 0');
    return ethers.BigNumber.from(0);
  }
}

export function formatBalance(balance: BigNumber): string {
  try {
    return Number(ethers.utils.formatEther(balance)).toFixed(6);
  } catch {
    return ethers.utils.formatEther(balance);
  }
}

export function autoRefreshBalance(
  address: string,
  onUpdate: (balance: BigNumber) => void,
  intervalMs = 30000,
  network?: Network,
): () => void {
  let cancelled = false;

  const fetch = async () => {
    if (cancelled) return;
    
    try {
      console.log(`Refreshing balance for ${address} on ${network || 'default network'}`);
      const bal = await getETHBalance(address, network);
      if (!cancelled) {
        console.log(`Balance updated: ${bal.toString()}`);
        onUpdate(bal);
      }
    } catch (e: any) {
      console.warn(`Failed to refresh balance for ${address} on ${network || 'default'}:`, {
        message: e?.message,
        code: e?.code,
        reason: e?.reason,
        error: e
      });
    }
  };

  // initial fetch
  fetch();
  const timer = setInterval(fetch, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
