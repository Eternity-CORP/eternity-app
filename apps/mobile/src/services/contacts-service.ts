/**
 * Contacts Service (Mobile)
 * Thin wrapper around shared contacts-service with SecureStore adapter.
 */

import Storage from '@/src/utils/storage';
import {
  type Contact,
  type StorageAdapter,
  loadContacts as sharedLoad,
  saveContact as sharedSave,
  deleteContact as sharedDelete,
  searchContacts as sharedSearch,
  touchContact as sharedTouch,
  findContactByAddress as sharedFindByAddress,
  updateContact as sharedUpdate,
} from '@e-y/shared';

export type { Contact };

const secureStoreAdapter: StorageAdapter = {
  getItem: (key: string) => Storage.getItem(key),
  setItem: (key: string, value: string) => Storage.setItem(key, value),
};

export async function loadContacts(accountAddress: string): Promise<Contact[]> {
  return sharedLoad(secureStoreAdapter, accountAddress);
}

export async function saveContact(
  accountAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>
): Promise<Contact> {
  return sharedSave(secureStoreAdapter, accountAddress, contact);
}

export async function touchContact(accountAddress: string, contactAddress: string): Promise<void> {
  return sharedTouch(secureStoreAdapter, accountAddress, contactAddress);
}

export async function updateContact(
  accountAddress: string,
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'username'>>
): Promise<Contact | null> {
  return sharedUpdate(secureStoreAdapter, accountAddress, id, updates);
}

export async function deleteContact(accountAddress: string, id: string): Promise<boolean> {
  return sharedDelete(secureStoreAdapter, accountAddress, id);
}

export async function findContactByAddress(
  accountAddress: string,
  contactAddress: string
): Promise<Contact | null> {
  return sharedFindByAddress(secureStoreAdapter, accountAddress, contactAddress);
}

export async function searchContacts(accountAddress: string, query: string): Promise<Contact[]> {
  return sharedSearch(secureStoreAdapter, accountAddress, query);
}

export async function clearContacts(accountAddress: string): Promise<void> {
  if (!accountAddress) return;
  await Storage.removeItem(`e-y_contacts_${accountAddress.toLowerCase()}`);
}

export async function clearAllContacts(): Promise<void> {
  await Storage.removeItem('e-y_contacts');
}
