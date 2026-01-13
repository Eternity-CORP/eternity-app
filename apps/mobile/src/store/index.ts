/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/wallet-slice';
import balanceReducer from './slices/balance-slice';
import transactionReducer from './slices/transaction-slice';
import sendReducer from './slices/send-slice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    balance: balanceReducer,
    transaction: transactionReducer,
    send: sendReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
