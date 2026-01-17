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
  syncScheduledPayments,
  type ScheduledPayment,
  type CreateScheduledPaymentRequest,
  type UpdateScheduledPaymentRequest,
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
    const payments = await loadScheduledPayments(creatorAddress);
    return payments;
  }
);

/**
 * Load pending payments only
 */
export const loadPendingPaymentsThunk = createAsyncThunk(
  'scheduled/loadPending',
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
  async (request: CreateScheduledPaymentRequest) => {
    const newPayment = await createScheduledPayment(request);
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
    walletAddress,
  }: {
    id: string;
    updates: UpdateScheduledPaymentRequest;
    walletAddress: string;
  }) => {
    const updated = await updateScheduledPayment(id, updates, walletAddress);
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
  async ({ id, walletAddress }: { id: string; walletAddress: string }) => {
    const success = await cancelScheduledPayment(id, walletAddress);
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
  async ({ id, walletAddress }: { id: string; walletAddress: string }) => {
    const success = await deleteScheduledPayment(id, walletAddress);
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
  async ({ id, txHash, walletAddress }: { id: string; txHash: string; walletAddress: string }) => {
    const updated = await markPaymentExecuted(id, txHash, walletAddress);
    if (!updated) {
      throw new Error('Payment not found');
    }
    return updated;
  }
);

/**
 * Sync local cache with backend
 */
export const syncScheduledPaymentsThunk = createAsyncThunk(
  'scheduled/sync',
  async (address: string) => {
    await syncScheduledPayments(address);
    const payments = await loadScheduledPayments(address);
    return payments;
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
      // Load all payments
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
      // Load pending payments
      .addCase(loadPendingPaymentsThunk.fulfilled, (state, action) => {
        state.payments = action.payload;
        state.status = 'succeeded';
      })
      // Create payment
      .addCase(createScheduledPaymentThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createScheduledPaymentThunk.fulfilled, (state, action) => {
        state.payments.unshift(action.payload);
        // Sort by scheduledAt
        state.payments.sort((a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
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
          state.payments.sort((a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          );
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
      })
      // Sync
      .addCase(syncScheduledPaymentsThunk.fulfilled, (state, action) => {
        state.payments = action.payload;
        state.status = 'succeeded';
      });
  },
});

export const { selectPayment, clearSelectedPayment, clearError } = scheduledSlice.actions;
export default scheduledSlice.reducer;
