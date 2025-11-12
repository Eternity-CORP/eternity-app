// Simple in-memory transaction state tracker for pending operations per account index
// This is UI-layer state. If the app restarts, pending state should be rebuilt from provider receipts.

const pendingAccounts = new Set<number>();

export function markAccountPending(index: number): void {
  pendingAccounts.add(index);
}

export function clearAccountPending(index: number): void {
  pendingAccounts.delete(index);
}

export function isAccountPending(index: number): boolean {
  return pendingAccounts.has(index);
}

export function getPendingAccounts(): number[] {
  return Array.from(pendingAccounts);
}
