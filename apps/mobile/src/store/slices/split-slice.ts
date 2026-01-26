/**
 * Split Bill Redux Slice
 * Manages split bill state with privacy filtering
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  createSplitBill,
  getSplitBill,
  getCreatedSplitBills,
  getPendingSplitBills,
  cancelSplitBill,
  markParticipantPaid,
  syncSplitBills,
  type SplitBill,
  type CreateSplitBillRequest,
} from '@/src/services/split-bill-service';
import { loadContacts } from '@/src/services/contacts-service';
import type { RootState } from '@/src/store';
import type { SplitRequestsFrom } from './settings-slice';

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
 * Filter pending splits based on privacy settings
 */
async function filterPendingSplitsByPrivacy(
  splits: SplitBill[],
  address: string,
  privacySetting: SplitRequestsFrom
): Promise<SplitBill[]> {
  // 'anyone' - no filtering
  if (privacySetting === 'anyone') {
    return splits;
  }

  // 'none' - block all
  if (privacySetting === 'none') {
    return [];
  }

  // 'contacts' - only from contacts
  const contacts = await loadContacts(address);
  const contactAddresses = new Set(
    contacts.map((c) => c.address.toLowerCase())
  );

  return splits.filter((split) =>
    contactAddresses.has(split.creatorAddress.toLowerCase())
  );
}

/**
 * Load split bills for user (both created and pending)
 */
export const loadSplitBillsThunk = createAsyncThunk<
  { created: SplitBill[]; pending: SplitBill[] },
  string,
  { state: RootState }
>(
  'split/loadAll',
  async (address, { getState }) => {
    const state = getState();
    const privacySetting = state.settings.splitRequestsFrom;

    const [created, allPending] = await Promise.all([
      getCreatedSplitBills(address),
      getPendingSplitBills(address),
    ]);

    // Filter pending based on privacy settings
    const pending = await filterPendingSplitsByPrivacy(
      allPending,
      address,
      privacySetting
    );

    return { created, pending };
  }
);

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
export const loadPendingSplitsThunk = createAsyncThunk<
  SplitBill[],
  string,
  { state: RootState }
>(
  'split/loadPending',
  async (address, { getState }) => {
    const state = getState();
    const privacySetting = state.settings.splitRequestsFrom;

    const allSplits = await getPendingSplitBills(address);

    // Filter based on privacy settings
    return filterPendingSplitsByPrivacy(allSplits, address, privacySetting);
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
  async ({ id, walletAddress }: { id: string; walletAddress: string }) => {
    const split = await cancelSplitBill(id, walletAddress);
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

/**
 * Sync local cache with backend
 */
export const syncSplitBillsThunk = createAsyncThunk<
  { created: SplitBill[]; pending: SplitBill[] },
  string,
  { state: RootState }
>(
  'split/sync',
  async (address, { getState }) => {
    const state = getState();
    const privacySetting = state.settings.splitRequestsFrom;

    await syncSplitBills(address);
    const [created, allPending] = await Promise.all([
      getCreatedSplitBills(address),
      getPendingSplitBills(address),
    ]);

    // Filter pending based on privacy settings
    const pending = await filterPendingSplitsByPrivacy(
      allPending,
      address,
      privacySetting
    );

    return { created, pending };
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
      // Load all splits
      .addCase(loadSplitBillsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadSplitBillsThunk.fulfilled, (state, action) => {
        state.createdSplits = action.payload.created;
        state.pendingSplits = action.payload.pending;
        state.status = 'succeeded';
      })
      .addCase(loadSplitBillsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load splits';
      })
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
      })
      // Sync
      .addCase(syncSplitBillsThunk.fulfilled, (state, action) => {
        state.createdSplits = action.payload.created;
        state.pendingSplits = action.payload.pending;
        state.status = 'succeeded';
      });
  },
});

export const { selectSplit, clearSelectedSplit, clearError } = splitSlice.actions;
export default splitSlice.reducer;
