/**
 * Bridge Slice
 * Manages state for bridge execution progress
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BridgeErrorCode } from '@/src/services/bridge-service';

export interface BridgeStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
}

interface BridgeState {
  status: 'idle' | 'processing' | 'success' | 'failed';
  steps: BridgeStep[];
  currentStepIndex: number;
  progress: number;

  approveTxHash: string | null;
  bridgeTxHashes: string[];
  finalTxHash: string | null;

  error: string | null;
  errorCode: BridgeErrorCode | null;
  retryCount: number;
  canRetry: boolean;
  canSendAlternative: boolean;

  startedAt: number | null;
  estimatedTimeSeconds: number;
}

const initialState: BridgeState = {
  status: 'idle',
  steps: [],
  currentStepIndex: 0,
  progress: 0,

  approveTxHash: null,
  bridgeTxHashes: [],
  finalTxHash: null,

  error: null,
  errorCode: null,
  retryCount: 0,
  canRetry: false,
  canSendAlternative: false,

  startedAt: null,
  estimatedTimeSeconds: 0,
};

const bridgeSlice = createSlice({
  name: 'bridge',
  initialState,
  reducers: {
    resetBridge: () => initialState,

    startBridge: (state, action: PayloadAction<{ steps: BridgeStep[]; estimatedTime: number }>) => {
      state.status = 'processing';
      state.steps = action.payload.steps;
      state.estimatedTimeSeconds = action.payload.estimatedTime;
      state.startedAt = Date.now();
      state.currentStepIndex = 0;
      state.progress = 0;
      state.error = null;
      state.errorCode = null;
      state.retryCount = 0;
      state.approveTxHash = null;
      state.bridgeTxHashes = [];
      state.finalTxHash = null;
    },

    updateStep: (state, action: PayloadAction<{ index: number; status: BridgeStep['status'] }>) => {
      const { index, status } = action.payload;
      if (state.steps[index]) {
        state.steps[index].status = status;
        if (status === 'active') {
          state.currentStepIndex = index;
        }
      }
    },

    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, action.payload));
    },

    setApproveTxHash: (state, action: PayloadAction<string>) => {
      state.approveTxHash = action.payload;
    },

    addBridgeTxHash: (state, action: PayloadAction<string>) => {
      state.bridgeTxHashes.push(action.payload);
    },

    setFinalTxHash: (state, action: PayloadAction<string>) => {
      state.finalTxHash = action.payload;
    },

    bridgeSuccess: (state) => {
      state.status = 'success';
      state.progress = 100;
      // Mark all steps as done
      state.steps = state.steps.map(step => ({ ...step, status: 'done' as const }));
    },

    bridgeError: (state, action: PayloadAction<{
      message: string;
      code: BridgeErrorCode;
      canRetry: boolean;
      canSendAlternative: boolean;
    }>) => {
      state.status = 'failed';
      state.error = action.payload.message;
      state.errorCode = action.payload.code;
      state.canRetry = action.payload.canRetry;
      state.canSendAlternative = action.payload.canSendAlternative;
      // Mark current step as failed
      if (state.steps[state.currentStepIndex]) {
        state.steps[state.currentStepIndex].status = 'failed';
      }
    },

    incrementRetry: (state) => {
      state.retryCount += 1;
      state.error = null;
      state.errorCode = null;
      state.status = 'processing';
      // Reset failed step to active
      if (state.steps[state.currentStepIndex]) {
        state.steps[state.currentStepIndex].status = 'active';
      }
    },
  },
});

export const {
  resetBridge,
  startBridge,
  updateStep,
  setProgress,
  setApproveTxHash,
  addBridgeTxHash,
  setFinalTxHash,
  bridgeSuccess,
  bridgeError,
  incrementRetry,
} = bridgeSlice.actions;

export default bridgeSlice.reducer;

// Selectors
export const selectBridgeStatus = (state: { bridge: BridgeState }) => state.bridge.status;
export const selectBridgeSteps = (state: { bridge: BridgeState }) => state.bridge.steps;
export const selectBridgeProgress = (state: { bridge: BridgeState }) => state.bridge.progress;
export const selectBridgeCurrentStepIndex = (state: { bridge: BridgeState }) => state.bridge.currentStepIndex;
export const selectBridgeError = (state: { bridge: BridgeState }) => ({
  message: state.bridge.error,
  code: state.bridge.errorCode,
  canRetry: state.bridge.canRetry,
  canSendAlternative: state.bridge.canSendAlternative,
});
export const selectBridgeTxHashes = (state: { bridge: BridgeState }) => ({
  approve: state.bridge.approveTxHash,
  bridge: state.bridge.bridgeTxHashes,
  final: state.bridge.finalTxHash,
});
export const selectBridgeEstimatedTime = (state: { bridge: BridgeState }) => state.bridge.estimatedTimeSeconds;
