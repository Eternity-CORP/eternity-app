/**
 * Contacts Slice
 * Redux state management for contacts/address book
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  loadContacts,
  saveContact,
  updateContact,
  deleteContact,
  touchContact,
  type Contact,
} from '@/src/services/contacts-service';

interface ContactsState {
  contacts: Contact[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ContactsState = {
  contacts: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const loadContactsThunk = createAsyncThunk(
  'contacts/load',
  async () => {
    return await loadContacts();
  }
);

export const saveContactThunk = createAsyncThunk(
  'contacts/save',
  async (contact: { name: string; address: string; username?: string }) => {
    return await saveContact(contact);
  }
);

export const updateContactThunk = createAsyncThunk(
  'contacts/update',
  async ({ id, updates }: { id: string; updates: Partial<Pick<Contact, 'name' | 'username'>> }) => {
    return await updateContact(id, updates);
  }
);

export const deleteContactThunk = createAsyncThunk(
  'contacts/delete',
  async (id: string) => {
    await deleteContact(id);
    return id;
  }
);

export const touchContactThunk = createAsyncThunk(
  'contacts/touch',
  async (address: string, { dispatch }) => {
    await touchContact(address);
    // Reload contacts to update order
    dispatch(loadContactsThunk());
    return address;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearContactsError: (state) => {
      state.error = null;
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
        state.contacts = action.payload;
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
      });
  },
});

export const { clearContactsError } = contactsSlice.actions;
export default contactsSlice.reducer;
