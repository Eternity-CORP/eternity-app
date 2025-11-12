/**
 * Split Bills Store
 * 
 * Zustand store for managing split bills with AsyncStorage persistence
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type {
  SplitBill,
  SplitBillsState,
  CreateSplitBillInput,
  UpdateParticipantStatusInput,
  SplitParticipant,
} from '../types';
import { calculateSplit } from '../utils/calculator';
import { validateAndThrow, getChecksumAddress } from '../utils/validators';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = '@split_bills';

// ============================================================================
// Store
// ============================================================================

export const useSplitBills = create<SplitBillsState>((set, get) => ({
  // Data
  bills: {},

  // Actions
  addBill: (input: CreateSplitBillInput): SplitBill => {
    // Validate input
    validateAndThrow(input);

    // Generate ID
    const billId = uuidv4();

    // Checksum addresses
    const participants: SplitParticipant[] = input.participants.map((p) => ({
      id: uuidv4(),
      address: getChecksumAddress(p.address),
      weight: p.weight,
      payStatus: 'pending',
      note: p.note,
    }));

    // Calculate splits
    const decimals = input.asset.decimals || 18;
    const calculation = calculateSplit({
      totalHuman: input.totalHuman,
      tipPercent: input.tipPercent || 0,
      mode: input.mode,
      participants: participants.map((p) => ({
        id: p.id,
        weight: p.weight,
      })),
      rounding: input.rounding || 'floor',
      remainderStrategy: input.remainderStrategy || 'first',
      remainderTopN: input.remainderTopN,
      decimals,
    });

    // Assign amounts to participants
    calculation.participantAmounts.forEach((amount) => {
      const participant = participants.find((p) => p.id === amount.participantId);
      if (participant) {
        participant.amountSmallestUnit = amount.amountSmallestUnit;
      }
    });

    // Create bill
    const bill: SplitBill = {
      id: billId,
      chainId: input.chainId,
      asset: input.asset,
      totalHuman: input.totalHuman,
      tipPercent: input.tipPercent,
      mode: input.mode,
      participants,
      rounding: input.rounding || 'floor',
      remainderStrategy: input.remainderStrategy || 'first',
      remainderTopN: input.remainderTopN,
      createdAt: Date.now(),
      note: input.note,
      totalWithTipSmallestUnit: calculation.totalWithTipSmallestUnit,
      remainderSmallestUnit: calculation.remainderSmallestUnit,
    };

    // Add to store
    set((state) => ({
      bills: {
        ...state.bills,
        [billId]: bill,
      },
    }));

    // Persist
    persistBills(get().bills);

    return bill;
  },

  updateParticipantStatus: (input: UpdateParticipantStatusInput): void => {
    const { billId, participantId, payStatus, txHash } = input;

    set((state) => {
      const bill = state.bills[billId];
      if (!bill) {
        return state;
      }

      const updatedParticipants = bill.participants.map((p) =>
        p.id === participantId
          ? { ...p, payStatus, txHash }
          : p
      );

      return {
        bills: {
          ...state.bills,
          [billId]: {
            ...bill,
            participants: updatedParticipants,
            updatedAt: Date.now(),
          },
        },
      };
    });

    // Persist
    persistBills(get().bills);
  },

  deleteBill: (billId: string): void => {
    set((state) => {
      const { [billId]: removed, ...remaining } = state.bills;
      return { bills: remaining };
    });

    // Persist
    persistBills(get().bills);
  },

  getBill: (billId: string): SplitBill | undefined => {
    return get().bills[billId];
  },

  getAllBills: (): SplitBill[] => {
    return Object.values(get().bills).sort((a, b) => b.createdAt - a.createdAt);
  },

  getPendingBills: (): SplitBill[] => {
    return Object.values(get().bills)
      .filter((bill) =>
        bill.participants.some((p) => p.payStatus === 'pending')
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  // Internal
  _hydrate: (bills: Record<string, SplitBill>): void => {
    set({ bills });
  },
}));

// ============================================================================
// Persistence
// ============================================================================

/**
 * Persist bills to AsyncStorage
 */
async function persistBills(bills: Record<string, SplitBill>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch (error) {
    console.error('Failed to persist split bills:', error);
  }
}

/**
 * Load bills from AsyncStorage
 */
export async function loadSplitBills(): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const bills = JSON.parse(data);
      useSplitBills.getState()._hydrate(bills);
    }
  } catch (error) {
    console.error('Failed to load split bills:', error);
  }
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get bill by ID
 */
export const selectBillById = (billId: string) => (state: SplitBillsState) =>
  state.bills[billId];

/**
 * Get all bills
 */
export const selectAllBills = (state: SplitBillsState) =>
  Object.values(state.bills).sort((a, b) => b.createdAt - a.createdAt);

/**
 * Get pending bills
 */
export const selectPendingBills = (state: SplitBillsState) =>
  Object.values(state.bills)
    .filter((bill) =>
      bill.participants.some((p) => p.payStatus === 'pending')
    )
    .sort((a, b) => b.createdAt - a.createdAt);

/**
 * Get completed bills
 */
export const selectCompletedBills = (state: SplitBillsState) =>
  Object.values(state.bills)
    .filter((bill) =>
      bill.participants.every((p) => p.payStatus === 'paid')
    )
    .sort((a, b) => b.createdAt - a.createdAt);

/**
 * Get bill statistics
 */
export const selectBillStats = (state: SplitBillsState) => {
  const bills = Object.values(state.bills);
  return {
    total: bills.length,
    pending: bills.filter((b) =>
      b.participants.some((p) => p.payStatus === 'pending')
    ).length,
    completed: bills.filter((b) =>
      b.participants.every((p) => p.payStatus === 'paid')
    ).length,
  };
};
