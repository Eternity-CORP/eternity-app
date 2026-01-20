/**
 * Contacts Service
 * Local storage for frequent recipients
 * Each account has its own isolated contact book
 */

import Storage from '@/src/utils/storage';

const CONTACTS_STORAGE_PREFIX = 'e-y_contacts_';

/**
 * Get storage key for a specific account
 */
function getStorageKey(accountAddress: string): string {
  return `${CONTACTS_STORAGE_PREFIX}${accountAddress.toLowerCase()}`;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  username?: string; // @username if known
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Load all contacts from storage for a specific account
 */
export async function loadContacts(accountAddress: string): Promise<Contact[]> {
  if (!accountAddress) return [];

  try {
    const data = await Storage.getItem(getStorageKey(accountAddress));
    if (!data) return [];

    const contacts: Contact[] = JSON.parse(data);
    // Sort by last used (most recent first)
    return contacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  } catch (error) {
    console.warn('Error loading contacts:', error);
    return [];
  }
}

/**
 * Save a new contact for a specific account
 */
export async function saveContact(
  accountAddress: string,
  contact: Omit<Contact, 'id' | 'createdAt' | 'lastUsedAt'>
): Promise<Contact> {
  if (!accountAddress) throw new Error('Account address required');

  const contacts = await loadContacts(accountAddress);
  const storageKey = getStorageKey(accountAddress);

  // Check if contact with this address already exists
  const existingIndex = contacts.findIndex(
    c => c.address.toLowerCase() === contact.address.toLowerCase()
  );

  const now = Date.now();

  if (existingIndex >= 0) {
    // Update existing contact
    const updated: Contact = {
      ...contacts[existingIndex],
      name: contact.name,
      username: contact.username || contacts[existingIndex].username,
      lastUsedAt: now,
    };
    contacts[existingIndex] = updated;
    await Storage.setItem(storageKey, JSON.stringify(contacts));
    return updated;
  }

  // Create new contact
  const newContact: Contact = {
    id: `contact_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: contact.name,
    address: contact.address,
    username: contact.username,
    createdAt: now,
    lastUsedAt: now,
  };

  contacts.unshift(newContact);
  await Storage.setItem(storageKey, JSON.stringify(contacts));
  return newContact;
}

/**
 * Update contact's last used timestamp for a specific account
 */
export async function touchContact(accountAddress: string, contactAddress: string): Promise<void> {
  if (!accountAddress) return;

  const contacts = await loadContacts(accountAddress);
  const index = contacts.findIndex(
    c => c.address.toLowerCase() === contactAddress.toLowerCase()
  );

  if (index >= 0) {
    contacts[index].lastUsedAt = Date.now();
    await Storage.setItem(getStorageKey(accountAddress), JSON.stringify(contacts));
  }
}

/**
 * Update a contact for a specific account
 */
export async function updateContact(
  accountAddress: string,
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'username'>>
): Promise<Contact | null> {
  if (!accountAddress) return null;

  const contacts = await loadContacts(accountAddress);
  const index = contacts.findIndex(c => c.id === id);

  if (index < 0) return null;

  const updated: Contact = {
    ...contacts[index],
    ...updates,
    lastUsedAt: Date.now(),
  };

  contacts[index] = updated;
  await Storage.setItem(getStorageKey(accountAddress), JSON.stringify(contacts));
  return updated;
}

/**
 * Delete a contact for a specific account
 */
export async function deleteContact(accountAddress: string, id: string): Promise<boolean> {
  if (!accountAddress) return false;

  const contacts = await loadContacts(accountAddress);
  const filtered = contacts.filter(c => c.id !== id);

  if (filtered.length === contacts.length) return false;

  await Storage.setItem(getStorageKey(accountAddress), JSON.stringify(filtered));
  return true;
}

/**
 * Find contact by address for a specific account
 */
export async function findContactByAddress(
  accountAddress: string,
  contactAddress: string
): Promise<Contact | null> {
  if (!accountAddress) return null;

  const contacts = await loadContacts(accountAddress);
  return contacts.find(
    c => c.address.toLowerCase() === contactAddress.toLowerCase()
  ) || null;
}

/**
 * Search contacts by name or address for a specific account
 */
export async function searchContacts(accountAddress: string, query: string): Promise<Contact[]> {
  if (!accountAddress) return [];

  const contacts = await loadContacts(accountAddress);
  const lowerQuery = query.toLowerCase();

  return contacts.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.address.toLowerCase().includes(lowerQuery) ||
    (c.username && c.username.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Clear all contacts for a specific account (for debugging/reset)
 */
export async function clearContacts(accountAddress: string): Promise<void> {
  if (!accountAddress) return;
  await Storage.removeItem(getStorageKey(accountAddress));
}

/**
 * Clear all contacts globally (removes old global key too)
 */
export async function clearAllContacts(): Promise<void> {
  // Remove legacy global key
  await Storage.removeItem('e-y_contacts');
}
