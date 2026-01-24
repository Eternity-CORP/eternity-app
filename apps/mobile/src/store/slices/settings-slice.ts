/**
 * Settings Slice
 * User preferences and privacy settings
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@ey_settings';

export type SplitRequestsFrom = 'anyone' | 'contacts' | 'none';

interface SettingsState {
  splitRequestsFrom: SplitRequestsFrom;
  loaded: boolean;
}

const initialState: SettingsState = {
  splitRequestsFrom: 'anyone',
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

// Save settings to storage
export const saveSettingsThunk = createAsyncThunk(
  'settings/save',
  async (settings: Partial<SettingsState>) => {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
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
