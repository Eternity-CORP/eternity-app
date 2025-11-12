/**
 * Scheduled Payments Store (Zustand)
 * 
 * Manages scheduled payment state with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScheduledPayment,
  CreateScheduledPaymentInput,
  UpdateScheduledPaymentInput,
  ScheduledPaymentFilter,
  PaymentStatus,
} from '../types';
import { computeNextRunAt } from '../utils/time-helpers';
import { validateCreateInput, validateUpdateInput } from '../utils/validators';
import { ScheduledPaymentValidationError } from '../types';

// ============================================================================
// Store State
// ============================================================================

interface ScheduledPaymentsState {
  // Data
  payments: Record<string, ScheduledPayment>;
  
  // Indexes for fast lookup
  byNextRunAt: string[]; // Sorted by nextRunAt (ascending)
  
  // Actions
  addPayment: (input: CreateScheduledPaymentInput) => ScheduledPayment;
  updatePayment: (input: UpdateScheduledPaymentInput) => void;
  removePayment: (id: string) => void;
  pausePayment: (id: string) => void;
  resumePayment: (id: string) => void;
  
  // Queries
  getPayment: (id: string) => ScheduledPayment | undefined;
  getAllPayments: () => ScheduledPayment[];
  getPaymentsByFilter: (filter: ScheduledPaymentFilter) => ScheduledPayment[];
  getDuePayments: (now?: number) => ScheduledPayment[];
  
  // Internal
  _updateIndexes: () => void;
  _updatePaymentStatus: (
    id: string,
    updates: Partial<ScheduledPayment>
  ) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useScheduledPayments = create<ScheduledPaymentsState>()(
  persist(
    (set, get) => ({
      // Initial state
      payments: {},
      byNextRunAt: [],

      // ====================================================================
      // Actions
      // ====================================================================

      addPayment: (input: CreateScheduledPaymentInput): ScheduledPayment => {
        // Validate input
        const validation = validateCreateInput(input);
        if (!validation.valid) {
          throw new ScheduledPaymentValidationError(
            'Invalid payment input',
            validation.errors
          );
        }

        // Create payment
        const now = Date.now();
        const payment: ScheduledPayment = {
          id: uuidv4(),
          kind: input.kind,
          chainId: input.chainId,
          asset: input.asset,
          fromAccountId: input.fromAccountId,
          to: input.to,
          amountHuman: input.amountHuman,
          createdAt: now,
          scheduleAt: input.scheduleAt,
          rrule: input.rrule,
          tz: input.tz,
          maxFeePerGasCap: input.maxFeePerGasCap,
          maxPriorityFeePerGasCap: input.maxPriorityFeePerGasCap,
          note: input.note,
          status: 'scheduled',
          runCount: 0,
          failCount: 0,
          nextRunAt: undefined,
        };

        // Compute next run time
        payment.nextRunAt = computeNextRunAt(payment);

        // Add to store
        set((state) => ({
          payments: {
            ...state.payments,
            [payment.id]: payment,
          },
        }));

        // Update indexes
        get()._updateIndexes();

        return payment;
      },

      updatePayment: (input: UpdateScheduledPaymentInput): void => {
        // Validate input
        const validation = validateUpdateInput(input);
        if (!validation.valid) {
          throw new ScheduledPaymentValidationError(
            'Invalid update input',
            validation.errors
          );
        }

        const payment = get().payments[input.id];
        if (!payment) {
          throw new Error(`Payment not found: ${input.id}`);
        }

        // Cannot update completed payments
        if (payment.status === 'completed') {
          throw new Error('Cannot update completed payment');
        }

        // Update payment
        const updated: ScheduledPayment = {
          ...payment,
          amountHuman: input.amountHuman ?? payment.amountHuman,
          scheduleAt: input.scheduleAt ?? payment.scheduleAt,
          rrule: input.rrule ?? payment.rrule,
          tz: input.tz ?? payment.tz,
          maxFeePerGasCap: input.maxFeePerGasCap ?? payment.maxFeePerGasCap,
          maxPriorityFeePerGasCap:
            input.maxPriorityFeePerGasCap ?? payment.maxPriorityFeePerGasCap,
          note: input.note ?? payment.note,
        };

        // Recompute next run time
        updated.nextRunAt = computeNextRunAt(updated);

        set((state) => ({
          payments: {
            ...state.payments,
            [input.id]: updated,
          },
        }));

        get()._updateIndexes();
      },

      removePayment: (id: string): void => {
        set((state) => {
          const { [id]: removed, ...rest } = state.payments;
          return { payments: rest };
        });

        get()._updateIndexes();
      },

      pausePayment: (id: string): void => {
        const payment = get().payments[id];
        if (!payment) {
          throw new Error(`Payment not found: ${id}`);
        }

        if (payment.status === 'completed') {
          throw new Error('Cannot pause completed payment');
        }

        get()._updatePaymentStatus(id, {
          status: 'paused',
          nextRunAt: undefined,
        });
      },

      resumePayment: (id: string): void => {
        const payment = get().payments[id];
        if (!payment) {
          throw new Error(`Payment not found: ${id}`);
        }

        if (payment.status !== 'paused') {
          throw new Error('Payment is not paused');
        }

        const updated: ScheduledPayment = {
          ...payment,
          status: 'scheduled',
        };

        updated.nextRunAt = computeNextRunAt(updated);

        set((state) => ({
          payments: {
            ...state.payments,
            [id]: updated,
          },
        }));

        get()._updateIndexes();
      },

      // ====================================================================
      // Queries
      // ====================================================================

      getPayment: (id: string): ScheduledPayment | undefined => {
        return get().payments[id];
      },

      getAllPayments: (): ScheduledPayment[] => {
        return Object.values(get().payments);
      },

      getPaymentsByFilter: (
        filter: ScheduledPaymentFilter
      ): ScheduledPayment[] => {
        let payments = get().getAllPayments();

        if (filter.kind) {
          payments = payments.filter((p) => p.kind === filter.kind);
        }

        if (filter.status) {
          payments = payments.filter((p) => p.status === filter.status);
        }

        if (filter.chainId) {
          payments = payments.filter((p) => p.chainId === filter.chainId);
        }

        if (filter.fromAccountId) {
          payments = payments.filter(
            (p) => p.fromAccountId === filter.fromAccountId
          );
        }

        if (filter.dueBefore) {
          payments = payments.filter(
            (p) => p.nextRunAt && p.nextRunAt <= filter.dueBefore!
          );
        }

        return payments;
      },

      getDuePayments: (now: number = Date.now()): ScheduledPayment[] => {
        const state = get();
        const dueIds: string[] = [];

        // Use index for fast lookup
        for (const id of state.byNextRunAt) {
          const payment = state.payments[id];
          if (!payment || !payment.nextRunAt) continue;

          // Stop when we reach future payments
          if (payment.nextRunAt > now) break;

          // Only scheduled payments (not paused/running/completed)
          if (payment.status === 'scheduled') {
            dueIds.push(id);
          }
        }

        return dueIds.map((id) => state.payments[id]);
      },

      // ====================================================================
      // Internal
      // ====================================================================

      _updateIndexes: (): void => {
        const payments = get().getAllPayments();

        // Sort by nextRunAt (ascending, undefined last)
        const sorted = payments
          .filter((p) => p.nextRunAt !== undefined)
          .sort((a, b) => a.nextRunAt! - b.nextRunAt!)
          .map((p) => p.id);

        set({ byNextRunAt: sorted });
      },

      _updatePaymentStatus: (
        id: string,
        updates: Partial<ScheduledPayment>
      ): void => {
        const payment = get().payments[id];
        if (!payment) return;

        const updated = { ...payment, ...updates };

        set((state) => ({
          payments: {
            ...state.payments,
            [id]: updated,
          },
        }));

        get()._updateIndexes();
      },
    }),
    {
      name: 'scheduled-payments',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Only persist payments, not indexes (will be rebuilt on load)
      partialize: (state) => ({ payments: state.payments }),
      onRehydrateStorage: () => (state) => {
        // Rebuild indexes after rehydration
        if (state) {
          state._updateIndexes();
        }
      },
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get payment by ID
 */
export const selectPayment = (id: string) => (state: ScheduledPaymentsState) =>
  state.getPayment(id);

/**
 * Get all payments
 */
export const selectAllPayments = (state: ScheduledPaymentsState) =>
  state.getAllPayments();

/**
 * Get payments by status
 */
export const selectPaymentsByStatus =
  (status: PaymentStatus) => (state: ScheduledPaymentsState) =>
    state.getPaymentsByFilter({ status });

/**
 * Get due payments
 */
export const selectDuePayments = (state: ScheduledPaymentsState) =>
  state.getDuePayments();
