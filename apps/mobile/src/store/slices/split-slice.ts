/**
 * Split Bill Redux Slice
 * Manages split bill state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  createSplitBill,
  getSplitBill,
  getCreatedSplitBills,
  getPendingSplitBills,
  cancelSplitBill,
  markParticipantPaid,
  type SplitBill,
  type CreateSplitBillRequest,
} from '@/src/services/split-bill-service';

interface SplitState {
  createdSplits: SplitBill[];
  pendingSplits: SplitBill[];
  selectedSplit: SplitBill | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SplitState = {
  createdSplits: [],
  pendingSplits: [],
  selectedSplit: null,
  status: 'idle',
  error: null,
};

/**
 * Load split bills created by user
 */
export const loadCreatedSplitsThunk = createAsyncThunk(
  'split/loadCreated',
  async (creatorAddress: string) => {
    const splits = await getCreatedSplitBills(creatorAddress);
    return splits;
  }
);

/**
 * Load pending splits where user needs to pay
 */
export const loadPendingSplitsThunk = createAsyncThunk(
  'split/loadPending',
  async (address: string) => {
    const splits = await getPendingSplitBills(address);
    return splits;
  }
);

/**
 * Get a specific split bill
 */
export const getSplitBillThunk = createAsyncThunk(
  'split/get',
  async (id: string) => {
    const split = await getSplitBill(id);
    return split;
  }
);

/**
 * Create a new split bill
 */
export const createSplitBillThunk = createAsyncThunk(
  'split/create',
  async (request: CreateSplitBillRequest) => {
    const split = await createSplitBill(request);
    return split;
  }
);

/**
 * Cancel a split bill
 */
export const cancelSplitBillThunk = createAsyncThunk(
  'split/cancel',
  async (id: string) => {
    const split = await cancelSplitBill(id);
    return split;
  }
);

/**
 * Mark participant payment
 */
export const markPaidThunk = createAsyncThunk(
  'split/markPaid',
  async ({
    splitId,
    participantAddress,
    txHash,
  }: {
    splitId: string;
    participantAddress: string;
    txHash: string;
  }) => {
    const split = await markParticipantPaid(splitId, participantAddress, txHash);
    return split;
  }
);

const splitSlice = createSlice({
  name: 'split',
  initialState,
  reducers: {
    selectSplit: (state, action: PayloadAction<SplitBill | null>) => {
      state.selectedSplit = action.payload;
    },
    clearSelectedSplit: (state) => {
      state.selectedSplit = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load created splits
      .addCase(loadCreatedSplitsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCreatedSplitsThunk.fulfilled, (state, action) => {
        state.createdSplits = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadCreatedSplitsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load splits';
      })
      // Load pending splits
      .addCase(loadPendingSplitsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadPendingSplitsThunk.fulfilled, (state, action) => {
        state.pendingSplits = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadPendingSplitsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load pending splits';
      })
      // Get split
      .addCase(getSplitBillThunk.fulfilled, (state, action) => {
        state.selectedSplit = action.payload;
        state.status = 'succeeded';
      })
      // Create split
      .addCase(createSplitBillThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createSplitBillThunk.fulfilled, (state, action) => {
        state.createdSplits.unshift(action.payload);
        state.status = 'succeeded';
      })
      .addCase(createSplitBillThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create split';
      })
      // Cancel split
      .addCase(cancelSplitBillThunk.fulfilled, (state, action) => {
        const index = state.createdSplits.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.createdSplits[index] = action.payload;
        }
        if (state.selectedSplit?.id === action.payload.id) {
          state.selectedSplit = action.payload;
        }
        state.status = 'succeeded';
      })
      // Mark paid
      .addCase(markPaidThunk.fulfilled, (state, action) => {
        // Update in pending splits
        state.pendingSplits = state.pendingSplits.filter(
          (s) => s.id !== action.payload.id || action.payload.status !== 'completed'
        );
        // Update in created splits
        const index = state.createdSplits.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.createdSplits[index] = action.payload;
        }
        if (state.selectedSplit?.id === action.payload.id) {
          state.selectedSplit = action.payload;
        }
        state.status = 'succeeded';
      });
  },
});

export const { selectSplit, clearSelectedSplit, clearError } = splitSlice.actions;
export default splitSlice.reducer;
