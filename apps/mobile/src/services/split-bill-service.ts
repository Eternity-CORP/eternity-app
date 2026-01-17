/**
 * Split Bill Service
 * Manages split bill requests with local storage
 */

import Storage from '@/src/utils/storage';

const SPLIT_BILLS_KEY = 'split_bills';

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'paid';

export interface SplitParticipant {
  address: string;
  username?: string;
  name?: string;
  amount: string;
  status: ParticipantStatus;
  paidTxHash?: string;
  paidAt?: number;
}

export interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  createdAt: number;
  updatedAt: number;
  status: SplitBillStatus;
}

export interface CreateSplitBillRequest {
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: Array<{
    address: string;
    username?: string;
    name?: string;
    amount: string;
  }>;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load all split bills from storage
 */
async function loadAllSplitBills(): Promise<SplitBill[]> {
  try {
    const data = await Storage.getItem(SPLIT_BILLS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading split bills:', error);
    return [];
  }
}

/**
 * Save split bills to storage
 */
async function saveSplitBills(bills: SplitBill[]): Promise<void> {
  try {
    await Storage.setItem(SPLIT_BILLS_KEY, JSON.stringify(bills));
  } catch (error) {
    console.error('Error saving split bills:', error);
    throw error;
  }
}

/**
 * Create a new split bill
 */
export async function createSplitBill(
  request: CreateSplitBillRequest
): Promise<SplitBill> {
  const bills = await loadAllSplitBills();

  const newBill: SplitBill = {
    id: generateId(),
    creatorAddress: request.creatorAddress,
    creatorUsername: request.creatorUsername,
    recipientAddress: request.recipientAddress,
    totalAmount: request.totalAmount,
    tokenSymbol: request.tokenSymbol,
    description: request.description,
    participants: request.participants.map((p) => ({
      ...p,
      status: 'pending' as ParticipantStatus,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'active',
  };

  bills.push(newBill);
  await saveSplitBills(bills);

  return newBill;
}

/**
 * Get split bill by ID
 */
export async function getSplitBill(id: string): Promise<SplitBill> {
  const bills = await loadAllSplitBills();
  const bill = bills.find((b) => b.id === id);

  if (!bill) {
    throw new Error('Split bill not found');
  }

  return bill;
}

/**
 * Get split bills created by user
 */
export async function getCreatedSplitBills(
  creatorAddress: string
): Promise<SplitBill[]> {
  const bills = await loadAllSplitBills();
  return bills
    .filter((b) => b.creatorAddress.toLowerCase() === creatorAddress.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get pending split bills where user needs to pay
 */
export async function getPendingSplitBills(
  address: string
): Promise<SplitBill[]> {
  const bills = await loadAllSplitBills();
  return bills
    .filter((b) => {
      // Find bills where this address is a participant with pending status
      const participant = b.participants.find(
        (p) => p.address.toLowerCase() === address.toLowerCase()
      );
      return participant && participant.status === 'pending' && b.status === 'active';
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Cancel a split bill
 */
export async function cancelSplitBill(id: string): Promise<SplitBill> {
  const bills = await loadAllSplitBills();
  const index = bills.findIndex((b) => b.id === id);

  if (index === -1) {
    throw new Error('Split bill not found');
  }

  bills[index] = {
    ...bills[index],
    status: 'cancelled',
    updatedAt: Date.now(),
  };

  await saveSplitBills(bills);
  return bills[index];
}

/**
 * Mark participant as paid
 */
export async function markParticipantPaid(
  splitId: string,
  participantAddress: string,
  txHash: string
): Promise<SplitBill> {
  const bills = await loadAllSplitBills();
  const index = bills.findIndex((b) => b.id === splitId);

  if (index === -1) {
    throw new Error('Split bill not found');
  }

  const bill = bills[index];
  const participantIndex = bill.participants.findIndex(
    (p) => p.address.toLowerCase() === participantAddress.toLowerCase()
  );

  if (participantIndex === -1) {
    throw new Error('Participant not found');
  }

  // Update participant
  bill.participants[participantIndex] = {
    ...bill.participants[participantIndex],
    status: 'paid',
    paidTxHash: txHash,
    paidAt: Date.now(),
  };

  // Check if all participants have paid
  const allPaid = bill.participants.every((p) => p.status === 'paid');
  if (allPaid) {
    bill.status = 'completed';
  }

  bill.updatedAt = Date.now();
  bills[index] = bill;

  await saveSplitBills(bills);
  return bill;
}

/**
 * Calculate equal split amounts
 */
export function calculateEqualSplit(
  totalAmount: string,
  participantCount: number
): string {
  const total = parseFloat(totalAmount);
  if (isNaN(total) || participantCount <= 0) {
    return '0';
  }
  const perPerson = total / participantCount;
  return perPerson.toFixed(6);
}

/**
 * Validate split amounts sum to total
 */
export function validateSplitAmounts(
  totalAmount: string,
  amounts: string[]
): boolean {
  const total = parseFloat(totalAmount);
  const sum = amounts.reduce((acc, amt) => acc + parseFloat(amt || '0'), 0);
  // Allow small rounding error
  return Math.abs(total - sum) < 0.000001;
}
