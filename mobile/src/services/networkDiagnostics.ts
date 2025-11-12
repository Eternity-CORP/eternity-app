// Network diagnostics utility for troubleshooting connectivity issues
// Provides comprehensive testing and reporting of network services

import { networkLogger } from './networkLogger';
import { getWorkingRpcUrl } from './blockchain/ethereumProvider';
import { getEthUsdPrice } from './priceService';
import { rpcFallbacks, type Network } from '../constants/rpcUrls';

interface DiagnosticResult {
  service: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export class NetworkDiagnostics {
  private results: DiagnosticResult[] = [];

  private addResult(result: DiagnosticResult) {
    this.results.push(result);
    
    const statusIcon = result.status === 'success' ? '✓' : 
                      result.status === 'warning' ? '⚠' : '✗';
    
    console.log(`${statusIcon} ${result.service}: ${result.message}`);
    if (result.details) {
      console.log('  Details:', result.details);
    }
  }

  async testRpcConnectivity(network: Network = 'sepolia'): Promise<void> {
    const startTime = Date.now();
    
    try {
      const workingUrl = await getWorkingRpcUrl(network);
      const duration = Date.now() - startTime;
      
      this.addResult({
        service: `RPC (${network})`,
        status: 'success',
        message: `Connected successfully to ${workingUrl}`,
        duration,
        details: { url: workingUrl, network }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.addResult({
        service: `RPC (${network})`,
        status: 'error',
        message: `Failed to connect to any RPC endpoint`,
        duration,
        details: { 
          error: error?.message,
          testedUrls: rpcFallbacks[network]
        }
      });
    }
  }

  async testPriceApi(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const price = await getEthUsdPrice();
      const duration = Date.now() - startTime;
      
      if (price > 0) {
        this.addResult({
          service: 'Price API',
          status: 'success',
          message: `ETH price fetched: $${price}`,
          duration,
          details: { price }
        });
      } else {
        this.addResult({
          service: 'Price API',
          status: 'warning',
          message: 'Price API returned 0 or invalid price',
          duration,
          details: { price }
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.addResult({
        service: 'Price API',
        status: 'error',
        message: `Failed to fetch ETH price: ${error?.message}`,
        duration,
        details: { error }
      });
    }
  }

  async testInternetConnectivity(): Promise<void> {
    const testUrls = [
      'https://www.google.com',
      'https://cloudflare.com',
      'https://httpbin.org/status/200'
    ];

    let successCount = 0;
    const results: any[] = [];

    for (const url of testUrls) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          successCount++;
          results.push({ url, success: true, duration, status: response.status });
        } else {
          results.push({ url, success: false, duration, status: response.status });
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        results.push({ url, success: false, duration, error: error?.message });
      }
    }

    if (successCount === testUrls.length) {
      this.addResult({
        service: 'Internet Connectivity',
        status: 'success',
        message: 'All connectivity tests passed',
        details: { results, successRate: '100%' }
      });
    } else if (successCount > 0) {
      this.addResult({
        service: 'Internet Connectivity',
        status: 'warning',
        message: `Partial connectivity (${successCount}/${testUrls.length} tests passed)`,
        details: { results, successRate: `${(successCount/testUrls.length*100).toFixed(0)}%` }
      });
    } else {
      this.addResult({
        service: 'Internet Connectivity',
        status: 'error',
        message: 'No internet connectivity detected',
        details: { results }
      });
    }
  }

  async runFullDiagnostics(network: Network = 'sepolia'): Promise<DiagnosticResult[]> {
    console.log('🔍 Starting network diagnostics...');
    this.results = [];

    // Test internet connectivity first
    await this.testInternetConnectivity();

    // Test RPC connectivity
    await this.testRpcConnectivity(network);

    // Test price API
    await this.testPriceApi();

    // Generate summary
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    console.log('\n📊 Diagnostics Summary:');
    console.log(`✓ Success: ${successCount}`);
    console.log(`⚠ Warning: ${warningCount}`);
    console.log(`✗ Error: ${errorCount}`);

    // Add network logs summary
    const recentErrors = networkLogger.getRecentErrors(10);
    if (recentErrors.length > 0) {
      console.log(`\n🚨 Recent network errors (10min): ${recentErrors.length}`);
      recentErrors.slice(0, 5).forEach(log => {
        console.log(`  - ${log.type} ${log.url}: ${log.error}`);
      });
    }

    return this.results;
  }

  getResults(): DiagnosticResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const timestamp = new Date().toISOString();
    const networkReport = networkLogger.generateReport();
    
    const diagnosticsReport = this.results.map(result => {
      const statusIcon = result.status === 'success' ? '✓' : 
                        result.status === 'warning' ? '⚠' : '✗';
      const durationStr = result.duration ? ` (${result.duration}ms)` : '';
      return `${statusIcon} ${result.service}: ${result.message}${durationStr}`;
    }).join('\n');

    return `
Network Diagnostics Report
==========================
Generated: ${timestamp}

Service Tests:
${diagnosticsReport}

${networkReport}
    `.trim();
  }
}

// Export singleton instance
export const networkDiagnostics = new NetworkDiagnostics();

// Быстрая диагностика для основных проблем
export async function runQuickDiagnostics() {
  const results = [];
  
  try {
    // Проверка RPC Sepolia
    const sepoliaResult = await networkDiagnostics.testRpcConnectivity('sepolia');
    results.push({
      service: 'Sepolia RPC',
      status: sepoliaResult.success ? 'success' : 'error',
      message: sepoliaResult.message,
      duration: sepoliaResult.duration
    });

    // Проверка API цен
    const priceResult = await networkDiagnostics.testPriceApi();
    results.push({
      service: 'Price API',
      status: priceResult.success ? 'success' : 'error',
      message: priceResult.message,
      duration: priceResult.duration
    });

  } catch (error) {
    results.push({
      service: 'Quick Diagnostics',
      status: 'error',
      message: `Ошибка диагностики: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

// Convenience function for quick diagnostics
export async function runQuickDiagnostics(network: Network = 'sepolia'): Promise<string> {
  await networkDiagnostics.runFullDiagnostics(network);
  return networkDiagnostics.generateReport();
}