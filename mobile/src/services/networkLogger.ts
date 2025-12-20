// Network logging service for debugging and monitoring
// Helps diagnose connectivity issues and API failures

interface NetworkLog {
  timestamp: number;
  type: 'RPC' | 'API' | 'BLOCKCHAIN';
  url: string;
  method?: string;
  status?: number;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class NetworkLogger {
  private logs: NetworkLog[] = [];
  private maxLogs = 100; // Keep last 100 logs

  log(entry: Omit<NetworkLog, 'timestamp'>) {
    const logEntry: NetworkLog = {
      ...entry,
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with appropriate level
    const timeStr = new Date(logEntry.timestamp).toISOString();
    const durationStr = `${logEntry.duration}ms`;
    
    if (logEntry.success) {
      console.log(`✓ [${timeStr}] ${logEntry.type} ${logEntry.url} (${durationStr})`);
    } else {
      console.error(`✗ [${timeStr}] ${logEntry.type} ${logEntry.url} (${durationStr}) - ${logEntry.error}`);
    }

    if (logEntry.details) {
      console.log('Details:', logEntry.details);
    }
  }

  getLogs(type?: NetworkLog['type']): NetworkLog[] {
    if (type) {
      return this.logs.filter(log => log.type === type);
    }
    return [...this.logs];
  }

  getRecentErrors(minutes = 10): NetworkLog[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.logs.filter(log => !log.success && log.timestamp > cutoff);
  }

  clearLogs() {
    this.logs = [];
    console.log('Network logs cleared');
  }

  // Helper method to wrap fetch calls with logging and timeout
  async loggedFetch(url: string, options?: RequestInit, timeoutMs = 30000): Promise<Response> {
    const startTime = Date.now();

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      this.log({
        type: 'API',
        url,
        method: options?.method || 'GET',
        status: response.status,
        success: response.ok,
        duration,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      });

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Check if it's a timeout error
      const isTimeout = error.name === 'AbortError' || duration >= timeoutMs;
      const errorMessage = isTimeout
        ? `Network request timed out (${timeoutMs}ms)`
        : error?.message || 'Network error';

      this.log({
        type: 'API',
        url,
        method: options?.method || 'GET',
        success: false,
        duration,
        error: errorMessage,
        details: error,
      });

      throw error;
    }
  }

  // Helper method to log RPC calls
  logRpcCall(url: string, success: boolean, duration: number, error?: string, details?: any) {
    this.log({
      type: 'RPC',
      url,
      success,
      duration,
      error,
      details,
    });
  }

  // Helper method to log blockchain operations
  logBlockchainOp(operation: string, success: boolean, duration: number, error?: string, details?: any) {
    this.log({
      type: 'BLOCKCHAIN',
      url: operation,
      success,
      duration,
      error,
      details,
    });
  }

  // Generate diagnostic report
  generateReport(): string {
    const recentErrors = this.getRecentErrors();
    const rpcLogs = this.getLogs('RPC');
    const apiLogs = this.getLogs('API');
    
    const rpcSuccessRate = rpcLogs.length > 0 
      ? (rpcLogs.filter(l => l.success).length / rpcLogs.length * 100).toFixed(1)
      : 'N/A';
    
    const apiSuccessRate = apiLogs.length > 0
      ? (apiLogs.filter(l => l.success).length / apiLogs.length * 100).toFixed(1)
      : 'N/A';

    return `
Network Diagnostic Report
========================
Total Logs: ${this.logs.length}
Recent Errors (10min): ${recentErrors.length}

RPC Success Rate: ${rpcSuccessRate}%
API Success Rate: ${apiSuccessRate}%

Recent Errors:
${recentErrors.map(log => 
  `- ${new Date(log.timestamp).toISOString()} ${log.type} ${log.url}: ${log.error}`
).join('\n')}
    `.trim();
  }
}

// Export singleton instance
export const networkLogger = new NetworkLogger();

// Export types for external use
export type { NetworkLog };