/**
 * Minimal socket interface satisfied by socket.io-client Socket.
 * Allows shared code to work without depending on socket.io-client.
 */
export interface SocketLike {
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  connected: boolean;
}
