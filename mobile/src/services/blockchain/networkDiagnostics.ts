import { ethers } from 'ethers';
import { getProvider } from './ethereumProvider';
import { rpcUrls, type Network } from '../../constants/rpcUrls';

export interface NetworkDiagnostics {
  network: Network;
  rpcUrl: string;
  isConnected: boolean;
  chainId?: number;
  blockNumber?: number;
  error?: string;
  latency?: number;
}

export async function diagnoseNetwork(network: Network): Promise<NetworkDiagnostics> {
  const startTime = Date.now();
  const rpcUrl = rpcUrls[network];
  
  try {
    console.log(`Diagnosing network: ${network} with RPC: ${rpcUrl}`);
    
    const provider = getProvider(network);
    
    // Test network connection
    const networkInfo = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    const latency = Date.now() - startTime;
    
    console.log(`Network ${network} diagnosis successful:`, {
      chainId: networkInfo.chainId,
      blockNumber,
      latency: `${latency}ms`
    });
    
    return {
      network,
      rpcUrl,
      isConnected: true,
      chainId: networkInfo.chainId,
      blockNumber,
      latency,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    console.error(`Network ${network} diagnosis failed:`, {
      error: error.message,
      code: error.code,
      reason: error.reason,
      latency: `${latency}ms`
    });
    
    return {
      network,
      rpcUrl,
      isConnected: false,
      error: error.message || 'Unknown error',
      latency,
    };
  }
}

export async function diagnoseAllNetworks(): Promise<NetworkDiagnostics[]> {
  const networks: Network[] = ['mainnet', 'sepolia'];
  const results = await Promise.all(networks.map(diagnoseNetwork));
  
  console.log('Network diagnostics complete:', results);
  return results;
}

export async function testBalanceRetrieval(address: string, network: Network): Promise<{
  success: boolean;
  balance?: string;
  error?: string;
}> {
  try {
    console.log(`Testing balance retrieval for ${address} on ${network}`);
    
    const provider = getProvider(network);
    const balance = await provider.getBalance(address);
    const balanceEth = ethers.utils.formatEther(balance);
    
    console.log(`Balance retrieval successful: ${balanceEth} ETH`);
    
    return {
      success: true,
      balance: balanceEth,
    };
  } catch (error: any) {
    console.error(`Balance retrieval failed:`, error);
    
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}