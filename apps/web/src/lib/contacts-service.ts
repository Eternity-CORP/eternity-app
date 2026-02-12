/**
 * Contacts Service (Web)
 * Thin wrapper around shared contacts-service with localStorage adapter.
 */

import {
  type Contact,
  type StorageAdapter,
  saveContact as sharedSave,
  deleteContact as sharedDelete,
  searchContacts as sharedSearch,
  touchContact as sharedTouch,
} from '@e-y/shared'

export type { Contact }

const localStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value)
  },
}

export function loadContacts(accountAddress: string): Contact[] {
  if (!accountAddress) return []
  try {
    const data = localStorage.getItem(`e-y_contacts_${accountAddress.toLowerCase()}`)
    if (!data) return []
    const contacts: Contact[] = JSON.parse(data)
    return contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  } catch {
    return []
  }
}

export async function saveContact(
  accountAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>,
): Promise<Contact> {
  return sharedSave(localStorageAdapter, accountAddress, contact)
}

export async function deleteContact(accountAddress: string, id: string): Promise<boolean> {
  return sharedDelete(localStorageAdapter, accountAddress, id)
}

export async function searchContacts(accountAddress: string, query: string): Promise<Contact[]> {
  return sharedSearch(localStorageAdapter, accountAddress, query)
}

export async function touchContact(accountAddress: string, contactAddress: string): Promise<void> {
  return sharedTouch(localStorageAdapter, accountAddress, contactAddress)
}
