/**
 * WaitlistEntry interface
 * Represents a waitlist entry in the database
 */
export interface WaitlistEntry {
  id: string;
  email: string;
  isBetaTester: boolean;
  ip: string | null;
  userAgent: string | null;
  source: string | null;
  createdAt: Date;
}
