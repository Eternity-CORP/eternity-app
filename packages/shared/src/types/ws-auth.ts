/**
 * WebSocket Authentication Types
 * Signature-based auth for socket connections.
 * Zero runtime dependencies — only type definitions.
 */

/** Auth credentials sent during socket handshake */
export interface WsAuthCredentials {
  address: string;
  signature: string;
  timestamp: number;
}

/** Result of server-side auth verification */
export interface WsAuthResult {
  authenticated: boolean;
  address?: string;
  error?: string;
}

/** Socket handshake auth payload (matches socket.io auth option) */
export interface WsHandshakeAuth {
  address: string;
  signature: string;
  timestamp: number;
}
