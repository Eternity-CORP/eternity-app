/**
 * FaucetClaim interface
 * Represents a faucet claim record in the database
 */

export interface FaucetClaim {
  id: string;
  walletAddress: string;
  amount: string;
  txHash: string | null;
  claimedAt: Date;
}
