/**
 * Business Wallet Redux Slice
 * Manages business wallet state (fetched from API)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getUserBusinesses,
  getBusiness,
  getBusinessActivity,
  createApiClient,
  type BusinessWallet,
  type BusinessActivity,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

interface BusinessState {
  businesses: BusinessWallet[];
  currentBusiness: BusinessWallet | null;
  activity: BusinessActivity[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: BusinessState = {
  businesses: [],
  currentBusiness: null,
  activity: [],
  status: 'idle',
  error: null,
};

/**
 * Fetch all businesses for a user address
 */
export const fetchUserBusinessesThunk = createAsyncThunk(
  'business/fetchUserBusinesses',
  async (address: string) => {
    return getUserBusinesses(apiClient, address);
  }
);

/**
 * Fetch a single business by contract address
 */
export const fetchBusinessThunk = createAsyncThunk(
  'business/fetchBusiness',
  async (contractAddress: string) => {
    return getBusiness(apiClient, contractAddress);
  }
);

/**
 * Fetch activity log for a business
 */
export const fetchBusinessActivityThunk = createAsyncThunk(
  'business/fetchActivity',
  async (businessId: string) => {
    return getBusinessActivity(apiClient, businessId);
  }
);

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    setCurrentBusiness: (state, action: PayloadAction<BusinessWallet | null>) => {
      state.currentBusiness = action.payload;
    },
    clearBusinessState: (state) => {
      state.businesses = [];
      state.currentBusiness = null;
      state.activity = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user businesses
      .addCase(fetchUserBusinessesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserBusinessesThunk.fulfilled, (state, action) => {
        state.businesses = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchUserBusinessesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch businesses';
      })
      // Fetch single business
      .addCase(fetchBusinessThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBusinessThunk.fulfilled, (state, action) => {
        state.currentBusiness = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchBusinessThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch business';
      })
      // Fetch activity
      .addCase(fetchBusinessActivityThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBusinessActivityThunk.fulfilled, (state, action) => {
        state.activity = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchBusinessActivityThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch activity';
      });
  },
});

export const { setCurrentBusiness, clearBusinessState } = businessSlice.actions;

// Selectors
type RootState = { business: BusinessState };

export const selectBusinesses = (state: RootState) => state.business.businesses;
export const selectCurrentBusiness = (state: RootState) => state.business.currentBusiness;
export const selectBusinessStatus = (state: RootState) => state.business.status;
export const selectBusinessActivity = (state: RootState) => state.business.activity;
export const selectBusinessError = (state: RootState) => state.business.error;

export default businessSlice.reducer;
