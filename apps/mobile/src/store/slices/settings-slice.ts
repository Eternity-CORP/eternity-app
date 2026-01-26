/**
 * Settings Slice
 * User preferences and privacy settings
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveSplitPrivacySetting } from '@/src/services/split-bill-service';

const SETTINGS_STORAGE_KEY = '@ey_settings';

export type SplitRequestsFrom = 'anyone' | 'contacts' | 'none';

interface SettingsState {
  splitRequestsFrom: SplitRequestsFrom;
  loaded: boolean;
}

const initialState: SettingsState = {
  splitRequestsFrom: 'contacts',
  loaded: false,
};

// Load settings from storage
export const loadSettingsThunk = createAsyncThunk(
  'settings/load',
  async () => {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<SettingsState>;
    }
    return {};
  }
);

interface SaveSettingsParams {
  settings: Partial<SettingsState>;
  walletAddress?: string;
}

// Save settings to storage and sync to server
export const saveSettingsThunk = createAsyncThunk(
  'settings/save',
  async ({ settings, walletAddress }: SaveSettingsParams) => {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Sync split privacy setting to server
    if (settings.splitRequestsFrom && walletAddress) {
      await saveSplitPrivacySetting(walletAddress, settings.splitRequestsFrom);
    }

    return updated;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSplitRequestsFrom: (state, action: PayloadAction<SplitRequestsFrom>) => {
      state.splitRequestsFrom = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettingsThunk.fulfilled, (state, action) => {
        if (action.payload.splitRequestsFrom) {
          state.splitRequestsFrom = action.payload.splitRequestsFrom;
        }
        state.loaded = true;
      })
      .addCase(saveSettingsThunk.fulfilled, (state, action) => {
        if (action.payload.splitRequestsFrom) {
          state.splitRequestsFrom = action.payload.splitRequestsFrom;
        }
      });
  },
});

export const { setSplitRequestsFrom } = settingsSlice.actions;
export default settingsSlice.reducer;
