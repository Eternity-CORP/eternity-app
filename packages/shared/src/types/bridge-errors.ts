/**
 * Unified bridge error types
 */

export type BridgeErrorCode =
  | 'APPROVAL_FAILED'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'USER_REJECTED'
  | 'INSUFFICIENT_GAS'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'BRIDGE_TIMEOUT'
  | 'APPROVAL_REJECTED'
  | 'BRIDGE_TX_REJECTED'
  | 'BRIDGE_TX_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
  canRetry?: boolean;
  canSendAlternative?: boolean;
}
