/**
 * Formatting utilities
 */

/**
 * Truncate an Ethereum address for display
 * @param address - The full address to truncate
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Truncate a transaction hash for display
 * @param hash - The full tx hash to truncate
 * @param startChars - Number of characters to show at start (default: 10)
 * @param endChars - Number of characters to show at end (default: 8)
 */
export function truncateTxHash(
  hash: string,
  startChars: number = 10,
  endChars: number = 8
): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
