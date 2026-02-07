/** Truncate an Ethereum address for display: 0x1234...5678 */
export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
