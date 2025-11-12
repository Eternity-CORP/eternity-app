import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplitBill, SplitBillParticipant, SplitMode } from '../types/splitBill.types';

const SPLIT_BILL_STORAGE_KEY = '@split_bills_history';

/**
 * Generate a unique ID for a split bill
 */
export function generateSplitBillId(): string {
  return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a shareable link with the user's address
 * This link can be copied and sent to friends
 *
 * Deep link format: eternitywallet://pay-split-bill?to=ADDRESS&amount=AMOUNT&participants=COUNT
 * Universal link format: https://eternitywallet.app/pay-split-bill?to=ADDRESS&amount=AMOUNT&participants=COUNT
 */
export function generateShareableLink(creatorAddress: string, amount: string, participantsCount: number, totalAmount?: string): string {
  // Use deep link scheme for now
  // TODO: Set up universal links (https://eternitywallet.app) when you have a domain
  const scheme = 'eternitywallet://';
  const path = 'pay-split-bill';

  const params = new URLSearchParams({
    to: creatorAddress,
    amount: amount,
    participants: participantsCount.toString(),
  });

  if (totalAmount) {
    params.append('total', totalAmount);
  }

  return `${scheme}${path}?${params.toString()}`;
}

/**
 * Calculate amounts for equal split
 */
export function calculateEqualSplit(totalAmount: string, participantsCount: number): string {
  const total = parseFloat(totalAmount);
  if (isNaN(total) || participantsCount === 0) {
    return '0';
  }
  const perPerson = total / participantsCount;
  return perPerson.toFixed(6);
}

/**
 * Validate that custom amounts add up to total
 */
export function validateCustomSplit(totalAmount: string, participants: SplitBillParticipant[]): boolean {
  const total = parseFloat(totalAmount);
  const sum = participants.reduce((acc, p) => acc + parseFloat(p.amount || '0'), 0);
  // Allow small floating point differences (0.000001 ETH)
  return Math.abs(total - sum) < 0.000001;
}

/**
 * Save split bill to history
 */
export async function saveSplitBill(bill: SplitBill): Promise<void> {
  try {
    const historyJson = await AsyncStorage.getItem(SPLIT_BILL_STORAGE_KEY);
    const history: SplitBill[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new bill or update existing
    const existingIndex = history.findIndex(b => b.id === bill.id);
    if (existingIndex >= 0) {
      history[existingIndex] = bill;
    } else {
      history.unshift(bill); // Add to beginning
    }

    await AsyncStorage.setItem(SPLIT_BILL_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving split bill:', error);
    throw error;
  }
}

/**
 * Get all split bills from history
 */
export async function getSplitBillHistory(): Promise<SplitBill[]> {
  try {
    const historyJson = await AsyncStorage.getItem(SPLIT_BILL_STORAGE_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error loading split bill history:', error);
    return [];
  }
}

/**
 * Get a specific split bill by ID
 */
export async function getSplitBillById(id: string): Promise<SplitBill | null> {
  try {
    const history = await getSplitBillHistory();
    return history.find(bill => bill.id === id) || null;
  } catch (error) {
    console.error('Error loading split bill:', error);
    return null;
  }
}

/**
 * Delete a split bill from history
 */
export async function deleteSplitBill(id: string): Promise<void> {
  try {
    const history = await getSplitBillHistory();
    const filtered = history.filter(bill => bill.id !== id);
    await AsyncStorage.setItem(SPLIT_BILL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting split bill:', error);
    throw error;
  }
}

/**
 * Create a new split bill
 */
export function createSplitBill(
  totalAmount: string,
  participantsCount: number,
  creatorAddress: string,
  mode: SplitMode = 'equal'
): SplitBill {
  const id = generateSplitBillId();
  const equalAmount = calculateEqualSplit(totalAmount, participantsCount);

  const participants: SplitBillParticipant[] = Array.from({ length: participantsCount }, (_, i) => ({
    id: `participant_${i}`,
    address: '',
    amount: mode === 'equal' ? equalAmount : '0',
  }));

  const shareableLink = generateShareableLink(creatorAddress, equalAmount, participantsCount, totalAmount);

  return {
    id,
    totalAmount,
    currency: 'ETH',
    mode,
    participants,
    creatorAddress,
    status: 'draft',
    createdAt: Date.now(),
    shareableLink,
  };
}
