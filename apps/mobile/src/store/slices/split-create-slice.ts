/**
 * Split Bill Create Slice
 * Multi-step wizard state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SplitCreateStep = 'token' | 'amount' | 'mode' | 'participants' | 'delivery' | 'confirm';
export type SplitMode = 'equal' | 'custom' | 'percentage';

export interface SplitParticipant {
  id: string;
  address: string;
  username?: string;
  name?: string;
  amount: string;
  percentage?: number;
}

interface SplitCreateState {
  step: SplitCreateStep;
  selectedToken: string;
  totalAmount: string;
  splitMode: SplitMode;
  participants: SplitParticipant[];
  deliveryAddress: string;
  deliveryUsername: string | null;
  useCustomDelivery: boolean;
  description: string;
}

const initialState: SplitCreateState = {
  step: 'token',
  selectedToken: 'ETH',
  totalAmount: '',
  splitMode: 'equal',
  participants: [],
  deliveryAddress: '',
  deliveryUsername: null,
  useCustomDelivery: false,
  description: '',
};

const splitCreateSlice = createSlice({
  name: 'splitCreate',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<SplitCreateStep>) => {
      state.step = action.payload;
    },
    setSelectedToken: (state, action: PayloadAction<string>) => {
      state.selectedToken = action.payload;
    },
    setTotalAmount: (state, action: PayloadAction<string>) => {
      state.totalAmount = action.payload;
    },
    setSplitMode: (state, action: PayloadAction<SplitMode>) => {
      state.splitMode = action.payload;
    },
    setParticipants: (state, action: PayloadAction<SplitParticipant[]>) => {
      state.participants = action.payload;
    },
    addParticipant: (state, action: PayloadAction<SplitParticipant>) => {
      state.participants.push(action.payload);
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    updateParticipant: (state, action: PayloadAction<{ id: string; updates: Partial<SplitParticipant> }>) => {
      const participant = state.participants.find(p => p.id === action.payload.id);
      if (participant) {
        Object.assign(participant, action.payload.updates);
      }
    },
    setDelivery: (state, action: PayloadAction<{
      address: string;
      username?: string | null;
      useCustom: boolean;
    }>) => {
      state.deliveryAddress = action.payload.address;
      state.deliveryUsername = action.payload.username || null;
      state.useCustomDelivery = action.payload.useCustom;
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    resetSplitCreate: () => initialState,
  },
});

export const {
  setStep,
  setSelectedToken,
  setTotalAmount,
  setSplitMode,
  setParticipants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  setDelivery,
  setDescription,
  resetSplitCreate,
} = splitCreateSlice.actions;

export default splitCreateSlice.reducer;
