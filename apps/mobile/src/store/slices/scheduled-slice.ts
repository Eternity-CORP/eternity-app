/**
 * Scheduled Payments Redux Slice
 * Manages scheduled payment state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  loadScheduledPayments,
  createScheduledPayment,
  updateScheduledPayment,
  cancelScheduledPayment,
  deleteScheduledPayment,
  markPaymentExecuted,
  getPendingPayments,
  type ScheduledPayment,
  type RecurringInterval,
} from '@/src/services/scheduled-payment-service';

interface ScheduledState {
  payments: ScheduledPayment[];
  selectedPayment: ScheduledPayment | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ScheduledState = {
  payments: [],
  selectedPayment: null,
  status: 'idle',
  error: null,
};

/**
 * Load all scheduled payments for an address
 */
export const loadScheduledPaymentsThunk = createAsyncThunk(
  'scheduled/loadPayments',
  async (creatorAddress: string) => {
    const payments = await getPendingPayments(creatorAddress);
    return payments;
  }
);

/**
 * Create a new scheduled payment
 */
export const createScheduledPaymentThunk = createAsyncThunk(
  'scheduled/createPayment',
  async (payment: {
    creatorAddress: string;
    recipient: string;
    recipientUsername?: string;
    recipientName?: string;
    amount: string;
    tokenSymbol: string;
    scheduledAt: number;
    recurring?: {
      interval: RecurringInterval;
      endDate?: number;
    };
    description?: string;
  }) => {
    const newPayment = await createScheduledPayment(payment);
    return newPayment;
  }
);

/**
 * Update a scheduled payment
 */
export const updateScheduledPaymentThunk = createAsyncThunk(
  'scheduled/updatePayment',
  async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<{
      recipient: string;
      recipientUsername?: string;
      recipientName?: string;
      amount: string;
      tokenSymbol: string;
      scheduledAt: number;
      recurring?: {
        interval: RecurringInterval;
        endDate?: number;
      };
      description?: string;
    }>;
  }) => {
    const updated = await updateScheduledPayment(id, updates);
    if (!updated) {
      throw new Error('Payment not found');
    }
    return updated;
  }
);

/**
 * Cancel a scheduled payment
 */
export const cancelScheduledPaymentThunk = createAsyncThunk(
  'scheduled/cancelPayment',
  async (id: string) => {
    const success = await cancelScheduledPayment(id);
    if (!success) {
      throw new Error('Payment not found');
    }
    return id;
  }
);

/**
 * Delete a scheduled payment permanently
 */
export const deleteScheduledPaymentThunk = createAsyncThunk(
  'scheduled/deletePayment',
  async (id: string) => {
    const success = await deleteScheduledPayment(id);
    if (!success) {
      throw new Error('Payment not found');
    }
    return id;
  }
);

/**
 * Mark a payment as executed
 */
export const markPaymentExecutedThunk = createAsyncThunk(
  'scheduled/markExecuted',
  async ({ id, txHash }: { id: string; txHash: string }) => {
    const updated = await markPaymentExecuted(id, txHash);
    if (!updated) {
      throw new Error('Payment not found');
    }
    return updated;
  }
);

const scheduledSlice = createSlice({
  name: 'scheduled',
  initialState,
  reducers: {
    selectPayment: (state, action: PayloadAction<ScheduledPayment | null>) => {
      state.selectedPayment = action.payload;
    },
    clearSelectedPayment: (state) => {
      state.selectedPayment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load payments
      .addCase(loadScheduledPaymentsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadScheduledPaymentsThunk.fulfilled, (state, action) => {
        state.payments = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(loadScheduledPaymentsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load payments';
      })
      // Create payment
      .addCase(createScheduledPaymentThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createScheduledPaymentThunk.fulfilled, (state, action) => {
        state.payments.push(action.payload);
        state.payments.sort((a, b) => a.scheduledAt - b.scheduledAt);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createScheduledPaymentThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create payment';
      })
      // Update payment
      .addCase(updateScheduledPaymentThunk.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
          state.payments.sort((a, b) => a.scheduledAt - b.scheduledAt);
        }
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
        state.status = 'succeeded';
      })
      .addCase(updateScheduledPaymentThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to update payment';
      })
      // Cancel payment
      .addCase(cancelScheduledPaymentThunk.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
        if (state.selectedPayment?.id === action.payload) {
          state.selectedPayment = null;
        }
        state.status = 'succeeded';
      })
      // Delete payment
      .addCase(deleteScheduledPaymentThunk.fulfilled, (state, action) => {
        state.payments = state.payments.filter((p) => p.id !== action.payload);
        if (state.selectedPayment?.id === action.payload) {
          state.selectedPayment = null;
        }
        state.status = 'succeeded';
      })
      // Mark executed
      .addCase(markPaymentExecutedThunk.fulfilled, (state, action) => {
        // Remove the executed payment from pending list
        state.payments = state.payments.filter((p) => p.id !== action.payload.id);
        state.status = 'succeeded';
      });
  },
});

export const { selectPayment, clearSelectedPayment, clearError } = scheduledSlice.actions;
export default scheduledSlice.reducer;
