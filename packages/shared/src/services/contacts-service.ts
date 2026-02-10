/**
 * Contacts Service (Shared)
 * Pure business logic for contact book management.
 * Uses dependency injection for storage — no platform deps.
 */

import type { AiContact } from '../types/ai';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const CONTACTS_STORAGE_PREFIX = 'e-y_contacts_';

function getStorageKey(accountAddress: string): string {
  return `${CONTACTS_STORAGE_PREFIX}${accountAddress.toLowerCase()}`;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  username?: string;
  createdAt: number;
  lastUsedAt: number;
}

export async function loadContacts(
  storage: StorageAdapter,
  accountAddress: string,
): Promise<Contact[]> {
  if (!accountAddress) return [];
  try {
    const data = await storage.getItem(getStorageKey(accountAddress));
    if (!data) return [];
    const contacts: Contact[] = JSON.parse(data);
    return contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch {
    return [];
  }
}

export async function saveContact(
  storage: StorageAdapter,
  accountAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>,
): Promise<Contact> {
  const contacts = await loadContacts(storage, accountAddress);
  const key = getStorageKey(accountAddress);
  const now = Date.now();

  const existingIndex = contacts.findIndex(
    (c) => c.address.toLowerCase() === contact.address.toLowerCase(),
  );

  if (existingIndex >= 0) {
    const updated: Contact = {
      ...contacts[existingIndex],
      name: contact.name,
      username: contact.username || contacts[existingIndex].username,
      lastUsedAt: now,
    };
    contacts[existingIndex] = updated;
    await storage.setItem(key, JSON.stringify(contacts));
    return updated;
  }

  const newContact: Contact = {
    id: `contact_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: contact.name,
    address: contact.address,
    username: contact.username,
    createdAt: now,
    lastUsedAt: now,
  };

  contacts.unshift(newContact);
  await storage.setItem(key, JSON.stringify(contacts));
  return newContact;
}

export async function deleteContact(
  storage: StorageAdapter,
  accountAddress: string,
  id: string,
): Promise<boolean> {
  if (!accountAddress) return false;
  const contacts = await loadContacts(storage, accountAddress);
  const filtered = contacts.filter((c) => c.id !== id);
  if (filtered.length === contacts.length) return false;
  await storage.setItem(getStorageKey(accountAddress), JSON.stringify(filtered));
  return true;
}

export async function searchContacts(
  storage: StorageAdapter,
  accountAddress: string,
  query: string,
): Promise<Contact[]> {
  if (!accountAddress) return [];
  const contacts = await loadContacts(storage, accountAddress);
  const lowerQuery = query.toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.address.toLowerCase().includes(lowerQuery) ||
      (c.username && c.username.toLowerCase().includes(lowerQuery)),
  );
}

export async function touchContact(
  storage: StorageAdapter,
  accountAddress: string,
  contactAddress: string,
): Promise<void> {
  if (!accountAddress) return;
  const contacts = await loadContacts(storage, accountAddress);
  const index = contacts.findIndex(
    (c) => c.address.toLowerCase() === contactAddress.toLowerCase(),
  );
  if (index >= 0) {
    contacts[index].lastUsedAt = Date.now();
    await storage.setItem(getStorageKey(accountAddress), JSON.stringify(contacts));
  }
}

export async function findContactByAddress(
  storage: StorageAdapter,
  accountAddress: string,
  contactAddress: string,
): Promise<Contact | null> {
  if (!accountAddress) return null;
  const contacts = await loadContacts(storage, accountAddress);
  return (
    contacts.find(
      (c) => c.address.toLowerCase() === contactAddress.toLowerCase(),
    ) || null
  );
}

export async function updateContact(
  storage: StorageAdapter,
  accountAddress: string,
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'username'>>,
): Promise<Contact | null> {
  if (!accountAddress) return null;
  const contacts = await loadContacts(storage, accountAddress);
  const index = contacts.findIndex((c) => c.id === id);
  if (index < 0) return null;

  const updated: Contact = {
    ...contacts[index],
    ...updates,
    lastUsedAt: Date.now(),
  };

  contacts[index] = updated;
  await storage.setItem(getStorageKey(accountAddress), JSON.stringify(contacts));
  return updated;
}

/** Convert contacts to lightweight format for AI context */
export function contactsToAiFormat(contacts: Contact[]): AiContact[] {
  return contacts.map((c) => ({
    name: c.name,
    address: c.address,
    username: c.username,
  }));
}
