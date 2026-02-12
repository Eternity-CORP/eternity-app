/**
 * Contacts Slice
 * Redux state management for contacts/address book
 * Each account has its own isolated contact book
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  loadContacts,
  saveContact,
  updateContact,
  deleteContact,
  touchContact,
  clearAllContacts,
  type Contact,
} from '@/src/services/contacts-service';
import type { RootState } from '@/src/store';
import { getCurrentAccount } from './wallet-slice';

interface ContactsState {
  contacts: Contact[];
  currentAccountAddress: string | null; // Track which account contacts belong to
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ContactsState = {
  contacts: [],
  currentAccountAddress: null,
  status: 'idle',
  error: null,
};

// Helper to get current account address from state
const getAccountAddress = (state: RootState): string | null => {
  const account = getCurrentAccount(state.wallet);
  return account?.address || null;
};

// Async thunks
export const loadContactsThunk = createAsyncThunk(
  'contacts/load',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const accountAddress = getAccountAddress(state);
    if (!accountAddress) return { contacts: [], accountAddress: null };
    const contacts = await loadContacts(accountAddress);
    return { contacts, accountAddress };
  }
);

export const saveContactThunk = createAsyncThunk(
  'contacts/save',
  async (contact: { name: string; address: string; username?: string }, { getState }) => {
    const state = getState() as RootState;
    const accountAddress = getAccountAddress(state);
    if (!accountAddress) throw new Error('No wallet connected');
    return await saveContact(accountAddress, contact);
  }
);

export const updateContactThunk = createAsyncThunk(
  'contacts/update',
  async ({ id, updates }: { id: string; updates: Partial<Pick<Contact, 'name' | 'username'>> }, { getState }) => {
    const state = getState() as RootState;
    const accountAddress = getAccountAddress(state);
    if (!accountAddress) return null;
    return await updateContact(accountAddress, id, updates);
  }
);

export const deleteContactThunk = createAsyncThunk(
  'contacts/delete',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    const accountAddress = getAccountAddress(state);
    if (!accountAddress) throw new Error('No wallet connected');
    await deleteContact(accountAddress, id);
    return id;
  }
);

export const touchContactThunk = createAsyncThunk(
  'contacts/touch',
  async (contactAddress: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const accountAddress = getAccountAddress(state);
    if (!accountAddress) return contactAddress;
    await touchContact(accountAddress, contactAddress);
    // Reload contacts to update order
    dispatch(loadContactsThunk());
    return contactAddress;
  }
);

// Clear legacy global contacts data
export const clearLegacyContactsThunk = createAsyncThunk(
  'contacts/clearLegacy',
  async () => {
    await clearAllContacts();
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearContactsError: (state) => {
      state.error = null;
    },
    // Clear contacts when switching accounts
    resetContacts: (state) => {
      state.contacts = [];
      state.currentAccountAddress = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // Load contacts
      .addCase(loadContactsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadContactsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.contacts = action.payload.contacts;
        state.currentAccountAddress = action.payload.accountAddress;
        state.error = null;
      })
      .addCase(loadContactsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load contacts';
      })
      // Save contact
      .addCase(saveContactThunk.fulfilled, (state, action) => {
        // Check if contact exists (update case)
        const existingIndex = state.contacts.findIndex(c => c.id === action.payload.id);
        if (existingIndex >= 0) {
          state.contacts[existingIndex] = action.payload;
        } else {
          state.contacts.unshift(action.payload);
        }
        // Re-sort by last used
        state.contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
      })
      // Update contact
      .addCase(updateContactThunk.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.contacts.findIndex(c => c.id === action.payload!.id);
          if (index >= 0) {
            state.contacts[index] = action.payload;
          }
        }
      })
      // Delete contact
      .addCase(deleteContactThunk.fulfilled, (state, action) => {
        state.contacts = state.contacts.filter(c => c.id !== action.payload);
      })
      // Clear legacy contacts
      .addCase(clearLegacyContactsThunk.fulfilled, () => {
        // No state changes needed - legacy data cleared from storage
      });
  },
});

export const { clearContactsError, resetContacts } = contactsSlice.actions;
export default contactsSlice.reducer;
