/**
 * Scheduled Payment Create Slice
 * Multi-step wizard state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RecurringInterval } from '@/src/services/scheduled-payment-service';

export type ScheduledCreateStep = 'recipient' | 'token' | 'amount' | 'schedule' | 'confirm';

interface ScheduledCreateState {
  step: ScheduledCreateStep;
  recipient: string;
  recipientUsername: string | null;
  recipientName: string | null;
  selectedToken: string;
  amount: string;
  scheduledDate: string; // ISO string
  isRecurring: boolean;
  recurringInterval: RecurringInterval;
  description: string;
}

const initialState: ScheduledCreateState = {
  step: 'recipient',
  recipient: '',
  recipientUsername: null,
  recipientName: null,
  selectedToken: 'ETH',
  amount: '',
  scheduledDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  isRecurring: false,
  recurringInterval: 'monthly',
  description: '',
};

const scheduledCreateSlice = createSlice({
  name: 'scheduledCreate',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<ScheduledCreateStep>) => {
      state.step = action.payload;
    },
    setRecipient: (state, action: PayloadAction<{
      address: string;
      username?: string | null;
      name?: string | null;
    }>) => {
      state.recipient = action.payload.address;
      state.recipientUsername = action.payload.username || null;
      state.recipientName = action.payload.name || null;
    },
    setSelectedToken: (state, action: PayloadAction<string>) => {
      state.selectedToken = action.payload;
    },
    setAmount: (state, action: PayloadAction<string>) => {
      state.amount = action.payload;
    },
    setSchedule: (state, action: PayloadAction<{
      scheduledDate: string;
      isRecurring: boolean;
      recurringInterval: RecurringInterval;
      description: string;
    }>) => {
      state.scheduledDate = action.payload.scheduledDate;
      state.isRecurring = action.payload.isRecurring;
      state.recurringInterval = action.payload.recurringInterval;
      state.description = action.payload.description;
    },
    resetScheduledCreate: () => initialState,
  },
});

export const {
  setStep,
  setRecipient,
  setSelectedToken,
  setAmount,
  setSchedule,
  resetScheduledCreate,
} = scheduledCreateSlice.actions;

export default scheduledCreateSlice.reducer;
