/**
 * WebSocket Authentication Helpers
 * Zero-dependency helpers for building auth payloads.
 * Actual signing is done by the app (ethers.js) — this only builds the message.
 */

import { buildWsAuthMessage } from '../constants/ws-auth';
import type { WsHandshakeAuth } from '../types/ws-auth';

/**
 * Build auth credentials for socket handshake.
 *
 * @param address - Wallet address (checksummed or lowercase)
 * @param signMessage - Platform-specific message signing function (from ethers wallet)
 * @returns Auth object to pass as socket.io `auth` option
 *
 * Usage (web/mobile):
 * ```ts
 * const auth = await buildSocketAuth(address, (msg) => wallet.signMessage(msg));
 * const socket = io(url, { auth });
 * ```
 */
export async function buildSocketAuth(
  address: string,
  signMessage: (message: string) => Promise<string>,
): Promise<WsHandshakeAuth> {
  const timestamp = Date.now();
  const message = buildWsAuthMessage(timestamp);
  const signature = await signMessage(message);

  return {
    address: address.toLowerCase(),
    signature,
    timestamp,
  };
}
