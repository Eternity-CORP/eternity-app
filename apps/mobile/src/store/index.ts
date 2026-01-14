/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/wallet-slice';
import balanceReducer from './slices/balance-slice';
import transactionReducer from './slices/transaction-slice';
import sendReducer from './slices/send-slice';
import blikReducer from './slices/blik-slice';
import contactsReducer from './slices/contacts-slice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    balance: balanceReducer,
    transaction: transactionReducer,
    send: sendReducer,
    blik: blikReducer,
    contacts: contactsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
